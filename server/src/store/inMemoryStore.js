// In-memory store for ephemeral data
// All data exists only in RAM and is lost on server restart

class InMemoryStore {
  constructor() {
    // Map<socketId, User>
    this.users = new Map();

    // Map<username, socketId> - track which socket belongs to which username
    this.userSockets = new Map();

    // Map<username, publicKeyJwk> - persist public keys even if offline
    this.userPublicKeys = new Map();

    // Array<Message> - capped at maxMessages
    this.messages = [];
    this.maxMessages = 100;

    // Map<roomId, DMRoom>
    // DMs are stored with usernames, not socket IDs, so they persist through reconnects
    this.dms = new Map();

    // Cleanup interval not needed for DMs anymore
    this.cleanupInterval = null;
    // DMs persist until both users disconnect - no expiry
  }

  // User operations
  addUser(socketId, userData) {
    const username = userData.username;

    this.users.set(socketId, {
      ...userData,
      joinedAt: Date.now(),
      isTyping: false,
    });

    // Track socket by username
    this.userSockets.set(username, socketId);

    if (userData.publicKeyJwk) {
      this.userPublicKeys.set(username, userData.publicKeyJwk);
    }

    return this.getUser(socketId);
  }

  getUser(socketId) {
    return this.users.get(socketId);
  }

  getUserByUsername(username) {
    const socketId = this.userSockets.get(username);
    if (socketId) {
      return this.users.get(socketId);
    }
    return null;
  }

  getPublicKey(username) {
    return this.userPublicKeys.get(username);
  }

  getSocketIdForUsername(username) {
    return this.userSockets.get(username);
  }

  removeUser(socketId) {
    const user = this.users.get(socketId);
    if (user) {
      this.users.delete(socketId);
      // Don't delete from userSockets yet - we need to keep track for DM reconnection
      // It will be cleaned up when both DM participants are disconnected
    }
    return user;
  }

  getAllUsers() {
    return Array.from(this.users.entries()).map(([socketId, user]) => ({
      socketId,
      ...user,
    }));
  }

  // Message operations
  addMessage(message) {
    this.messages.push(message);

    // Cap the messages array
    if (this.messages.length > this.maxMessages) {
      this.messages.shift(); // Remove oldest
    }
  }

  getMessages() {
    return [...this.messages];
  }

  removeUserMessages(userId) {
    const initialLength = this.messages.length;
    this.messages = this.messages.filter(m => m.userId !== userId);
    return initialLength - this.messages.length; // Return count of removed messages
  }

  // DM operations
  // Create DM between two users (by username)
  createDM(username1, username2) {
    const roomId = [username1, username2].sort().join('--');

    let dm = this.dms.get(roomId);
    if (!dm) {
      dm = {
        roomId,
        participants: [username1, username2], // Store usernames, not socket IDs
        messages: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };
      this.dms.set(roomId, dm);
    }

    return dm;
  }

  getDM(roomId) {
    return this.dms.get(roomId);
  }

  // Get DM between two users
  getDMBetweenUsers(username1, username2) {
    const roomId = [username1, username2].sort().join('--');
    return this.dms.get(roomId);
  }

  addDMMessage(roomId, message) {
    const dm = this.dms.get(roomId);
    if (dm) {
      dm.messages.push(message);
      dm.lastActivity = Date.now();

      // Cap DM messages at 100 per room (increased from 50 for persistence)
      if (dm.messages.length > 100) {
        dm.messages.shift();
      }
    }
  }

  closeDM(roomId) {
    return this.dms.delete(roomId);
  }

  // Get all DMs for a user (by username)
  getUserDMs(username) {
    const userDMs = [];
    for (const [roomId, dm] of this.dms.entries()) {
      if (dm.participants.includes(username)) {
        userDMs.push({ ...dm });
      }
    }
    return userDMs;
  }

  // Check if a username is already taken by an online user
  isUsernameTaken(username) {
    const socketId = this.userSockets.get(username);
    // Username is taken only if the socket is still connected (user is in the users map)
    return socketId && this.users.has(socketId);
  }

  // Check if a user is currently connected
  isUserConnected(usernameOrSocketId) {
    // Check by socket ID first
    if (this.users.has(usernameOrSocketId)) {
      return true;
    }
    // Then check by username
    const socketId = this.userSockets.get(usernameOrSocketId);
    return socketId && this.users.has(socketId);
  }

  // Check if both participants of a DM are connected
  areBothParticipantsConnected(dm) {
    return dm.participants.every(username => this.isUserConnected(username));
  }

  // Check if any participant of a DM is connected
  isAnyParticipantConnected(dm) {
    return dm.participants.some(username => this.isUserConnected(username));
  }

  // Cleanup operations
  startCleanup() {
    // No automatic DM cleanup - DMs persist until both users disconnect
    this.cleanupInterval = null;
  }

  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Full cleanup on user disconnect
  // DMs persist as long as at least one participant is connected
  cleanupUser(socketId) {
    // Remove user
    const user = this.removeUser(socketId);

    if (user) {
      const removedCount = this.removeUserMessages(socketId);
      console.log(`[Store] User ${user.username} left. Removed ${removedCount} messages.`);

      // Get all DMs for this user
      const userDMs = this.getUserDMs(user.username);
      const closedDMs = [];
      const activeDMs = []; // DMs that persist (other user still online)

      for (const dm of userDMs) {
        const otherParticipant = dm.participants.find(p => p !== user.username);
        const otherStillConnected = otherParticipant && this.isUserConnected(otherParticipant);

        if (otherStillConnected) {
          // Other user is still online - keep the DM
          activeDMs.push({
            roomId: dm.roomId,
            otherParticipant,
            dm,
          });
          console.log(`[Store] DM ${dm.roomId} persists - ${otherParticipant} still connected`);
        } else {
          // Both users disconnected - close the DM
          closedDMs.push({ roomId: dm.roomId, otherParticipant });
          this.closeDM(dm.roomId);
          // Clean up user socket mapping
          this.userSockets.delete(user.username);
          if (otherParticipant) {
            this.userSockets.delete(otherParticipant);
          }
          console.log(`[Store] DM ${dm.roomId} closed - both participants disconnected`);
        }
      }

      return { user, removedMessages: removedCount, closedDMs, activeDMs };
    }

    return null;
  }

  // Get stats for debugging
  getStats() {
    return {
      users: this.users.size,
      messages: this.messages.length,
      dms: this.dms.size,
    };
  }
}

// Singleton instance
export const store = new InMemoryStore();
