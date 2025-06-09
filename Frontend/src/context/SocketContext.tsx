import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from '../hooks/use-toast';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Clean up existing socket if any
    if (socket) {
      socket.close();
      setSocket(null);
      setConnected(false);
    }

    const token = localStorage.getItem("token");
    
    // Only create socket if user is authenticated and token exists
    if (!user || !token) {
      console.log("No user or token found, skipping socket connection");
      return;
    }

    console.log("Creating socket connection for authenticated user:", user.id);

    const newSocket = io(
      import.meta.env.VITE_SERVER_URL || "http://localhost:8080",
      {
        auth: { token },
      }
    );

    newSocket.on("connect", () => {
      console.log("Connected to server");
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to game server",
        variant: "destructive",
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]); // Watch for user changes

  const value: SocketContextType = {
    socket,
    connected,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
