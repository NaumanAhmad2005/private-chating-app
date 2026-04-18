import { ClientEvents, ServerEvents } from './events.js';
import { store } from '../store/inMemoryStore.js';
import { generateUsername, generateAvatarSeed } from '../utils/usernameGenerator.js';

// Rate limiting: track messages per user
const rateLimitWindow = 60000; // 1 minute
const maxMessagesPerWindow = 10;
const userMessageCounts = new Map(); // Map<socketId, { count, resetTime }>

function checkRateLimit(socketId) {
  const now = Date.now();
  let userStats = userMessageCounts.get(socketId);

  if (!userStats || now > userStats.resetTime) {
    userStats = { count: 0, resetTime: now + rateLimitWindow };
    userMessageCounts.set(socketId, userStats);
  }

  userStats.count++;
  return userStats.count <= maxMessagesPerWindow;
}

function sanitizeInput(text) {
  if (typeof text !== 'string') return '';
  // Remove HTML tags and escape special characters
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .slice(0, 500); // Max 500 characters
}

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // Handle user joining
    socket.on(ClientEvents.JOIN, (data, callback) => {
      try {
        const username = data?.username || generateUsername();
        const avatarSeed = data?.avatarSeed || generateAvatarSeed();
        const avatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${avatarSeed}`;

        // Store user
        store.addUser(socket.id, { username, avatar, avatarSeed });

        // Send user their info
        const user = store.getUser(socket.id);

        // Recover any existing DMs for this username
        const recoveredDMs = store.getUserDMs(username);
        const recoveredDMData = [];

        if (recoveredDMs.length > 0) {
          console.log(`[Socket] Recovering ${recoveredDMs.length} DMs for ${username}`);

          for (const dm of recoveredDMs) {
            const otherParticipant = dm.participants.find(p => p !== username);
            const otherSocketId = store.getSocketIdForUsername(otherParticipant);
            const otherUser = otherSocketId ? store.getUser(otherSocketId) : null;

            // Get the current online status of the other participant
            const otherOnline = !!otherSocketId && !!otherUser;

            recoveredDMData.push({
              roomId: dm.roomId,
              targetUser: otherUser || {
                username: otherParticipant,
                avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${otherParticipant}`,
                isOnline: otherOnline
              },
              messages: dm.messages,
            });

            // If other user is online, notify them that this user is back
            if (otherSocketId) {
              io.to(otherSocketId).emit('dm:partner:rejoined', {
                roomId: dm.roomId,
                partnerName: username,
                partnerSocketId: socket.id,
              });
            }
          }
        }

        if (callback) callback({ success: true, user, recoveredDMs: recoveredDMData });

        // Broadcast to others
        socket.broadcast.emit(ServerEvents.USER_JOINED, { user });

        // Send updated users list to everyone
        io.emit(ServerEvents.USERS_LIST, { users: store.getAllUsers() });

        // Send recent messages to new user
        socket.emit(ServerEvents.MESSAGE_NEW, { messages: store.getMessages() });

        console.log(`[Socket] User joined: ${username} (${socket.id})`);
      } catch (error) {
        console.error('[Socket] Error on user:join', error);
        if (callback) callback({ success: false, error: 'Failed to join' });
      }
    });

    // Handle user leaving
    socket.on(ClientEvents.LEAVE, () => {
      handleUserLeave(socket, io);
    });

    // Handle global message
    socket.on(ClientEvents.MESSAGE_SEND, (data, callback) => {
      try {
        // Rate limit check
        if (!checkRateLimit(socket.id)) {
          if (callback) callback({ success: false, error: 'Rate limit exceeded' });
          return;
        }

        const user = store.getUser(socket.id);
        if (!user) {
          if (callback) callback({ success: false, error: 'User not found' });
          return;
        }

        const text = sanitizeInput(data?.text);
        if (!text) {
          if (callback) callback({ success: false, error: 'Empty message' });
          return;
        }

        const message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: socket.id,
          username: user.username,
          avatar: user.avatar,
          text,
          timestamp: Date.now(),
        };

        store.addMessage(message);
        io.emit(ServerEvents.MESSAGE_NEW, { message });

        if (callback) callback({ success: true });
      } catch (error) {
        console.error('[Socket] Error on message:send', error);
        if (callback) callback({ success: false, error: 'Failed to send message' });
      }
    });

    // Handle DM create
    socket.on(ClientEvents.DM_CREATE, (data, callback) => {
      try {
        const targetUserId = data?.targetUserId;
        if (!targetUserId) {
          if (callback) callback({ success: false, error: 'Invalid target user' });
          return;
        }

        const sender = store.getUser(socket.id);
        const target = store.getUser(targetUserId);

        if (!sender || !target) {
          if (callback) callback({ success: false, error: 'User not found' });
          return;
        }

        // Create DM using usernames (persistent across reconnects)
        const dm = store.createDM(sender.username, target.username);

        // Notify target user if they're online
        const targetSocketId = store.getSocketIdForUsername(target.username);
        if (targetSocketId) {
          io.to(targetSocketId).emit(ServerEvents.DM_CREATED, {
            roomId: dm.roomId,
            targetUser: {
              socketId: socket.id,
              username: sender.username,
              avatar: sender.avatar,
            },
            messages: dm.messages,
          });
        }

        if (callback) callback({ success: true, roomId: dm.roomId, targetUser: target, messages: dm.messages });
      } catch (error) {
        console.error('[Socket] Error on dm:create', error);
        if (callback) callback({ success: false, error: 'Failed to create DM' });
      }
    });

    // Handle DM send
    socket.on(ClientEvents.DM_SEND, (data, callback) => {
      try {
        const { roomId, text } = data || {};
        if (!roomId || !text) {
          if (callback) callback({ success: false, error: 'Invalid data' });
          return;
        }

        const dm = store.getDM(roomId);
        if (!dm) {
          if (callback) callback({ success: false, error: 'DM not found' });
          return;
        }

        const user = store.getUser(socket.id);
        if (!user) {
          if (callback) callback({ success: false, error: 'User not found' });
          return;
        }

        // Check if user is a participant in this DM
        if (!dm.participants.includes(user.username)) {
          if (callback) callback({ success: false, error: 'Not a participant in this DM' });
          return;
        }

        const sanitizedText = sanitizeInput(text);
        if (!sanitizedText) {
          if (callback) callback({ success: false, error: 'Empty message' });
          return;
        }

        const message = {
          id: `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: socket.id,
          username: user.username,
          text: sanitizedText,
          timestamp: Date.now(),
        };

        store.addDMMessage(roomId, message);

        // Send to all online participants
        dm.participants.forEach(username => {
          const participantSocketId = store.getSocketIdForUsername(username);
          if (participantSocketId) {
            io.to(participantSocketId).emit(ServerEvents.DM_RECEIVED, {
              roomId,
              message,
              isOwn: username === user.username,
            });
          }
        });

        if (callback) callback({ success: true });
      } catch (error) {
        console.error('[Socket] Error on dm:send', error);
        if (callback) callback({ success: false, error: 'Failed to send DM' });
      }
    });

    // Handle DM close (only closes when explicitly requested)
    socket.on(ClientEvents.DM_CLOSE, (data, callback) => {
      try {
        const { roomId } = data || {};
        if (!roomId) {
          if (callback) callback({ success: false, error: 'Invalid room' });
          return;
        }

        const dm = store.getDM(roomId);
        if (!dm) {
          if (callback) callback({ success: false, error: 'DM not found' });
          return;
        }

        const user = store.getUser(socket.id);
        if (!user || !dm.participants.includes(user.username)) {
          if (callback) callback({ success: false, error: 'Not authorized' });
          return;
        }

        // Close the DM completely
        store.closeDM(roomId);

        // Notify other participant if online
        const otherParticipant = dm.participants.find(p => p !== user.username);
        if (otherParticipant) {
          const otherSocketId = store.getSocketIdForUsername(otherParticipant);
          if (otherSocketId) {
            io.to(otherSocketId).emit(ServerEvents.DM_CLOSED, { roomId });
          }
        }

        socket.emit(ServerEvents.DM_CLOSED, { roomId });

        if (callback) callback({ success: true });
      } catch (error) {
        console.error('[Socket] Error on dm:close', error);
        if (callback) callback({ success: false, error: 'Failed to close DM' });
      }
    });

    // Handle typing start
    socket.on(ClientEvents.TYPING_START, (data) => {
      const { roomId } = data || {};
      const user = store.getUser(socket.id);
      if (!user) return;

      if (roomId) {
        // DM typing
        const dm = store.getDM(roomId);
        if (dm && dm.participants.includes(user.username)) {
          dm.participants.forEach(username => {
            if (username !== user.username) {
              const participantSocketId = store.getSocketIdForUsername(username);
              if (participantSocketId) {
                io.to(participantSocketId).emit(ServerEvents.TYPING_UPDATE, {
                  userId: socket.id,
                  username: user.username,
                  roomId,
                  isTyping: true,
                });
              }
            }
          });
        }
      } else {
        // Global chat typing (optional)
        socket.broadcast.emit(ServerEvents.TYPING_UPDATE, {
          userId: socket.id,
          username: user.username,
          isTyping: true,
        });
      }
    });

    // Handle typing stop
    socket.on(ClientEvents.TYPING_STOP, (data) => {
      const { roomId } = data || {};
      const user = store.getUser(socket.id);
      if (!user) return;

      if (roomId) {
        const dm = store.getDM(roomId);
        if (dm && dm.participants.includes(user.username)) {
          dm.participants.forEach(username => {
            if (username !== user.username) {
              const participantSocketId = store.getSocketIdForUsername(username);
              if (participantSocketId) {
                io.to(participantSocketId).emit(ServerEvents.TYPING_UPDATE, {
                  userId: socket.id,
                  username: user.username,
                  roomId,
                  isTyping: false,
                });
              }
            }
          });
        }
      } else {
        socket.broadcast.emit(ServerEvents.TYPING_UPDATE, {
          userId: socket.id,
          username: user.username,
          isTyping: false,
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
      handleUserLeave(socket, io);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[Socket] Error for ${socket.id}:`, error);
    });
  });

  // Start cleanup interval
  store.startCleanup();
}

function handleUserLeave(socket, io) {
  const result = store.cleanupUser(socket.id);

  if (result) {
    const { user, closedDMs, activeDMs } = result;

    // Broadcast user left
    socket.broadcast.emit(ServerEvents.USER_LEFT, {
      socketId: socket.id,
      username: user.username,
    });

    // Notify DM participants about closed DMs (both users disconnected)
    if (closedDMs && closedDMs.length > 0) {
      closedDMs.forEach(dm => {
        const otherSocketId = store.getSocketIdForUsername(dm.otherParticipant);
        if (otherSocketId) {
          io.to(otherSocketId).emit(ServerEvents.DM_CLOSED, { roomId: dm.roomId });
        }
      });
    }

    // For active DMs (other user still online), send a special event to notify
    // the remaining user that their partner temporarily disconnected
    if (activeDMs && activeDMs.length > 0) {
      activeDMs.forEach(({ roomId, otherParticipant }) => {
        const otherSocketId = store.getSocketIdForUsername(otherParticipant);
        if (otherSocketId) {
          io.to(otherSocketId).emit('dm:partner:left', {
            roomId,
            partnerName: user.username,
          });
        }
      });
    }

    // Send updated users list
    socket.broadcast.emit(ServerEvents.USERS_LIST, { users: store.getAllUsers() });

    console.log(`[Socket] User ${user.username} disconnected. Closed DMs: ${closedDMs?.length || 0}, Active DMs: ${activeDMs?.length || 0}`);
  }
}
