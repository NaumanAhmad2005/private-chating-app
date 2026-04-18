import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

export function ChatPanel({ title, messages, typingUsers, currentUser, targetUser }) {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isDM = !!targetUser;

  return (
    <div className="flex-1 flex flex-col bg-chat-bg min-w-0">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-chat-surface border-b border-chat-border">
        {targetUser && (
          <img
            src={targetUser.avatar}
            alt={targetUser.username}
            className="w-10 h-10 rounded-full bg-chat-border"
          />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white truncate">
            {title}
          </h2>
          {isDM && (
            <p className="text-sm text-gray-400">
              {targetUser.username}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Be the first to say hello!</p>
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
