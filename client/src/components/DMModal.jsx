import React from 'react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';

export function DMModal({ isOpen, targetUser, messages, typingUsers, currentUser, onSend, onClose }) {
  const messagesEndRef = React.useRef(null);
  const [replyTo, setReplyTo] = React.useState(null);
  const [showE2EEDetails, setShowE2EEDetails] = React.useState(false);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear reply when modal closes
  React.useEffect(() => {
    if (!isOpen) setReplyTo(null);
  }, [isOpen]);

  if (!isOpen || !targetUser) return null;

  const handleSend = (text, reply, image) => {
    onSend(text, reply, image);
    setReplyTo(null);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col sm:items-center sm:justify-center bg-black/60 backdrop-blur-sm animate-fade-in" style={{ height: 'var(--viewport-height, 100dvh)' }}>
      <div className="w-full h-full sm:h-auto sm:max-w-lg sm:mx-4 bg-chat-surface sm:rounded-3xl border-0 sm:border border-chat-border shadow-2xl animate-slide-up flex flex-col sm:max-h-[600px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-chat-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={targetUser.avatar}
              alt={targetUser.username}
              className="w-10 h-10 rounded-full bg-chat-border"
            />
            <div>
              <h3 className="text-white font-semibold">{targetUser.username}</h3>
              {targetUser.isOnline !== false ? (
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Online
                </p>
              ) : (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                  Offline (chat persists)
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-chat-bg rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          <div className="flex flex-col items-center my-2 opacity-90 animate-fade-in">
            <button
              onClick={() => setShowE2EEDetails(!showE2EEDetails)}
              onMouseEnter={() => setShowE2EEDetails(true)}
              onMouseLeave={() => setShowE2EEDetails(false)}
              className="bg-chat-surface hover:bg-chat-surface/80 text-xs px-3 sm:px-4 py-2 rounded-2xl flex items-center gap-2 text-center max-w-[280px] sm:max-w-sm border border-chat-border transition-all cursor-pointer"
              style={{ color: 'var(--chat-text)' }}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <p className="text-left select-none transition-all duration-200">
                {showE2EEDetails 
                  ? "Messages are end-to-end encrypted with AES-128. No one outside of this chat, not even the server, can read them."
                  : "End-to-End encrypted with AES."}
              </p>
            </button>
          </div>

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">Start a private conversation</p>
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
                    onReply={(msg) => setReplyTo(msg)}
                    onCopy={() => {}}
                    isDM={true}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* Typing Indicator */}
          <TypingIndicator typingUsers={typingUsers} />
        </div>

        {/* Input */}
        <MessageInput
          onSend={handleSend}
          placeholder="Message..."
          isDM
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
}
