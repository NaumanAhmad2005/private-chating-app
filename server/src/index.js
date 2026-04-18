import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

import { setupSocketHandlers } from './socket/handlers.js';
import { store } from './store/inMemoryStore.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Socket.io with CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
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

// Serve static files from built client (for production)
const distPath = join(__dirname, '../../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Serve React app for all other routes (SPA fallback)
app.get('*', (req, res) => {
  const indexHtml = join(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.json({ error: 'Client not built. Run npm run build' });
  }
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
