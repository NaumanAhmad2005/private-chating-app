import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  // User state
  const [user, setUser] = useState(null); // { socketId, username, avatar }
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);

  // Users state
  const [users, setUsers] = useState([]);

  // Messages state
  const [messages, setMessages] = useState([]);

  // DM state
  const [activeDM, setActiveDM] = useState(null); // { roomId, targetUser } - currently open DM modal
  const [dmMessages, setDmMessagesInternal] = useState({}); // Map<roomId, messages[]>
  const [activeChats, setActiveChats] = useState([]); // Array of { roomId, targetUser, lastMessage, timestamp } - persistent DM list

  // Typing state
  const [typingUsers, setTypingUsers] = useState({}); // Map<userId, { username, roomId?, isTyping }>

  // Rules acceptance
  const acceptRules = useCallback(() => {
    setHasAcceptedRules(true);
    localStorage.setItem('chat_rules_accepted', 'true');
  }, []);

  // Set user
  const setUserState = useCallback((userData) => {
    setUser(userData);
  }, []);

  // Update users list
  const updateUsers = useCallback((usersList) => {
    setUsers(usersList);
  }, []);

  // Add user to list
  const addUser = useCallback((userData) => {
    setUsers(prev => {
      if (prev.find(u => u.socketId === userData.socketId)) {
        return prev;
      }
      return [...prev, userData];
    });
  }, []);

  // Remove user from list
  const removeUser = useCallback((socketId) => {
    setUsers(prev => prev.filter(u => u.socketId !== socketId));
  }, []);

  // Add global message
  const addGlobalMessage = useCallback((message) => {
    setMessages(prev => {
      const newMessages = [...prev, message];
      // Cap at 100 messages
      if (newMessages.length > 100) {
        return newMessages.slice(-100);
      }
      return newMessages;
    });
  }, []);

  // Set initial messages
  const setInitialMessages = useCallback((msgs) => {
    setMessages(msgs);
  }, []);

  // DM operations
  const openDM = useCallback((roomId, targetUser) => {
    setActiveDM({ roomId, targetUser });
    // Initialize DM messages array if not exists
    setDmMessagesInternal(prev => ({
      ...prev,
      [roomId]: prev[roomId] || [],
    }));
    // Add to active chats if not already present
    setActiveChats(prev => {
      if (prev.find(c => c.roomId === roomId)) return prev;
      return [...prev, { roomId, targetUser, lastMessage: null, timestamp: Date.now() }];
    });
  }, []);

  const closeDM = useCallback((roomId) => {
    setActiveDM(prev => prev?.roomId === roomId ? null : prev);
    // Messages are NOT removed - they persist until user leaves the website
    // This allows users to reopen DMs and see chat history
  }, []);

  // Update active chat with last message
  const updateActiveChat = useCallback((roomId, message) => {
    setActiveChats(prev => {
      const chat = prev.find(c => c.roomId === roomId);
      if (!chat) return prev;
      return prev.map(c =>
        c.roomId === roomId
          ? { ...c, lastMessage: message, timestamp: message.timestamp }
          : c
      );
    });
  }, []);

  // Add chat from received DM (when someone messages you)
  const addOrUpdateChat = useCallback((roomId, targetUser, lastMessage) => {
    setActiveChats(prev => {
      const existing = prev.find(c => c.roomId === roomId);
      if (existing) {
        return prev.map(c =>
          c.roomId === roomId
            ? { ...c, lastMessage, timestamp: lastMessage?.timestamp || Date.now() }
            : c
        );
      }
      return [...prev, { roomId, targetUser, lastMessage, timestamp: Date.now() }];
    });
  }, []);

  // Remove chat from list (when user disconnects or DM is closed)
  const removeChat = useCallback((roomId) => {
    setActiveChats(prev => prev.filter(c => c.roomId !== roomId));
    // Also clean up messages
    setDmMessagesInternal(prev => {
      const copy = { ...prev };
      delete copy[roomId];
      return copy;
    });
  }, []);

  const addDMMessage = useCallback((roomId, message) => {
    setDmMessagesInternal(prev => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), message],
    }));
    // Update the last message in active chats
    setActiveChats(prev => {
      const existing = prev.find(c => c.roomId === roomId);
      if (existing) {
        return prev.map(c =>
          c.roomId === roomId
            ? { ...c, lastMessage: message, timestamp: message.timestamp }
            : c
        );
      }
      return prev;
    });
  }, []);

  // Set DM messages directly (for restoring recovered DMs on reconnect)
  const setDmMessages = useCallback((updater) => {
    setDmMessagesInternal(prev => typeof updater === 'function' ? updater(prev) : updater);
  }, []);

  // Typing operations
  const setTypingUser = useCallback((userId, userData) => {
    setTypingUsers(prev => ({
      ...prev,
      [userId]: userData,
    }));
  }, []);

  const removeTypingUser = useCallback((userId) => {
    setTypingUsers(prev => {
      const copy = { ...prev };
      delete copy[userId];
      return copy;
    });
  }, []);

  // Get DM messages
  const getDMMessages = useCallback((roomId) => {
    return dmMessages[roomId] || [];
  }, [dmMessages]);

  // Check if user is in active DM
  const isUserInActiveDM = useCallback((userId) => {
    return activeDM?.targetUser?.socketId === userId;
  }, [activeDM]);

  const value = useMemo(() => ({
    // User
    user,
    setUser: setUserState,
    hasAcceptedRules,
    acceptRules,

    // Users
    users,
    addUser,
    removeUser,
    updateUsers,

    // Messages
    messages,
    addGlobalMessage,
    setInitialMessages,

    // DM
    activeDM,
    openDM,
    closeDM,
    addDMMessage,
    getDMMessages,
    isUserInActiveDM,
    activeChats,
    setActiveChats,
    updateActiveChat,
    addOrUpdateChat,
    removeChat,
    setDmMessages,

    // Typing
    typingUsers,
    setTypingUser,
    removeTypingUser,
  }), [
    user,
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
    isUserInActiveDM,
    activeChats,
    setActiveChats,
    updateActiveChat,
    addOrUpdateChat,
    removeChat,
    setDmMessages,
    typingUsers,
    setTypingUser,
    removeTypingUser,
  ]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
