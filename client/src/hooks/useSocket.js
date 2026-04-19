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

  // Always keep handlersRef up to date with the latest handlers
  // This is the key: we use the ref inside the stable listener wrappers,
  // so we never need to re-register socket listeners when handlers change.
  handlersRef.current = handlers;

  // Track which events we've registered stable listeners for
  const registeredEventsRef = useRef(new Set());

  useEffect(() => {
    setConnectionError(null);

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: false,
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    // Create STABLE wrapper listeners that delegate to the latest handler via ref.
    // These never change, so we never accumulate duplicate listeners.
    const eventNames = Object.keys(handlers);
    const wrappers = {};

    eventNames.forEach(event => {
      wrappers[event] = (...args) => {
        if (handlersRef.current[event]) {
          handlersRef.current[event](...args);
        }
      };
      socket.on(event, wrappers[event]);
      registeredEventsRef.current.add(event);
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

      // Remove all wrapper listeners
      Object.entries(wrappers).forEach(([event, wrapper]) => {
        socket.off(event, wrapper);
      });

      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('connect_failed');

      // Disconnect socket
      socket.disconnect();
      socketRef.current = null;
      registeredEventsRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
