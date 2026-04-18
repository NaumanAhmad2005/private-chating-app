import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import dotenv from 'dotenv';

import { setupSocketHandlers } from './socket/handlers.js';
import { store } from './store/inMemoryStore.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));
app.use(xss()); // XSS protection

// Rate limiting for HTTP requests
const limiter = rateLimit({
  windowMs: 60000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Stats endpoint (for debugging)
app.get('/stats', (req, res) => {
  res.json({
    status: 'ok',
    ...store.getStats(),
  });
});

// Initialize socket handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Anonymous Chat Server Running                        ║
║                                                           ║
║   URL: http://localhost:${PORT}                             ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║                                                           ║
║   Features:                                               ║
║   ✓ Real-time messaging via Socket.io                     ║
║   ✓ In-memory ephemeral storage                           ║
║   ✓ Auto-cleanup on disconnect                            ║
║   ✓ Rate limiting & XSS protection                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('[Server] Closed out remaining connections');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('[Server] Closed out remaining connections');
    process.exit(0);
  });
});
