"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";

import { useAuth } from "./auth-context";

interface SocketContextType {
  isConnected: boolean;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  joinProject: () => {},
  leaveProject: () => {},
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";
    const socketInstance = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = socketInstance;

    socketInstance.on("connect", () => {
      setIsConnected(true);
      socketInstance.emit("join:user", { userId: user.id });
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("notification:new", () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    });

    socketInstance.on("task:updated", () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["task"] });
      void queryClient.invalidateQueries({ queryKey: ["sprints"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    });

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [user, queryClient]);

  const joinProject = useCallback((projectId: string) => {
    if (socketRef.current && projectId) {
      socketRef.current.emit("join:project", { projectId });
    }
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    if (socketRef.current && projectId) {
      socketRef.current.emit("leave:project", { projectId });
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        joinProject,
        leaveProject,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
