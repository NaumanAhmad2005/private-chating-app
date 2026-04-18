# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Anonymous ephemeral chat web application with real-time messaging via Socket.io. All data exists only in RAM and is lost on server restart.

## Commands

```bash
# Install dependencies (from root)
npm install

# Run both client and server concurrently (from root)
npm run dev

# Run server only (port 3001)
npm run dev:server

# Run client only (port 3000, proxies /socket.io to server)
npm run dev:client

# Build client for production
npm run build

# Start production server
npm run start
```

## Architecture

**Monorepo structure** with npm workspaces:
- `client/` - React 18 + Vite frontend with TailwindCSS
- `server/` - Express + Socket.io backend

**Data flow:**
- Client connects to Socket.io server via `useSocket` hook (client/src/hooks/useSocket.js)
- All chat state managed in `ChatContext` (client/src/context/ChatContext.jsx)
- Server uses in-memory store (`server/src/store/inMemoryStore.js`) for ephemeral data
- Socket event handlers defined in `server/src/socket/handlers.js`

**Key Socket events** (`server/src/socket/events.js`):
- `user:join` / `user:joined` - User joins chat
- `message:send` / `message:new` - Global chat messages
- `dm:create` / `dm:created` / `dm:send` / `dm:received` - Direct messaging
- `typing:start` / `typing:update` - Typing indicators

**Server features:**
- Rate limiting: 10 messages per minute per user
- XSS protection via `xss-clean`
- Auto-cleanup of expired DMs (10 minutes) and disconnected users
- Global messages capped at 100, DM messages capped at 50 per room

**Client structure:**
- `App.jsx` - Main component with socket event handlers
- `components/` - UI: ChatPanel, MessageInput, MessageBubble, UsersSidebar, TypingIndicator, DMModal, RulesModal
- First-time users see RulesModal; acceptance stored in localStorage

## Environment

Server reads `PORT` and `NODE_ENV` from environment (via dotenv). Default port is 3001.
