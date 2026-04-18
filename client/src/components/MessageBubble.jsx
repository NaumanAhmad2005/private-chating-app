import React, { useState, useRef, useEffect } from 'react';

export function MessageBubble({ message, isOwn, showAvatar = true, onReply, onCopy, onReplyPrivately, isDM = false }) {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const actionsTimeoutRef = useRef(null);

  const timeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
    if (onCopy) onCopy(message);
  };

  const handleMouseEnter = () => {
    if (actionsTimeoutRef.current) clearTimeout(actionsTimeoutRef.current);
    setShowActions(true);
  };

  const handleMouseLeave = () => {
    actionsTimeoutRef.current = setTimeout(() => setShowActions(false), 300);
  };

  useEffect(() => {
    return () => {
      if (actionsTimeoutRef.current) clearTimeout(actionsTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`group relative flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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

        {/* Reply Preview (if this message is a reply) */}
        {message.replyTo && (
          <div className={`flex items-center gap-2 mb-1 px-3 py-1.5 rounded-xl text-xs max-w-full ${
            isOwn
              ? 'bg-blue-500/15 border-l-2 border-blue-400'
              : 'bg-white/5 border-l-2 border-gray-400'
          }`}>
            <div className="min-w-0">
              <span className="text-blue-400 font-medium block truncate">
                {message.replyTo.username}
              </span>
              <span className="text-gray-400 block truncate">
                {message.replyTo.text.length > 60
                  ? message.replyTo.text.slice(0, 60) + '...'
                  : message.replyTo.text}
              </span>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div className="relative">
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

          {/* Hover Actions */}
          {showActions && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-10 animate-fade-in ${
                isOwn ? 'right-full mr-1.5' : 'left-full ml-1.5'
              }`}
            >
              <div className="flex items-center gap-0.5 bg-chat-surface border border-chat-border rounded-xl px-1 py-0.5 shadow-lg">
                {/* Reply */}
                <button
                  onClick={() => onReply && onReply(message)}
                  className="p-1.5 hover:bg-chat-bg rounded-lg transition-colors group/btn"
                  title="Reply"
                >
                  <svg className="w-4 h-4 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>

                {/* Copy */}
                <button
                  onClick={handleCopy}
                  className="p-1.5 hover:bg-chat-bg rounded-lg transition-colors group/btn"
                  title={copied ? 'Copied!' : 'Copy'}
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>

                {/* Reply Privately (only in global chat, not in DMs, and not for own messages) */}
                {!isDM && !isOwn && onReplyPrivately && (
                  <button
                    onClick={() => onReplyPrivately(message)}
                    className="p-1.5 hover:bg-chat-bg rounded-lg transition-colors group/btn"
                    title="Reply Privately"
                  >
                    <svg className="w-4 h-4 text-gray-400 hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-500 mt-1 px-1">
          {timeAgo(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
