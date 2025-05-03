"use client"
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import type { User } from '@/db/schema';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (username: string) => Promise<User>;
  logout: () => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      login(savedUsername).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string) => {
    try {
      // First try to get the user
      const response = await fetch(`/api/user?username=${encodeURIComponent(username)}`);

      if (response.ok) {
        // User exists, use it
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('username', username);
        return userData;
      } else if (response.status === 404) {
        // User doesn't exist, create it
        const createResponse = await fetch('/api/user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username }),
        });

        if (createResponse.ok) {
          const newUserData = await createResponse.json();
          setUser(newUserData);
          localStorage.setItem('username', username);
          return newUserData;
        }
        throw new Error('Failed to create user');

      } else {
        throw new Error('Failed to fetch user');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('username');
  };

  return (
    <UserContext.Provider value={{ user, setUser, login, logout, isLoading }}>
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