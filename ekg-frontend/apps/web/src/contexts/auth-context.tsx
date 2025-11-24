'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { apiPost, apiGet } from '@/lib/api-client';

interface User {
  email: string;
  username?: string;  // Keep for backward compat
  hoTen: string;
  role: 'ADMIN' | 'VIEWER';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile on mount (cookie will be sent automatically)
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const userData = await apiGet<User>('/auth/profile');
      setUser(userData);
    } catch (error) {
      // Expected: user not logged in or token expired
      // Don't log 401 errors as they're normal behavior
      if (error instanceof Error && !error.message.includes('401')) {
        console.log('Auth check failed:', error.message);
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiPost<{ user: User }>('/auth/login', {
      email,
      password,
    });
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await apiPost('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  // Auto-refresh when access token expires (every 14 minutes, before 15 min expiry)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        await apiPost('/auth/refresh');
      } catch (error) {
        // Refresh failed, logout
        setUser(null);
      }
    }, 14 * 60 * 1000); // 14 minutes

    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
