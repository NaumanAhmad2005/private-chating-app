import React, { useState, useRef, useEffect } from 'react';

export function MessageBubble({ message, isOwn, showAvatar = true, onReply, onCopy, onReplyPrivately, isDM = false }) {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const actionsTimeoutRef = useRef(null);
  const touchStartRef = useRef(null);
  const swipedRef = useRef(false);

  const SWIPE_THRESHOLD = 60; // px needed to trigger reply

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

  // ── Desktop hover actions ──────────────────────────
  const handleBubbleEnter = () => {
    if (actionsTimeoutRef.current) clearTimeout(actionsTimeoutRef.current);
    setShowActions(true);
  };

  const handleBubbleLeave = () => {
    actionsTimeoutRef.current = setTimeout(() => setShowActions(false), 200);
  };

  const handleActionsEnter = () => {
    if (actionsTimeoutRef.current) clearTimeout(actionsTimeoutRef.current);
  };

  const handleActionsLeave = () => {
    actionsTimeoutRef.current = setTimeout(() => setShowActions(false), 200);
  };

  // ── Touch / swipe-to-reply ─────────────────────────
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipedRef.current = false;
    setIsSwiping(false);
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // Only track horizontal swipes (allow up to 30° off-axis)
    if (Math.abs(dy) > Math.abs(dx) * 0.7) return;

    // Allow right-swipe for both own and others' messages (reply direction)
    const delta = isOwn ? -dx : dx; // own messages swipe left, others swipe right
    if (delta > 0) {
      e.preventDefault(); // prevent page scroll during horizontal swipe
      const clamped = Math.min(delta, SWIPE_THRESHOLD + 20);
      setSwipeX(isOwn ? -clamped : clamped);
      setIsSwiping(true);
    }
  };

  const handleTouchEnd = () => {
    const absX = Math.abs(swipeX);
    if (absX >= SWIPE_THRESHOLD && !swipedRef.current) {
      swipedRef.current = true;
      if (onReply) onReply(message);
      // Haptic feedback if supported
      if (navigator.vibrate) navigator.vibrate(40);
    }
    // Spring back
    setSwipeX(0);
    setIsSwiping(false);
    touchStartRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (actionsTimeoutRef.current) clearTimeout(actionsTimeoutRef.current);
    };
  }, []);

  // How far we've swiped as a 0–1 progress
  const swipeProgress = Math.min(Math.abs(swipeX) / SWIPE_THRESHOLD, 1);
  const showReplyHint = Math.abs(swipeX) > 15;

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} relative`}>

      {/* Swipe reply hint icon */}
      {showReplyHint && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity ${isOwn ? 'right-0' : 'left-0'}`}
          style={{ opacity: swipeProgress, transform: `translateY(-50%) scale(${0.7 + swipeProgress * 0.3})` }}
        >
          <div className="w-8 h-8 rounded-full bg-chat-primary/20 flex items-center justify-center">
            <svg className="w-4 h-4" style={{ color: 'var(--chat-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
        </div>
      )}

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
        <span className="text-xs mb-1 px-1" style={{ color: 'var(--chat-text-muted)' }}>
          {message.username}
        </span>

        {/* Reply Preview (if this message is a reply to another) */}
        {message.replyTo && (
          <div className={`flex items-center gap-2 mb-1 px-3 py-1.5 rounded-xl text-xs max-w-full border-l-2 ${
            isOwn ? 'border-chat-primary' : 'border-chat-border'
          }`} style={{ background: 'color-mix(in srgb, var(--chat-surface) 80%, transparent)' }}>
            <div className="min-w-0">
              <span className="font-medium block truncate" style={{ color: 'var(--chat-primary)' }}>
                {message.replyTo.username}
              </span>
              <span className="block truncate" style={{ color: 'var(--chat-text-muted)' }}>
                {message.replyTo.text.length > 60
                  ? message.replyTo.text.slice(0, 60) + '…'
                  : message.replyTo.text}
              </span>
            </div>
          </div>
        )}

        {/* Bubble — hover target (desktop) + swipe target (mobile) */}
        <div
          className="relative"
          onMouseEnter={handleBubbleEnter}
          onMouseLeave={handleBubbleLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            touchAction: 'pan-y',
          }}
        >
          <div
            className={`px-4 py-2.5 rounded-2xl select-text ${
              isOwn
                ? 'bg-chat-sent text-white rounded-br-md'
                : 'bg-chat-received rounded-bl-md'
            }`}
            style={!isOwn ? { color: 'var(--chat-text)' } : undefined}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.text}
            </p>
          </div>

          {/* Hover Actions — desktop only (appear beside the bubble) */}
          {showActions && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 items-center z-20 animate-fade-in md:flex hidden ${
                isOwn ? 'right-full mr-2' : 'left-full ml-2'
              }`}
              onMouseEnter={handleActionsEnter}
              onMouseLeave={handleActionsLeave}
            >
              <div className="flex items-center gap-0.5 bg-chat-surface border border-chat-border rounded-xl px-1 py-0.5 shadow-xl">
                {/* Reply */}
                <button
                  onClick={() => onReply && onReply(message)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-chat-bg"
                  title="Reply"
                >
                  <svg className="w-4 h-4" style={{ color: 'var(--chat-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>

                {/* Copy */}
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg transition-colors hover:bg-chat-bg"
                  title={copied ? 'Copied!' : 'Copy'}
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" style={{ color: 'var(--chat-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>

                {/* Reply Privately — global chat only, not own messages */}
                {!isDM && !isOwn && onReplyPrivately && (
                  <button
                    onClick={() => onReplyPrivately(message)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-chat-bg"
                    title="Reply Privately"
                  >
                    <svg className="w-4 h-4" style={{ color: 'var(--chat-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs mt-1 px-1" style={{ color: 'var(--chat-text-muted)' }}>
          {timeAgo(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
