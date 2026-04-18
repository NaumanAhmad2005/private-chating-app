import React, { useEffect, useRef, useState } from 'react';
import { ChatProvider, useChat } from './context/ChatContext';
import { useSocket } from './hooks/useSocket';
import { RulesModal } from './components/RulesModal';
import { UsersSidebar } from './components/UsersSidebar';
import { ChatPanel } from './components/ChatPanel';
import { MessageInput } from './components/MessageInput';
import { DMModal } from './components/DMModal';
import { generateUsername, generateAvatarSeed } from './utils/usernameGenerator';
import { ClientEvents, ServerEvents } from './events';

// Socket event constants (client-side)
const ClientEventsLocal = {
  JOIN: 'user:join',
  LEAVE: 'user:leave',
  MESSAGE_SEND: 'message:send',
  DM_CREATE: 'dm:create',
  DM_SEND: 'dm:send',
  DM_CLOSE: 'dm:close',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
};

const ServerEventsLocal = {
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  USERS_LIST: 'users:list',
  MESSAGE_NEW: 'message:new',
  DM_CREATED: 'dm:created',
  DM_RECEIVED: 'dm:received',
  DM_CLOSED: 'dm:closed',
  DM_PARTNER_LEFT: 'dm:partner:left',
  DM_PARTNER_REJOINED: 'dm:partner:rejoined',
  TYPING_UPDATE: 'typing:update',
  ERROR: 'error',
};

function ChatApp() {
  const {
    user,
    setUser,
    hasAcceptedRules,
    acceptRules,
    users,
    addUser,
    removeUser,
    updateUsers,
    messages,
    addGlobalMessage,
    setInitialMessages,
    activeDM,
    openDM,
    closeDM,
    addDMMessage,
    getDMMessages,
    typingUsers,
    setTypingUser,
    removeTypingUser,
    activeChats,
    setActiveChats,
    addOrUpdateChat,
    updateActiveChat,
    removeChat,
    setDmMessages,
  } = useChat();

  const [showDM, setShowDM] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({}); // Map<roomId, count>
  const [globalReplyTo, setGlobalReplyTo] = useState(null); // Message being replied to in global chat
  const typingTimeoutRef = useRef(null);
  const activeChatsRef = useRef(activeChats);
  const activeDMRef = useRef(activeDM);

  // Keep refs in sync
  useEffect(() => {
    activeChatsRef.current = activeChats;
  }, [activeChats]);

  useEffect(() => {
    activeDMRef.current = activeDM;
  }, [activeDM]);

  // Socket event handlers - memoized to avoid stale closures
  const handlers = React.useMemo(() => ({
    // User joined
    [ServerEventsLocal.USER_JOINED]: ({ user: joinedUser }) => {
      console.log('[App] User joined:', joinedUser.username);
      addUser(joinedUser);
    },

    // User left
    [ServerEventsLocal.USER_LEFT]: ({ socketId, username }) => {
      console.log('[App] User left:', username);
      removeUser(socketId);
      // Clear typing indicator
      removeTypingUser(socketId);
      // Note: DMs are NOT closed when a user disconnects - they persist
      // The chat list will show the user as offline
    },

    // Users list update
    [ServerEventsLocal.USERS_LIST]: ({ users: usersList }) => {
      updateUsers(usersList);
    },

    // New global message
    [ServerEventsLocal.MESSAGE_NEW]: ({ message, messages: initialMessages }) => {
      if (message) {
        addGlobalMessage(message);
      } else if (initialMessages) {
        setInitialMessages(initialMessages);
      }
    },

    // DM created
    [ServerEventsLocal.DM_CREATED]: ({ roomId, targetUser, messages }) => {
      console.log('[App] DM created with:', targetUser.username);
      openDM(roomId, targetUser);
      // Restore messages if provided (for recovered DMs)
      if (messages && messages.length > 0) {
        setDmMessages(prev => ({
          ...prev,
          [roomId]: messages,
        }));
      }
      setShowDM(true);
      // Clear any unread count for this chat since we're opening it
      setUnreadCounts(prev => {
        const copy = { ...prev };
        delete copy[roomId];
        return copy;
      });
    },

    // DM partner temporarily disconnected (but chat persists)
    [ServerEventsLocal.DM_PARTNER_LEFT]: ({ roomId, partnerName }) => {
      console.log('[App] DM partner left temporarily:', partnerName);
      // Update the chat to show partner as offline
      setActiveChats(prev => prev.map(chat =>
        chat.roomId === roomId
          ? { ...chat, targetUser: { ...chat.targetUser, isOnline: false } }
          : chat
      ));
    },

    // DM partner rejoined
    [ServerEventsLocal.DM_PARTNER_REJOINED]: ({ roomId, partnerName, partnerSocketId }) => {
      console.log('[App] DM partner rejoined:', partnerName);
      // Update the chat to show partner as online with new socket ID
      setActiveChats(prev => prev.map(chat =>
        chat.roomId === roomId
          ? { ...chat, targetUser: { ...chat.targetUser, isOnline: true, socketId: partnerSocketId } }
          : chat
      ));
    },

    // DM received
    [ServerEventsLocal.DM_RECEIVED]: ({ roomId, message, isOwn }) => {
      addDMMessage(roomId, message);

      // Use refs for current values
      const currentActiveDM = activeDMRef.current;
      const currentActiveChats = activeChatsRef.current;

      // If DM is not open and this is not my own message, mark as unread and notify
      if ((!currentActiveDM || currentActiveDM.roomId !== roomId) && !isOwn) {
        console.log('[App] DM received in closed chat:', roomId);

        // Increment unread count
        setUnreadCounts(prev => ({
          ...prev,
          [roomId]: (prev[roomId] || 0) + 1,
        }));

        // Add to active chats if not already present (for first-time DMs)
        setActiveChats(prev => {
          if (prev.find(c => c.roomId === roomId)) return prev;
          // Extract target user from message - we'll get full info when chat is opened
          return [...prev, {
            roomId,
            targetUser: {
              username: message.username,
              avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${message.username}`,
              isOnline: true,
            },
            lastMessage: message,
            timestamp: message.timestamp,
          }];
        });

        // Browser notification (if permission granted)
        if (Notification.permission === 'granted') {
          const chat = currentActiveChats.find(c => c.roomId === roomId);
          const senderName = chat?.targetUser?.username || message.username || 'Someone';

          new Notification('New Private Message', {
            body: `${senderName}: ${message.text.slice(0, 50)}${message.text.length > 50 ? '...' : ''}`,
            icon: '/vite.svg',
            tag: roomId, // Replace existing notification for same chat
          });
        }
      }
    },

    // DM closed
    [ServerEventsLocal.DM_CLOSED]: ({ roomId }) => {
      console.log('[App] DM closed:', roomId);
      closeDM(roomId);
      if (activeDMRef.current?.roomId === roomId) {
        setShowDM(false);
      }
    },

    // Typing update
    [ServerEventsLocal.TYPING_UPDATE]: ({ userId, username, roomId, isTyping }) => {
      if (isTyping) {
        setTypingUser(userId, { username, roomId, isTyping: true });
      } else {
        removeTypingUser(userId);
      }
    },

    // Error
    [ServerEventsLocal.ERROR]: ({ error }) => {
      console.error('[App] Server error:', error);
    },
  }), [
    addUser,
    removeUser,
    removeTypingUser,
    updateUsers,
    addGlobalMessage,
    setInitialMessages,
    openDM,
    setDmMessages,
    setActiveChats,
    closeDM,
    setTypingUser,
    addDMMessage,
  ]);

  const { socket, emit, connected, connectionError } = useSocket(handlers);

  // Check for rules acceptance on mount
  useEffect(() => {
    const accepted = localStorage.getItem('chat_rules_accepted');
    if (accepted === 'true') {
      acceptRules();
    }
  }, [acceptRules]);

  // Join chat after accepting rules
  useEffect(() => {
    if (hasAcceptedRules && !user && connected) {
      // Always generate a fresh anonymous username for privacy
      const username = generateUsername();
      const avatarSeed = generateAvatarSeed();

      emit(ClientEventsLocal.JOIN, { username, avatarSeed }, (response) => {
        if (response?.success && response.user) {
          // Use the server-assigned username (server enforces uniqueness)
          setUser({ ...response.user, socketId: socket.id });
          console.log('[App] Joined as:', response.user.username);

          // Restore recovered DMs if any
          if (response.recoveredDMs && response.recoveredDMs.length > 0) {
            console.log('[App] Restoring', response.recoveredDMs.length, 'DMs');
            response.recoveredDMs.forEach(dm => {
              // Restore messages
              setDmMessages(prev => ({
                ...prev,
                [dm.roomId]: dm.messages || [],
              }));
              // Add to active chats - this makes them appear in the sidebar Messages tab
              setActiveChats(prev => {
                if (prev.find(c => c.roomId === dm.roomId)) return prev;
                return [...prev, {
                  roomId: dm.roomId,
                  targetUser: dm.targetUser,
                  lastMessage: dm.messages?.[dm.messages.length - 1] || null,
                  timestamp: dm.messages?.[dm.messages.length - 1]?.timestamp || Date.now(),
                }];
              });
            });
          }
        }
      });
    }
  }, [hasAcceptedRules, user, connected, emit, setUser, setDmMessages, setActiveChats]);

  // Leave on unmount
  useEffect(() => {
    return () => {
      if (user && socket?.connected) {
        emit(ClientEventsLocal.LEAVE);
      }
    };
  }, [user, socket, emit]);

  // Send global message
  const handleSendMessage = (text, replyTo) => {
    const replyData = replyTo ? {
      id: replyTo.id,
      username: replyTo.username,
      text: replyTo.text,
    } : undefined;

    emit(ClientEventsLocal.MESSAGE_SEND, { text, replyTo: replyData }, (response) => {
      if (!response?.success) {
        console.error('[App] Failed to send message:', response?.error);
      }
    });
    setGlobalReplyTo(null);
  };

  // Handle user click (start DM)
  const handleUserClick = (targetUser) => {
    if (targetUser.socketId === user?.socketId) return;

    emit(ClientEventsLocal.DM_CREATE, { targetUserId: targetUser.socketId }, (response) => {
      if (response?.success) {
        openDM(response.roomId, response.targetUser);
        // Restore messages if provided
        if (response.messages && response.messages.length > 0) {
          setDmMessages(prev => ({
            ...prev,
            [response.roomId]: response.messages,
          }));
        }
        setShowDM(true);
      } else {
        console.error('[App] Failed to create DM:', response?.error);
      }
    });
  };

  // Handle clicking on an existing active chat
  const handleChatClick = (chat) => {
    // Get latest user info for this chat
    const targetUser = users.find(u => u.username === chat.targetUser.username) || chat.targetUser;
    openDM(chat.roomId, { ...chat.targetUser, ...targetUser });
    setShowDM(true);
    // Clear unread count for this chat
    setUnreadCounts(prev => {
      const copy = { ...prev };
      delete copy[chat.roomId];
      return copy;
    });
  };

  // Send DM message
  const handleDMSend = (text, replyTo) => {
    if (!activeDM) return;

    const replyData = replyTo ? {
      id: replyTo.id,
      username: replyTo.username,
      text: replyTo.text,
    } : undefined;

    emit(ClientEventsLocal.DM_SEND, { roomId: activeDM.roomId, text, replyTo: replyData }, (response) => {
      if (response?.success) {
        // Add the sent message locally (server no longer echoes it back to sender)
        const sentMessage = {
          id: `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.socketId,
          username: user.username,
          text,
          timestamp: Date.now(),
          replyTo: replyData,
        };
        addDMMessage(activeDM.roomId, sentMessage);
      } else {
        console.error('[App] Failed to send DM:', response?.error);
      }
    });
  };

  // Reply privately - opens a DM with the message author and sends a reply there
  const handleReplyPrivately = (message) => {
    // Find the user by their userId (socketId)
    const targetUser = users.find(u => u.socketId === message.userId);
    if (!targetUser || targetUser.socketId === user?.socketId) return;

    emit(ClientEventsLocal.DM_CREATE, { targetUserId: targetUser.socketId }, (response) => {
      if (response?.success) {
        openDM(response.roomId, response.targetUser);
        // Restore messages if provided
        if (response.messages && response.messages.length > 0) {
          setDmMessages(prev => ({
            ...prev,
            [response.roomId]: response.messages,
          }));
        }
        setShowDM(true);

        // Now send the reply privately
        const replyData = {
          id: message.id,
          username: message.username,
          text: message.text,
        };

        emit(ClientEventsLocal.DM_SEND, { roomId: response.roomId, text: `↩️ Replying to: "${message.text.slice(0, 100)}${message.text.length > 100 ? '...' : ''}"`, replyTo: replyData }, (dmResponse) => {
          if (dmResponse?.success) {
            const sentMessage = {
              id: `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: user.socketId,
              username: user.username,
              text: `↩️ Replying to: "${message.text.slice(0, 100)}${message.text.length > 100 ? '...' : ''}"`,
              timestamp: Date.now(),
              replyTo: replyData,
            };
            addDMMessage(response.roomId, sentMessage);
          }
        });
      } else {
        console.error('[App] Failed to create DM for private reply:', response?.error);
      }
    });
  };

  // Close DM (just hides the modal, chat persists)
  const handleDMClose = () => {
    if (activeDM) {
      // Just close the modal - chat remains in active chats
      closeDM(activeDM.roomId);
      setShowDM(false);
    }
  };

  // Fully close/delete DM (explicit user action)
  const handleDMDelete = (roomId) => {
    emit(ClientEventsLocal.DM_CLOSE, { roomId });
    removeChat(roomId);
    if (activeDM?.roomId === roomId) {
      setShowDM(false);
    }
  };

  // Handle typing
  const handleTypingStart = () => {
    emit(ClientEventsLocal.TYPING_START, { roomId: activeDM?.roomId });
  };

  const handleTypingStop = () => {
    emit(ClientEventsLocal.TYPING_STOP, { roomId: activeDM?.roomId });
  };

  // Show rules modal if not accepted
  if (!hasAcceptedRules) {
    return <RulesModal onAccept={acceptRules} />;
  }

  // Show connection error
  if (connectionError) {
    return (
      <div className="min-h-screen bg-chat-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Cannot Connect to Server</h2>
          <p className="text-gray-400 mb-6">
            {connectionError}. Make sure the server is running on port 3001.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-chat-primary hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-chat-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-chat-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 mt-4">Connecting...</p>
          {!connected && (
            <p className="text-sm text-gray-500 mt-2">Establishing connection to server...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-chat-bg flex overflow-hidden">
      {/* Users Sidebar */}
      <UsersSidebar
        users={users}
        currentUser={user}
        onUserClick={handleUserClick}
        activeChats={activeChats}
        onChatClick={handleChatClick}
        unreadCounts={unreadCounts}
      />

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <ChatPanel
          title="Global Chat"
          messages={messages}
          typingUsers={typingUsers}
          currentUser={user}
          onReply={(msg) => setGlobalReplyTo(msg)}
          onReplyPrivately={handleReplyPrivately}
        />
        <MessageInput
          onSend={handleSendMessage}
          replyTo={globalReplyTo}
          onCancelReply={() => setGlobalReplyTo(null)}
        />
      </div>

      {/* DM Modal */}
      <DMModal
        isOpen={showDM}
        targetUser={activeDM?.targetUser}
        messages={activeDM ? getDMMessages(activeDM.roomId) : []}
        typingUsers={typingUsers}
        currentUser={user}
        onSend={handleDMSend}
        onClose={handleDMClose}
      />
    </div>
  );
}

// Export with provider
export default function App() {
  return (
    <ChatProvider>
      <ChatApp />
    </ChatProvider>
  );
}
