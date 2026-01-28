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

// Mock user for demo
const DEMO_USER: User = {
  id: 'user_demo_123',
  email: 'demo@insightengine.ai',
  name: 'Demo User',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading user from localStorage or API
    const timer = setTimeout(() => {
      const savedUser = localStorage.getItem('insightengine_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          // Invalid JSON, skip
        }
      } else {
        // Set demo user for demo purposes
        setUser(DEMO_USER);
        localStorage.setItem('insightengine_user', JSON.stringify(DEMO_USER));
      }
      setIsLoading(false);
      console.log('[v0] User context initialized');
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement actual login API call
      const newUser: User = {
        id: `user_${Date.now()}`,
        email,
        name: email.split('@')[0],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setUser(newUser);
      localStorage.setItem('insightengine_user', JSON.stringify(newUser));
      console.log('[v0] User logged in:', email);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual logout API call
      setUser(null);
      localStorage.removeItem('insightengine_user');
      console.log('[v0] User logged out');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, name: string, password: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement actual signup API call
      const newUser: User = {
        id: `user_${Date.now()}`,
        email,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setUser(newUser);
      localStorage.setItem('insightengine_user', JSON.stringify(newUser));
      console.log('[v0] User signed up:', email);
    } finally {
      setIsLoading(false);
    }
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
