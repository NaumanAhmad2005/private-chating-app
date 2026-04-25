import React, { useState, useRef, useEffect } from 'react';

// Common emoji categories for the picker
const EMOJI_GROUPS = [
  {
    label: '😊 Smileys',
    emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶'],
  },
  {
    label: '👋 Gestures',
    emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏'],
  },
  {
    label: '❤️ Hearts',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','✡️','🔯'],
  },
  {
    label: '🎉 Celebration',
    emojis: ['🎉','🎊','🎈','🎁','🎀','🪄','🎭','🎨','🖼️','🎬','🎤','🎧','🎵','🎶','🎷','🎸','🥁','🎹','🎺','🎻','🪕','🎮','🕹️','🎲'],
  },
  {
    label: '🐶 Animals',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄'],
  },
  {
    label: '🍕 Food',
    emojis: ['🍕','🍔','🌮','🌯','🥗','🥘','🍜','🍱','🍣','🍩','🍪','🎂','🍰','🍫','🍬','🍭','🍦','🧁','🥧','🍡','🧋','☕','🍵','🧃','🥤','🍺','🍻','🥂','🍷','🥃'],
  },
];

export function MessageInput({ onSend, placeholder = 'Type a message...', isDM = false, replyTo = null, onCancelReply = null }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const inputRef = useRef(null);
  const emojiRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastEmitRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleSend = () => {
    if (text.trim() || selectedImage) {
      onSend(text.trim(), replyTo, selectedImage);
      setText('');
      setSelectedImage(null);
      if (onCancelReply) onCancelReply();
      setShowEmoji(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      if (showEmoji) { setShowEmoji(false); return; }
      if (selectedImage) { setSelectedImage(null); return; }
      if (replyTo && onCancelReply) onCancelReply();
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

  const insertEmoji = (emoji) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    // Restore cursor after emoji
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

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
    <div className="bg-chat-surface border-t border-chat-border flex-shrink-0 relative">
      {/* Image Preview Bar */}
      {selectedImage && (
        <div className="flex items-center gap-3 px-4 pt-3 pb-1">
          <div className="relative">
            <img src={selectedImage} alt="Selected" className="h-20 w-20 object-cover rounded-xl border border-chat-border" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
              title="Remove image"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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

      {/* Emoji Picker — desktop only (hidden on mobile, mobile has system keyboard) */}
      {showEmoji && (
        <div
          ref={emojiRef}
          className="absolute bottom-full mb-2 left-2 right-2 sm:left-auto sm:right-auto sm:w-80 bg-chat-surface border border-chat-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ maxHeight: '320px' }}
        >
          {/* Category Tabs */}
          <div className="flex overflow-x-auto scrollbar-hide border-b border-chat-border">
            {EMOJI_GROUPS.map((group, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`flex-shrink-0 px-3 py-2 text-sm transition-colors ${
                  activeTab === i
                    ? 'border-b-2 border-chat-primary text-chat-primary'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title={group.label}
              >
                {group.label.split(' ')[0]}
              </button>
            ))}
          </div>
          {/* Emoji Grid */}
          <div className="p-3 overflow-y-auto" style={{ maxHeight: '240px' }}>
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJI_GROUPS[activeTab].emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="text-xl p-1.5 hover:bg-chat-bg rounded-lg transition-colors leading-none"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2 sm:gap-3 p-3 sm:p-4">
        {/* Attachment Button */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 bg-chat-bg border border-chat-border hover:border-chat-primary text-chat-primary"
          title="Attach Image"
          aria-label="Attach an image"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Emoji Button — desktop only */}
        <button
          onClick={() => setShowEmoji(prev => !prev)}
          className={`hidden sm:flex flex-shrink-0 w-12 h-12 rounded-full items-center justify-center transition-all duration-200 ${
            showEmoji
              ? 'bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-400/20'
              : 'bg-chat-bg border border-chat-border hover:border-yellow-400/50 text-yellow-500'
          }`}
          title="Emoji"
          aria-label="Open emoji picker"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 13.5s1.5 2 4 2 4-2 4-2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="9.5" r="1.5" fill="currentColor" />
            <circle cx="15" cy="9.5" r="1.5" fill="currentColor" />
          </svg>
        </button>

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
          disabled={!text.trim() && !selectedImage}
          className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            text.trim() || selectedImage
              ? 'bg-chat-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 transform hover:scale-105'
              : 'bg-chat-border text-gray-500 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}

