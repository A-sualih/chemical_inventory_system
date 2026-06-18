import { createContext, useContext, useEffect, useState } from 'react';

/** Light = clean lab daylight · Dark = deep night lab */
const ThemeContext = createContext(null);

function normalizeTheme(value) {
  if (value === 'ink' || value === 'dark') return 'ink';
  return 'paper';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('paper');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cims-theme');
    const preferred = normalizeTheme(stored);
    setThemeState(preferred);
    document.documentElement.setAttribute('data-theme', preferred);
    setReady(true);
  }, []);

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem('cims-theme', t);
    document.documentElement.setAttribute('data-theme', t);
  };

  const toggleTheme = () => setTheme(theme === 'paper' ? 'ink' : 'paper');

  if (!ready) {
    return <div style={{ minHeight: '100vh', background: '#f4f7fb' }} />;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
