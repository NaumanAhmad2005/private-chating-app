import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

export function ChatPanel({ title, messages, typingUsers, currentUser, targetUser, onReply, onReplyPrivately, isDark, onToggleTheme, onMenuClick }) {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isDM = !!targetUser;

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="h-16 flex items-center gap-3 px-4 bg-chat-surface border-b border-chat-border flex-shrink-0">

        {/* Hamburger menu — only on mobile */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden flex-shrink-0 p-2 rounded-xl hover:bg-chat-bg transition-colors"
            title="Open menu"
            aria-label="Open sidebar"
          >
            {/* Three vertical dots icon */}
            <svg className="w-5 h-5" style={{ color: 'var(--chat-text-muted)' }} fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5"  r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
        )}

        {targetUser && (
          <img
            src={targetUser.avatar}
            alt={targetUser.username}
            className="w-9 h-9 rounded-full bg-chat-border flex-shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold truncate" style={{ color: 'var(--chat-text)' }}>
            {title}
          </h2>
          {isDM && (
            <p className="text-xs sm:text-sm" style={{ color: 'var(--chat-text-muted)' }}>
              {targetUser.username}
            </p>
          )}
        </div>

        {/* Theme Toggle */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-chat-border bg-chat-bg hover:border-chat-primary transition-all duration-200 flex-shrink-0"
            style={{ color: 'var(--chat-text-muted)' }}
          >
            {isDark ? (
              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M5.64 18.36l-.71.71m12.02 0-.71-.71M6.34 5.64l-.71-.71M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" style={{ color: 'var(--chat-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
            <span className="text-xs font-medium hidden sm:inline" style={{ color: isDark ? '#facc15' : 'var(--chat-primary)' }}>
              {isDark ? 'Light' : 'Dark'}
            </span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 bg-chat-bg"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--chat-text-muted)' }}>
            <svg className="w-14 h-14 sm:w-16 sm:h-16 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1 opacity-70">Be the first to say hello!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwn = message.userId === currentUser?.socketId;
              const showAvatar = index === 0 || messages[index - 1]?.userId !== message.userId;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  onReply={onReply}
                  onCopy={() => {}}
                  onReplyPrivately={onReplyPrivately}
                  isDM={isDM}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}

        <TypingIndicator typingUsers={typingUsers} />
      </div>
    </div>
  );
}
