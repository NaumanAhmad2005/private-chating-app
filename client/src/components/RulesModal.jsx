import React from 'react';

export function RulesModal({ onAccept }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="mx-4 max-w-md w-full bg-chat-surface rounded-2xl border border-chat-border shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-chat-border">
          <h1 className="text-2xl font-bold text-white text-center">
            Welcome to Anonymous Chat
          </h1>
          <p className="text-gray-400 text-sm text-center mt-2">
            Connect freely, disappear completely
          </p>
        </div>

        {/* Rules Content */}
        <div className="p-6 space-y-4">
          <div className="bg-chat-bg rounded-xl p-4 border border-chat-border">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-chat-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Community Guidelines
            </h2>
            <ul className="space-y-3 text-gray-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-chat-primary mt-0.5">•</span>
                <span><strong>Stay anonymous</strong> - Do not share personal information about yourself or others</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-chat-primary mt-0.5">•</span>
                <span><strong>Be respectful</strong> - Treat others with kindness and respect</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-chat-primary mt-0.5">•</span>
                <span><strong>No harmful content</strong> - No abusive, harassing, or illegal content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-chat-primary mt-0.5">•</span>
                <span><strong>Zero persistence</strong> - All messages are deleted when you leave</span>
              </li>
            </ul>
          </div>

          <div className="bg-chat-bg rounded-xl p-4 border border-chat-border">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-chat-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Privacy Guarantee
            </h2>
            <p className="text-gray-300 text-sm">
              No login required. No data stored. No identity tracking.
              When you leave, everything disappears forever.
            </p>
          </div>
        </div>

        {/* Accept Button */}
        <div className="p-6 pt-0">
          <button
            onClick={onAccept}
            className="w-full py-4 px-6 bg-chat-primary hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25"
          >
            I Agree - Let's Chat
          </button>
          <p className="text-xs text-gray-500 text-center mt-3">
            By continuing, you agree to follow these guidelines
          </p>
        </div>
      </div>
    </div>
  );
}
