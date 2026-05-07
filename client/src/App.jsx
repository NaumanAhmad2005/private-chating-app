import React, { useEffect, useRef, useState } from 'react';
import { ChatProvider, useChat } from './context/ChatContext';
import { useSocket } from './hooks/useSocket';
import { RulesModal } from './components/RulesModal';
import { UsersSidebar } from './components/UsersSidebar';
import { ChatPanel } from './components/ChatPanel';
import { MessageInput } from './components/MessageInput';
import { DMModal } from './components/DMModal';
import { generateUsername, generateAvatarSeed } from './utils/usernameGenerator';
import { generateKeyPair, deriveSharedSecret, getGlobalSharedSecret, encryptText, decryptText } from './utils/encryption';
import { ClientEvents, ServerEvents } from './events';

// Socket event constants (client-side)
const ClientEventsLocal = {
  JOIN: 'user:join',
  LEAVE: 'user:leave',
  MESSAGE_SEND: 'message:send',
  DM_CREATE: 'dm:create',
  DM_SEND: 'dm:send',
  DM_CLOSE: 'dm:close',
  DM_READ: 'dm:read',
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
  DM_INVITED: 'dm:invited',
  DM_CLOSED: 'dm:closed',
  DM_READ: 'dm:read',
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
  const [unreadCounts, setUnreadCounts] = useState({});
  const [globalReplyTo, setGlobalReplyTo] = useState(null);
  const [dmInvitation, setDmInvitation] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sidebar drawer
  const [isDark, setIsDark] = useState(() => {
    // Persist theme choice in localStorage
    const saved = localStorage.getItem('chat_theme');
    const dark = saved !== 'light';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    return dark;
  });
  const typingTimeoutRef = useRef(null);
  const activeChatsRef = useRef(activeChats);
  const activeDMRef = useRef(activeDM);
  const userRef = useRef(user);
  const emitRef = useRef(null);

  // E2EE Keys state
  const [keyPair, setKeyPair] = useState(null);
  const keyPairRef = useRef(null);
  const sharedSecretsRef = useRef(new Map());
  const globalSecretRef = useRef(null);

  useEffect(() => {
    generateKeyPair().then(kp => {
      keyPairRef.current = kp;
      setKeyPair(kp);
    }).catch(console.error);

    getGlobalSharedSecret().then(secret => {
      globalSecretRef.current = secret;
    }).catch(console.error);
  }, []);

  const getSharedSecret = async (targetUsername, targetPublicKeyJwk) => {
    if (!targetPublicKeyJwk || !keyPairRef.current) return null;
    if (sharedSecretsRef.current.has(targetUsername)) {
      return sharedSecretsRef.current.get(targetUsername);
    }
    try {
      const secret = await deriveSharedSecret(keyPairRef.current.privateKey, targetPublicKeyJwk);
      sharedSecretsRef.current.set(targetUsername, secret);
      return secret;
    } catch (err) {
      console.error("[App] Failed to derive shared secret for", targetUsername, err);
      return null;
    }
  };

  // Keep refs in sync
  useEffect(() => {
    activeChatsRef.current = activeChats;
  }, [activeChats]);

  useEffect(() => {
    activeDMRef.current = activeDM;
  }, [activeDM]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // emitRef is updated after useSocket (below) and kept in sync via useEffect

  // Fix mobile viewport height when virtual keyboard opens
  useEffect(() => {
    const updateViewportHeight = () => {
      if (window.visualViewport) {
        document.documentElement.style.setProperty('--viewport-height', `${window.visualViewport.height}px`);
        window.scrollTo(0, 0); // Force scroll to top to prevent jumping
      } else {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      }
    };

    const preventScroll = () => window.scrollTo(0, 0);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight);
      window.visualViewport.addEventListener('scroll', preventScroll);
    } else {
      window.addEventListener('resize', updateViewportHeight);
    }
    
    updateViewportHeight();
    
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportHeight);
        window.visualViewport.removeEventListener('scroll', preventScroll);
      } else {
        window.removeEventListener('resize', updateViewportHeight);
      }
    };
  }, []);

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
    [ServerEventsLocal.MESSAGE_NEW]: async ({ message, messages: initialMessages }) => {
      if (message) {
        if (globalSecretRef.current) {
          if (message.text) message.text = await decryptText(message.text, globalSecretRef.current);
          if (message.image) message.image = await decryptText(message.image, globalSecretRef.current);
        }
        addGlobalMessage(message);
      } else if (initialMessages) {
        if (globalSecretRef.current) {
          for (const msg of initialMessages) {
            if (msg.text) msg.text = await decryptText(msg.text, globalSecretRef.current);
            if (msg.image) msg.image = await decryptText(msg.image, globalSecretRef.current);
          }
        }
        setInitialMessages(initialMessages);
      }
    },

    // DM created - only for sender (receiver gets DM_INVITED instead)
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

    // DM invitation - first message received, show toast notification (don't auto-open modal)
    [ServerEventsLocal.DM_INVITED]: async ({ roomId, message, sender }) => {
      console.log('[App] DM invitation from:', sender.username);

      const secret = await getSharedSecret(sender.username, sender.publicKeyJwk);
      if (secret) {
        if (message.text) message.text = await decryptText(message.text, secret);
        if (message.image) message.image = await decryptText(message.image, secret);
      }

      // Add the initial message to the chat
      addDMMessage(roomId, message);

      // Add to active chats
      setActiveChats(prev => {
        if (prev.find(c => c.roomId === roomId)) return prev;
        return [...prev, {
          roomId,
          targetUser: {
            username: sender.username,
            avatar: sender.avatar,
            isOnline: true,
            socketId: sender.socketId,
          },
          lastMessage: message,
          timestamp: message.timestamp,
        }];
      });

      // Show toast notification
      setDmInvitation({
        roomId,
        senderUsername: sender.username,
        messageText: message.text || "Sent an image",
      });

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setDmInvitation(null);
      }, 5000);
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

    // DM read receipt
    [ServerEventsLocal.DM_READ]: ({ roomId }) => {
      console.log('[App] DM read receipt:', roomId);
      setDmMessages(prev => {
        const roomMessages = prev[roomId];
        if (!roomMessages) return prev;
        const currentUserId = userRef.current?.socketId;
        const updated = roomMessages.map(msg =>
          msg.userId === currentUserId && msg.status !== 'read'
            ? { ...msg, status: 'read' }
            : msg
        );
        if (updated === roomMessages) return prev;
        return { ...prev, [roomId]: updated };
      });
    },

    // DM received
    [ServerEventsLocal.DM_RECEIVED]: async ({ roomId, message, isOwn, senderPublicKeyJwk }) => {
      const secret = await getSharedSecret(message.username, senderPublicKeyJwk);
      if (secret) {
        if (message.text) message.text = await decryptText(message.text, secret);
        if (message.image) message.image = await decryptText(message.image, secret);
      }

      addDMMessage(roomId, message);

      // Use refs for current values
      const currentActiveDM = activeDMRef.current;
      const currentActiveChats = activeChatsRef.current;

      // Auto-read: if the DM is currently open, send read receipt immediately
      if (currentActiveDM?.roomId === roomId && !isOwn) {
        emitRef.current(ClientEventsLocal.DM_READ, { roomId });
      }

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

        // ── In-app banner notification ──────────────────────────────────
        const chat = currentActiveChats.find(c => c.roomId === roomId);
        const senderName = chat?.targetUser?.username || message.username || 'Someone';

        setDmInvitation({
          roomId,
          senderUsername: senderName,
          messageText: message.text || "Sent an image",
        });
        // Auto-dismiss after 5 seconds
        setTimeout(() => setDmInvitation(null), 5000);
        // ───────────────────────────────────────────────────────────────

        // Browser notification (if permission granted)
        if (Notification.permission === 'granted') {
          const bodyText = message.text ? `${message.text.slice(0, 50)}${message.text.length > 50 ? '...' : ''}` : "Sent an image";
          new Notification('New Private Message', {
            body: `${senderName}: ${bodyText}`,
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

  // Keep emitRef in sync with the stable emit callback from useSocket
  useEffect(() => {
    emitRef.current = emit;
  }, [emit]);

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

      emit(ClientEventsLocal.JOIN, { username, avatarSeed, publicKeyJwk: keyPairRef.current?.publicKeyJwk }, async (response) => {
        if (response?.success && response.user) {
          // Use the server-assigned username (server enforces uniqueness)
          setUser({ ...response.user, socketId: socket.id });
          console.log('[App] Joined as:', response.user.username);

          // Restore recovered DMs if any
          if (response.recoveredDMs && response.recoveredDMs.length > 0) {
            console.log('[App] Restoring', response.recoveredDMs.length, 'DMs');
            
            for (const dm of response.recoveredDMs) {
              const secret = await getSharedSecret(dm.targetUser.username, dm.targetUser.publicKeyJwk);
              if (secret && dm.messages) {
                for (const msg of dm.messages) {
                  if (msg.text) msg.text = await decryptText(msg.text, secret);
                  if (msg.image) msg.image = await decryptText(msg.image, secret);
                }
              }

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
            }
          }
        }
      });
    }
  }, [hasAcceptedRules, user, connected, emit, setUser, setDmMessages, setActiveChats]);

  // Emit read receipt when a DM is opened
  useEffect(() => {
    if (activeDM?.roomId && connected) {
      emit(ClientEventsLocal.DM_READ, { roomId: activeDM.roomId });
    }
  }, [activeDM?.roomId, connected]);

  // Clear user on disconnect so JOIN effect re-fires on reconnect
  useEffect(() => {
    if (!connected && user) {
      setUser(null);
    }
  }, [connected, user, setUser]);

  // Leave on unmount
  useEffect(() => {
    return () => {
      if (user && socket?.connected) {
        emit(ClientEventsLocal.LEAVE);
      }
    };
  }, [user, socket, emit]);

  // Send global message
  const handleSendMessage = async (text, replyTo, image) => {
    let cipherText = text;
    let cipherImage = image;

    if (globalSecretRef.current) {
      if (text) cipherText = await encryptText(text, globalSecretRef.current);
      if (image) cipherImage = await encryptText(image, globalSecretRef.current);
    }

    const replyData = replyTo ? {
      id: replyTo.id,
      username: replyTo.username,
      text: replyTo.text,
    } : undefined;

    emit(ClientEventsLocal.MESSAGE_SEND, { text: cipherText, replyTo: replyData, image: cipherImage }, (response) => {
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
  const handleDMSend = async (text, replyTo, image) => {
    if (!activeDM) return;

    let cipherText = text;
    let cipherImage = image;

    const secret = await getSharedSecret(activeDM.targetUser.username, activeDM.targetUser.publicKeyJwk);
    if (secret) {
      if (text) cipherText = await encryptText(text, secret);
      if (image) cipherImage = await encryptText(image, secret);
    }

    const replyData = replyTo ? {
      id: replyTo.id,
      username: replyTo.username,
      text: replyTo.text,
    } : undefined;

    emit(ClientEventsLocal.DM_SEND, { roomId: activeDM.roomId, text: cipherText, replyTo: replyData, image: cipherImage }, (response) => {
      if (response?.success) {
        // Add the sent message locally (server no longer echoes it back to sender)
        const sentMessage = {
          id: `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.socketId,
          username: user.username,
          text,
          timestamp: Date.now(),
          status: 'sent',
          replyTo: replyData,
          ...(image && { image }),
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
        
        let textToSend = `↩️ Replying to: "${message.text.slice(0, 100)}${message.text.length > 100 ? '...' : ''}"`;
        let cipherText = textToSend;
        
        // Wait, handleReplyPrivately might not have targetUser.publicKeyJwk immediately since it's fetched from 'users'
        // TargetUser is found from users list, so it should have publicKeyJwk if they are online.
        getSharedSecret(targetUser.username, targetUser.publicKeyJwk).then(secret => {
          if (secret) {
            encryptText(textToSend, secret).then(encrypted => {
              emit(ClientEventsLocal.DM_SEND, { roomId: response.roomId, text: encrypted, replyTo: replyData }, (dmResponse) => {
                if (dmResponse?.success) {
                  const sentMessage = {
                    id: `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    userId: user.socketId,
                    username: user.username,
                    text: textToSend,
                    timestamp: Date.now(),
                    status: 'sent',
                    replyTo: replyData,
                  };
                  addDMMessage(response.roomId, sentMessage);
                }
              });
            });
          } else {
              emit(ClientEventsLocal.DM_SEND, { roomId: response.roomId, text: cipherText, replyTo: replyData }, (dmResponse) => {
                if (dmResponse?.success) {
                  const sentMessage = {
                    id: `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    userId: user.socketId,
                    username: user.username,
                    text: textToSend,
                    timestamp: Date.now(),
                    status: 'sent',
                    replyTo: replyData,
                  };
                  addDMMessage(response.roomId, sentMessage);
                }
              });
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

  // Toggle light / dark theme
  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
      localStorage.setItem('chat_theme', next ? 'dark' : 'light');
      return next;
    });
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

  // Show loading state (Socket.io auto-reconnects with reconnection:true)
  if (!user) {
    return (
      <div className="h-app-screen bg-chat-bg flex items-center justify-center">
        <div className="text-center max-w-sm mx-4">
          <div className="w-12 h-12 border-4 border-chat-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4" style={{ color: 'var(--chat-text-muted)' }}>Connecting...</p>
          {!connected && (
            <p className="text-sm mt-2" style={{ color: connectionError ? '#ef4444' : 'var(--chat-text-muted)' }}>
              {connectionError ? `${connectionError} - Retrying...` : 'Establishing connection to server...'}
            </p>
          )}
          {connectionError && (
            <button
              onClick={() => window.location.reload()}
              className="mt-5 px-5 py-2.5 bg-chat-primary text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity active:scale-95"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-app-screen bg-chat-bg flex overflow-hidden sm:p-4 sm:gap-4 relative">
      {/* DM Invitation Toast Notification */}
      {dmInvitation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
          <div className="bg-chat-primary text-white px-5 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-slide-up ring-4 ring-chat-primary/20">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">New Private Message</p>
              <p className="text-xs text-white/80 truncate">
                <span className="font-medium">{dmInvitation.senderUsername}</span>: {dmInvitation.messageText.slice(0, 40)}{dmInvitation.messageText.length > 40 ? '…' : ''}
              </p>
            </div>
            <button
              onClick={() => {
                handleChatClick({ roomId: dmInvitation.roomId, targetUser: { username: dmInvitation.senderUsername } });
                setDmInvitation(null);
              }}
              className="flex-shrink-0 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-2xl text-xs font-medium transition-all active:scale-95"
            >
              Open
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile sidebar overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────
            Desktop: always visible (w-72)
            Mobile:  slide-in drawer from left, hidden by default
      ─────────────────────────────────────────────────── */}
      <div className={`
        absolute inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-auto md:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <UsersSidebar
          users={users}
          currentUser={user}
          onUserClick={(u) => { handleUserClick(u); setSidebarOpen(false); }}
          activeChats={activeChats}
          onChatClick={(chat) => { handleChatClick(chat); setSidebarOpen(false); }}
          unreadCounts={unreadCounts}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* ── Main Chat Panel ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-chat-surface sm:rounded-3xl sm:shadow-2xl sm:border border-chat-border overflow-hidden">
        <ChatPanel
          title="Global Chat"
          messages={messages}
          typingUsers={typingUsers}
          currentUser={user}
          onReply={(msg) => setGlobalReplyTo(msg)}
          onReplyPrivately={handleReplyPrivately}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onMenuClick={() => setSidebarOpen(prev => !prev)}
        />
        <MessageInput
          onSend={handleSendMessage}
          replyTo={globalReplyTo}
          onCancelReply={() => setGlobalReplyTo(null)}
        />
      </div>

      {/* ── DM Modal ── */}
      <DMModal
        isOpen={showDM}
        targetUser={activeDM?.targetUser}
        messages={activeDM ? getDMMessages(activeDM.roomId) : []}
        typingUsers={typingUsers}
        currentUser={user}
        onSend={handleDMSend}
        onClose={handleDMClose}
      />

      {/* ── Connection Status Banner ── */}
      {!connected && user && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs sm:text-sm text-center py-2 px-4 font-medium shadow-lg animate-slide-down">
          <span className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Connection lost. Reconnecting...
          </span>
        </div>
      )}
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
