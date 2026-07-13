import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ink, paper, ThemeColors, ThemeMode } from '../theme/colors';
import { storageGet, storageSet } from '../utils/storage';

const THEME_KEY = 'cims-theme';

type ThemeContextValue = {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalize(value: string | null): ThemeMode {
  if (value === 'ink' || value === 'dark') return 'ink';
  return 'paper';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('ink');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await storageGet(THEME_KEY);
      setThemeState(normalize(stored));
      setReady(true);
    })();
  }, []);

  const setTheme = useCallback(async (t: ThemeMode) => {
    setThemeState(t);
    await storageSet(THEME_KEY, t);
  }, []);

  const toggleTheme = useCallback(() => {
    void setTheme(theme === 'paper' ? 'ink' : 'paper');
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      colors: theme === 'paper' ? paper : ink,
      toggleTheme,
      setTheme,
      ready,
    }),
    [theme, toggleTheme, setTheme, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
