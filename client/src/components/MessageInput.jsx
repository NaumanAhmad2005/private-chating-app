import React, { useState, useRef, useEffect } from 'react';

export function MessageInput({ onSend, placeholder = 'Type a message...', isDM = false, replyTo = null, onCancelReply = null }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastEmitRef = useRef(null);

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim(), replyTo);
      setText('');
      if (onCancelReply) onCancelReply();
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && replyTo && onCancelReply) {
      onCancelReply();
    }
  };

  const handleTyping = () => {
    if (lastEmitRef.current !== 'start') {
      lastEmitRef.current = 'start';
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      lastEmitRef.current = null;
    }, 1000);
  };

  // Focus input when reply is set
  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-chat-surface border-t border-chat-border flex-shrink-0">
      {/* Reply Preview Bar */}
      {replyTo && (
        <div className="flex items-center gap-3 px-4 pt-3 pb-1">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-chat-bg rounded-xl min-w-0"
               style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--chat-primary)', borderLeftStyle: 'solid' }}>
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--chat-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium block truncate" style={{ color: 'var(--chat-primary)' }}>
                Replying to {replyTo.username}
              </span>
              <span className="text-xs block truncate" style={{ color: 'var(--chat-text-muted)' }}>
                {replyTo.text.length > 80 ? replyTo.text.slice(0, 80) + '…' : replyTo.text}
              </span>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1.5 hover:bg-chat-bg rounded-full transition-colors flex-shrink-0"
            style={{ color: 'var(--chat-text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-3 p-4">
        {/* Input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? `Reply to ${replyTo.username}...` : placeholder}
            rows={1}
            className="w-full px-4 py-3 bg-chat-bg border border-chat-border rounded-2xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-chat-primary resize-none scrollbar-hide"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            text.trim()
              ? 'bg-chat-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 transform hover:scale-105'
              : 'bg-chat-border text-gray-500 cursor-not-allowed'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
