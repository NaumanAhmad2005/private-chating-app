import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:3001';

export function useSocket(handlers = {}) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Update handlers ref when handlers change
  handlersRef.current = handlers;

  useEffect(() => {
    setConnectionError(null);

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    // Set up event listeners
    Object.entries(handlersRef.current).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[Socket] Connected to server:', socket.id);
      setConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setConnectionError(error.message);
      setConnected(false);
    });

    socket.on('connect_failed', () => {
      console.error('[Socket] Connection failed');
      setConnectionError('Connection failed');
      setConnected(false);
    });

    // Cleanup on unmount
    return () => {
      console.log('[Socket] Cleaning up socket connection');

      // Remove all listeners
      Object.entries(handlersRef.current).forEach(([event, handler]) => {
        socket.off(event, handler);
      });

      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('connect_failed');

      // Disconnect socket
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Emit helper
  const emit = useCallback((event, data, callback) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data, callback);
    } else {
      console.warn('[Socket] Not connected, cannot emit:', event);
    }
  }, []);

  return {
    socket: socketRef.current,
    emit,
    connected,
    connectionError,
  };
}
