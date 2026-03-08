import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface SocketProviderProps {
  /** JWT token for server authentication. */
  token: string | null;
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ token, children }) => {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const url = import.meta.env.VITE_API_URL || window.location.origin;

    const s = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    socketRef.current = s;

    return () => {
      s.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Access the raw Socket.IO client and connection status. */
export function useSocket() {
  return useContext(SocketContext);
}

/**
 * Subscribe to a Socket.IO event. The callback is stable — no need to memoise.
 * Automatically cleans up when the component unmounts or the event name changes.
 */
export function useSocketEvent<T = unknown>(event: string, handler: (data: T) => void) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;
    const cb = (data: T) => handlerRef.current(data);
    socket.on(event, cb as any);
    return () => { socket.off(event, cb as any); };
  }, [socket, event]);
}
