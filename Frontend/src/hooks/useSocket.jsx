// src/hooks/useSocket.js
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const useSocket = (token, roomCode) => {
  const socket = useRef(null);

  useEffect(() => {
    if (!token || !roomCode) return;

    socket.current = io('http://localhost:5000', {
      auth: { token },
      query: { roomCode },
    });

    socket.current.on('connect', () => {
      console.log('Socket connected:', socket.current.id);
    });

    socket.current.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      socket.current.disconnect();
    };
  }, [token, roomCode]);

  return socket.current;
};

export default useSocket;
