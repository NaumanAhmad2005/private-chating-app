import React from 'react';

export function TypingIndicator({ typingUsers }) {
  const typingArray = Object.values(typingUsers).filter(u => u.isTyping);

  if (typingArray.length === 0) return null;

  const usernames = typingArray.map(u => u.username);

  let text = '';
  if (usernames.length === 1) {
    text = `${usernames[0]} is typing...`;
  } else if (usernames.length === 2) {
    text = `${usernames[0]} and ${usernames[1]} are typing...`;
  } else {
    text = `${usernames[0]} and ${usernames.length - 1} others are typing...`;
  }

  return (
    <div className="flex items-center gap-2 text-gray-400 text-sm animate-slide-up">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse-dot" style={{ animationDelay: '0ms' }}></span>
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse-dot" style={{ animationDelay: '150ms' }}></span>
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse-dot" style={{ animationDelay: '300ms' }}></span>
      </div>
      <span>{text}</span>
    </div>
  );
}
