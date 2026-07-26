import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const SettingsContext = createContext();

const CACHE_KEY = 'cims_settings_cache';

const DEFAULT_SETTINGS = {
  systemName: 'CIMS PRO',
  systemLogo: '',
  landingHero: '',
  favicon: '',
  orgName: 'Managed Stack',
  defaultTheme: 'light',
  units: { volume: 'L', weight: 'kg', temperature: 'C' },
};

// Maps stored unit codes → display labels
const UNIT_LABELS = {
  L: 'L',
  mL: 'mL',
  gal: 'gal',
  fl_oz: 'fl oz',
  kg: 'kg',
  g: 'g',
  mg: 'mg',
  lb: 'lb',
  oz: 'oz',
  C: '°C',
  F: '°F',
  K: 'K',
};

export const getUnitLabel = (symbol) => UNIT_LABELS[symbol] ?? symbol ?? '';

function readCachedSettings() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      units: parsed.units ?? DEFAULT_SETTINGS.units,
    };
  } catch {
    return null;
  }
}

function writeCachedSettings(next) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

function applyFavicon(href) {
  if (!href || typeof document === 'undefined') return;
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  if (link.href !== href && !link.href.endsWith(href)) {
    link.href = href;
  }
}

export const SettingsProvider = ({ children }) => {
  const cached = typeof window !== 'undefined' ? readCachedSettings() : null;
  const [settings, setSettings] = useState(cached || DEFAULT_SETTINGS);
  /** false until first network fetch finishes — use cached branding meanwhile */
  const [settingsLoaded, setSettingsLoaded] = useState(Boolean(cached));

  useEffect(() => {
    if (cached?.systemName) document.title = cached.systemName;
    if (cached?.favicon) applyFavicon(cached.favicon);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get('/api/settings');
      if (res.data) {
        const next = {
          ...DEFAULT_SETTINGS,
          ...res.data,
          units: res.data.units ?? DEFAULT_SETTINGS.units,
        };
        setSettings(next);
        writeCachedSettings(next);
        if (next.systemName) document.title = next.systemName;
        if (next.favicon) applyFavicon(next.favicon);
      }
    } catch (err) {
      console.error('Failed to fetch global settings', err);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const units = settings.units ?? DEFAULT_SETTINGS.units;

  const formatUnit = useCallback(
    (value, type) => {
      const symbol = units[type] ?? '';
      const label = getUnitLabel(symbol);
      return value !== undefined && value !== null && value !== ''
        ? `${value} ${label}`
        : label;
    },
    [units]
  );

  return (
    <SettingsContext.Provider
      value={{ settings, fetchSettings, units, formatUnit, getUnitLabel, settingsLoaded }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
