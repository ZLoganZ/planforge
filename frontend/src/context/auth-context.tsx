"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import { authApi } from "@/lib/api";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: (customCallbackUrl?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setIsLoading(false);
        return;
      }
      const { data } = await authApi.getProfile();
      setUser(data.data || data);
    } catch {
      localStorage.removeItem("accessToken");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    queryClient.clear();
    const { data } = await authApi.login({ email, password });
    const result = data.data || data;
    localStorage.setItem("accessToken", result.accessToken);
    setUser(result.user);
  };

  const register = async (registerData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    await authApi.register(registerData);
  };

  const logout = async (customCallbackUrl?: string) => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors during logout
    } finally {
      queryClient.clear();
      localStorage.removeItem("accessToken");
      setUser(null);
      if (typeof window !== "undefined") {
        const fullPath =
          customCallbackUrl ??
          window.location.pathname + window.location.search;
        const callbackParam =
          fullPath && fullPath !== "/login" && fullPath !== "/register"
            ? `?callbackUrl=${encodeURIComponent(fullPath)}`
            : "";
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `/login${callbackParam}`;
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
