export type ThemeMode = 'paper' | 'ink';

export type ThemeColors = {
  bg: string;
  bgDeep: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accent2: string;
  danger: string;
  warn: string;
  success: string;
  btnText: string;
};

export const ink: ThemeColors = {
  bg: '#0e141b',
  bgDeep: '#090e14',
  surface: '#171e27',
  surface2: '#1e2733',
  border: 'rgba(148, 163, 184, 0.14)',
  text: '#e8eef6',
  muted: '#8b9bb0',
  accent: '#2dd4bf',
  accentSoft: 'rgba(45, 212, 191, 0.14)',
  accent2: '#7aa2ff',
  danger: '#fb7185',
  warn: '#fbbf24',
  success: '#34d399',
  btnText: '#0e141b',
};

export const paper: ThemeColors = {
  bg: '#f1f5f9',
  bgDeep: '#ffffff',
  surface: '#ffffff',
  surface2: '#f8fafc',
  border: 'rgba(15, 23, 42, 0.12)',
  text: '#0f172a',
  muted: '#64748b',
  accent: '#0f766e',
  accentSoft: 'rgba(15, 118, 110, 0.1)',
  accent2: '#1d4ed8',
  danger: '#dc2626',
  warn: '#d97706',
  success: '#059669',
  btnText: '#ffffff',
};

export const palettes = { paper, ink };

/** @deprecated Prefer useTheme().colors — kept for screens not yet migrated */
export const colors = ink;
