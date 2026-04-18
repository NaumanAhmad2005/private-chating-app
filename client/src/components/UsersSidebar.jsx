import React from 'react';

export function UsersSidebar({ users, currentUser, onUserClick, activeChats, onChatClick }) {
  const onlineUsers = users.filter(u => u.socketId !== currentUser?.socketId);

  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Truncate message text
  const truncateText = (text, maxLength = 25) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="w-72 bg-chat-surface border-r border-chat-border flex flex-col">
      {/* Active Chats Section */}
      {activeChats.length > 0 && (
        <>
          <div className="p-4 border-b border-chat-border">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-chat-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Active Chats
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {activeChats.length} {activeChats.length === 1 ? 'conversation' : 'conversations'}
            </p>
          </div>

          <div className="max-h-48 overflow-y-auto p-2 space-y-1 border-b border-chat-border">
            {activeChats.map((chat) => (
              <button
                key={chat.roomId}
                onClick={() => onChatClick(chat)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-chat-bg transition-colors duration-150 group text-left"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={chat.targetUser.avatar}
                    alt={chat.targetUser.username}
                    className="w-10 h-10 rounded-full bg-chat-border"
                  />
                  {chat.targetUser.isOnline !== false ? (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-chat-surface rounded-full"></span>
                  ) : (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-gray-500 border-2 border-chat-surface rounded-full"></span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white">
                    {chat.targetUser.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {truncateText(chat.lastMessage?.text) || 'No messages yet'}
                  </p>
                </div>

                {chat.lastMessage && (
                  <span className="text-xs text-gray-500">
                    {formatTime(chat.lastMessage.timestamp)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Online Users Section */}
      <div className="p-4 border-b border-chat-border">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Online Users
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {onlineUsers.length} {onlineUsers.length === 1 ? 'person' : 'people'} online
        </p>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {onlineUsers.map((user) => (
          <button
            key={user.socketId}
            onClick={() => onUserClick(user)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-chat-bg transition-colors duration-150 group"
          >
            <div className="relative flex-shrink-0">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-10 h-10 rounded-full bg-chat-border"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-chat-surface rounded-full"></span>
            </div>

            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white">
                {user.username}
              </p>
              <p className="text-xs text-gray-500">
                Click to message
              </p>
            </div>

            <svg className="w-5 h-5 text-gray-500 group-hover:text-chat-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        ))}

        {onlineUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No other users online</p>
          </div>
        )}
      </div>

      {/* Current User */}
      {currentUser && (
        <div className="p-4 border-t border-chat-border bg-chat-bg">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.username}
              className="w-10 h-10 rounded-full bg-chat-border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">
                {currentUser.username}
              </p>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Online
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
