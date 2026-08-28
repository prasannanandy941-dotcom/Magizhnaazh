import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from './api';
import type { User } from './types';

const TOKEN_KEY = 'magizhnaazh_token';
const USER_KEY = 'magizhnaazh_user';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean; // still restoring the persisted session
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; phone?: string; password: string; otp: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore any saved session on first launch.
  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (t && u) {
          setToken(t);
          setUser(JSON.parse(u));
        }
      } catch {
        /* ignore corrupt storage */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (u: User, t: string) => {
    setUser(u);
    setToken(t);
    await AsyncStorage.multiSet([[TOKEN_KEY, t], [USER_KEY, JSON.stringify(u)]]);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, token: t } = await api.login(email, password);
    await persist(u, t);
  }, [persist]);

  const register = useCallback(async (input: { name: string; email: string; phone?: string; password: string; otp: string }) => {
    const { user: u, token: t } = await api.register(input);
    await persist(u, t);
  }, [persist]);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
