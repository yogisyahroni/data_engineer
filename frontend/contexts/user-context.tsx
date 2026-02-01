'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type User } from '@/lib/types';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, name: string, password: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dev Auth: Auto-login as user_123
  useEffect(() => {
    const fetchDevUser = async () => {
      try {
        const res = await fetch('/api/user/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            console.log('[UserContext] Dev Auth successful:', data.user.email);
          }
        }
      } catch (err) {
        console.error('[UserContext] Dev Auth failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDevUser();
  }, []);

  const login = async (email: string, password: string) => {
    console.log('[DevAuth] Login UI disabled. Auto-logged in as Developer.');
  };

  const logout = async () => {
    console.log('[DevAuth] Logout disabled for Dev Mode.');
  };

  const signup = async (email: string, name: string, password: string) => {
    console.log('[DevAuth] Signup disabled. Auto-logged in as Developer.');
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
        signup,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
