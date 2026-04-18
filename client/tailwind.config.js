/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme defaults (static values, required by Tailwind v3)
        'chat-bg':       '#0f0f0f',
        'chat-surface':  '#1a1a1a',
        'chat-border':   '#2a2a2a',
        'chat-primary':  '#0095f6',
        'chat-sent':     '#3797f0',
        'chat-received': '#262626',
      },
    },
  },
  plugins: [],
}
