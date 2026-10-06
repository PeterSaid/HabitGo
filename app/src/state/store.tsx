import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, syncQueue } from '../api/client';
import type { Locale } from '../i18n';
import type { ThemeChoice } from '../theme/ThemeContext';

export type AppUser = {
  id: string;
  email: string;
  phone?: string | null;
  role: 'user' | 'admin';
  name: string;
  avatar_url?: string | null;
  timezone: string;
  xp: number;
  interests: string[];
  onboarded: boolean;
  joined_at: string;
  settings: {
    locale: Locale;
    theme: ThemeChoice;
    notifications_enabled: number;
    reminders_enabled: number;
    weekly_report: number;
  } | null;
};

export type LevelInfo = { level: number; name: string; currentLevelXp: number; nextLevelXp: number | null };

type StoreValue = {
  user: AppUser | null;
  level: LevelInfo | null;
  unread: number;
  online: boolean;
  refreshUser: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  applySession: (token: string, user: AppUser) => void;
  clearSession: () => void;
  logout: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const USER_KEY = 'habitgo.user';

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  });
  const [level, setLevel] = useState<LevelInfo | null>(null);
  const [unread, setUnread] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // cache user for instant boot
  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await api.get<{ user: AppUser; level: LevelInfo }>('/auth/me');
      setUser(res.user);
      setLevel(res.level);
    } catch {
      // token invalid -> clear session silently
      if (!getToken()) setUser(null);
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await api.get<{ notifications: unknown[]; unread: number }>('/notifications?limit=1');
      setUnread(res.unread);
    } catch {
      /* offline: keep last count */
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshUser();
      refreshUnread();
      syncQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySession = useCallback((token: string, u: AppUser) => {
    setToken(token);
    setUser(u);
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setLevel(null);
    setUnread(0);
    localStorage.removeItem(USER_KEY);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, level, unread, online, refreshUser, refreshUnread, applySession, clearSession, logout }),
    [user, level, unread, online, refreshUser, refreshUnread, applySession, clearSession, logout]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within AppStoreProvider');
  return ctx;
}
