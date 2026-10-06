import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: ThemeChoice;
  resolved: 'light' | 'dark';
  setTheme: (t: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'habitgo.theme';

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children, initial = 'system' }: { children: React.ReactNode; initial?: ThemeChoice }) {
  const [theme, setThemeState] = useState<ThemeChoice>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
    return saved || initial;
  });
  const [resolved, setResolved] = useState<'light' | 'dark'>(theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme);

  useEffect(() => {
    const apply = () => {
      const r = theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;
      setResolved(r);
      document.documentElement.dataset.theme = r;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', r === 'dark' ? '#0D1210' : '#22C55E');
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => theme === 'system' && apply();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((t: ThemeChoice) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
