import React from 'react';

export function MessageBubble({ message, isOwn, showAvatar = true }) {
  const timeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <div
      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}
    >
      {/* Avatar */}
      {showAvatar && (
        <div className="flex-shrink-0">
          <img
            src={message.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${message.userId}`}
            alt={message.username}
            className="w-8 h-8 rounded-full bg-chat-surface border border-chat-border"
          />
        </div>
      )}
      {!showAvatar && <div className="w-8" />}

      {/* Message Content */}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {/* Username */}
        <span className="text-xs text-gray-400 mb-1 px-1">
          {message.username}
        </span>

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isOwn
              ? 'bg-chat-sent text-white rounded-br-md'
              : 'bg-chat-received text-gray-100 rounded-bl-md'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.text}
          </p>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-500 mt-1 px-1">
          {timeAgo(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
