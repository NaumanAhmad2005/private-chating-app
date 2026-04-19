import React, { useState } from 'react';

export function UsersSidebar({ users, currentUser, onUserClick, activeChats, onChatClick, onGeneralClick, unreadCounts = {}, onClose }) {
  const onlineUsers = users.filter(u => u.socketId !== currentUser?.socketId);
  const [activeTab, setActiveTab] = useState('general');

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const truncateText = (text, maxLength = 25) => {
    if (!text) return '';
    return text.length <= maxLength ? text : text.slice(0, maxLength) + '…';
  };

  return (
    <div className="w-72 sm:w-80 bg-chat-surface border-r sm:border border-chat-border flex flex-col h-full sm:rounded-3xl sm:shadow-2xl overflow-hidden">
      {/* Tab Navigation */}
      <div className="h-16 flex items-center justify-center border-b border-chat-border flex-shrink-0 px-3 sm:px-4">
        <div className="flex w-full bg-chat-bg p-1 rounded-2xl border border-chat-border shadow-inner">
          <button
            onClick={() => { setActiveTab('general'); onGeneralClick?.(); }}
            className={`flex-1 py-1.5 px-2 text-sm font-semibold rounded-[0.85rem] transition-all duration-200 ${
              activeTab === 'general'
                ? 'bg-chat-surface shadow-md border border-chat-border/50 text-chat-primary'
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              General
            </div>
          </button>

          <button
            onClick={() => setActiveTab('dms')}
            className={`flex-1 py-1.5 px-2 text-sm font-semibold rounded-[0.85rem] transition-all duration-200 ${
              activeTab === 'dms'
                ? 'bg-chat-surface shadow-md border border-chat-border/50 text-chat-primary'
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Messages
              {activeChats.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-chat-primary text-white rounded-full min-w-[1.25rem] text-center shadow-sm">
                  {activeChats.length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Mobile close button — only shown on small screens */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden flex-shrink-0 ml-2 p-1.5 rounded-xl hover:bg-chat-bg transition-colors border border-transparent hover:border-chat-border"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" style={{ color: 'var(--chat-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 flex flex-col">

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-chat-border">
              <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--chat-text)' }}>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Online Users
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--chat-text-muted)' }}>
                {onlineUsers.length} {onlineUsers.length === 1 ? 'person' : 'people'} online
              </p>
            </div>

            <div className="p-2 space-y-1">
              {onlineUsers.map((user) => (
                <button
                  key={user.socketId}
                  onClick={() => onUserClick(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-chat-bg transition-colors duration-150 group"
                >
                  <div className="relative flex-shrink-0">
                    <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full bg-chat-border" />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-chat-surface rounded-full"></span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--chat-text)' }}>
                      {user.username}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--chat-text-muted)' }}>Click to message</p>
                  </div>
                  <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--chat-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
              ))}

              {onlineUsers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: 'var(--chat-text-muted)' }}>No other users online</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DMs Tab */}
        {activeTab === 'dms' && (
          <div className="flex-1 overflow-y-auto">
            {activeChats.length > 0 ? (
              <div className="p-2 space-y-1">
                {activeChats.map((chat) => (
                  <button
                    key={chat.roomId}
                    onClick={() => onChatClick(chat)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-chat-bg transition-colors duration-150 group text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <img src={chat.targetUser.avatar} alt={chat.targetUser.username} className="w-10 h-10 rounded-full bg-chat-border" />
                      <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-chat-surface rounded-full ${
                        chat.targetUser.isOnline !== false ? 'bg-green-500' : 'bg-gray-500'
                      }`}></span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--chat-text)' }}>
                          {chat.targetUser.username}
                        </p>
                        {unreadCounts[chat.roomId] > 0 && (
                          <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[1.25rem] text-center">
                            {unreadCounts[chat.roomId]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs truncate" style={{ color: 'var(--chat-text-muted)' }}>
                        {truncateText(chat.lastMessage?.text) || 'No messages yet'}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {chat.lastMessage && (
                        <span className="text-xs" style={{ color: 'var(--chat-text-muted)' }}>
                          {formatTime(chat.lastMessage.timestamp)}
                        </span>
                      )}
                      {chat.targetUser.isOnline === false && (
                        <span className="text-xs" style={{ color: 'var(--chat-text-muted)' }}>Offline</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 px-4" style={{ color: 'var(--chat-text-muted)' }}>
                <svg className="w-12 h-12 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm text-center">No private messages yet</p>
                <p className="text-xs text-center mt-1 opacity-70">Click on a user in General tab to start a chat</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current User Footer */}
      {currentUser && (
        <div className="p-4 border-t border-chat-border bg-chat-bg flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src={currentUser.avatar} alt={currentUser.username} className="w-10 h-10 rounded-full bg-chat-border" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--chat-text)' }}>
                {currentUser.username}
              </p>
              <p className="text-xs text-green-500 flex items-center gap-1">
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
