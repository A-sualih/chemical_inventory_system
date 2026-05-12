import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const SettingsContext = createContext();

// Maps stored unit codes → display labels
const UNIT_LABELS = {
  // Volume
  L:  'L',
  mL: 'mL',
  gal: 'gal',
  fl_oz: 'fl oz',
  // Weight
  kg:  'kg',
  g:   'g',
  mg:  'mg',
  lb:  'lb',
  oz:  'oz',
  // Temperature
  C: '°C',
  F: '°F',
  K:  'K',
};

/**
 * Returns the display label for a unit code.
 * Falls back to the raw symbol if unknown.
 */
export const getUnitLabel = (symbol) => UNIT_LABELS[symbol] ?? symbol ?? '';

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    systemName: 'CIMS PRO',
    systemLogo: '',
    orgName: 'Managed Stack',
    defaultTheme: 'light',
    units: { volume: 'L', weight: 'kg', temperature: 'C' },
  });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get('/api/settings');
      if (res.data) {
        setSettings({
          ...res.data,
          units: res.data.units ?? { volume: 'L', weight: 'kg', temperature: 'C' },
        });
        if (res.data.systemName) document.title = res.data.systemName;
        if (res.data.favicon) {
          let link = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = res.data.favicon;
        }
      }
    } catch (err) {
      console.error('Failed to fetch global settings', err);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  /** Shorthand: units object { volume, weight, temperature } */
  const units = settings.units ?? { volume: 'L', weight: 'kg', temperature: 'C' };

  /**
   * formatUnit(value, type)
   * type: 'volume' | 'weight' | 'temperature'
   * Returns e.g. "50 L", "10 kg", "25 °C"
   */
  const formatUnit = useCallback((value, type) => {
    const symbol = units[type] ?? '';
    const label  = getUnitLabel(symbol);
    return value !== undefined && value !== null && value !== ''
      ? `${value} ${label}`
      : label;
  }, [units]);

  return (
    <SettingsContext.Provider value={{ settings, fetchSettings, units, formatUnit, getUnitLabel }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
