import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

export function ChatPanel({ title, messages, typingUsers, currentUser, targetUser, onReply, onReplyPrivately, isDark, onToggleTheme }) {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isDM = !!targetUser;

  return (
    <div className="flex-1 flex flex-col bg-chat-bg min-w-0 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-chat-surface border-b border-chat-border flex-shrink-0">
        {targetUser && (
          <img
            src={targetUser.avatar}
            alt={targetUser.username}
            className="w-10 h-10 rounded-full bg-chat-border"
          />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate" style={{ color: 'var(--chat-text)' }}>
            {title}
          </h2>
          {isDM && (
            <p className="text-sm" style={{ color: 'var(--chat-text-muted)' }}>
              {targetUser.username}
            </p>
          )}
        </div>

        {/* Theme Toggle */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-chat-border bg-chat-bg hover:border-chat-primary transition-all duration-200 flex-shrink-0"
            style={{ color: 'var(--chat-text-muted)' }}
          >
            {isDark ? (
              /* Sun icon for "switch to light" */
              <>
                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M5.64 18.36l-.71.71m12.02 0-.71-.71M6.34 5.64l-.71-.71M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
                <span className="text-xs font-medium text-yellow-400 hidden sm:inline">Light</span>
              </>
            ) : (
              /* Moon icon for "switch to dark" */
              <>
                <svg className="w-4 h-4" style={{ color: 'var(--chat-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
                <span className="text-xs font-medium hidden sm:inline" style={{ color: 'var(--chat-primary)' }}>Dark</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--chat-text-muted)' }}>
            <svg className="w-16 h-16 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Typing Indicator */}
        <TypingIndicator typingUsers={typingUsers} />
      </div>
    </div>
  );
}
