'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'host' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check if token exists in localStorage
      const storedToken = localStorage.getItem('auth-token');
      if (storedToken) {
        setToken(storedToken);
        await verifyToken(storedToken);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      // Clear invalid token
      localStorage.removeItem('auth-token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async (tokenToVerify?: string) => {
    try {
      const authToken = tokenToVerify || token;
      if (!authToken) return;

      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(authToken);
        localStorage.setItem('auth-token', authToken);
      } else {
        // Token is invalid
        localStorage.removeItem('auth-token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('auth-token');
      setToken(null);
      setUser(null);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token and user data
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('auth-token', data.token);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, role = 'user') => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store token and user data
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('auth-token', data.token);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call logout API
      await fetch('/api/auth/logout', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local state regardless of API call result
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth-token');
      
      // Redirect to home page
      router.push('/');
    }
  };

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      token, 
      login, 
      register, 
      logout, 
      isAuthenticated 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}