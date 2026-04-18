import React, { useState, useRef, useEffect } from 'react';

export function MessageInput({ onSend, placeholder = 'Type a message...', isDM = false }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastEmitRef = useRef(null);

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    // Emit typing start once
    if (lastEmitRef.current !== 'start') {
      // Would call onTypingStart here if passed as prop
      lastEmitRef.current = 'start';
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to emit typing stop
    typingTimeoutRef.current = setTimeout(() => {
      // Would call onTypingStop here if passed as prop
      lastEmitRef.current = null;
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-end gap-3 p-4 bg-chat-surface border-t border-chat-border">
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
          placeholder={placeholder}
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
  );
}
