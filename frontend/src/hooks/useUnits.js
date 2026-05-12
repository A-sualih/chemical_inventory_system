/**
 * useUnits — gives any component access to the global measurement settings.
 *
 * Returns:
 *   units       — { volume: 'L', weight: 'kg', temperature: 'C' }
 *   formatUnit  — (value, type) => "50 L" | "10 kg" | "25 °C"
 *   unitLabel   — (symbol) => display label, e.g. 'C' → '°C'
 *   volumeUnit  — shorthand for units.volume
 *   weightUnit  — shorthand for units.weight
 *   tempUnit    — shorthand for units.temperature display label e.g. '°C'
 */
import { useSettings, getUnitLabel } from '../context/SettingsContext';

const useUnits = () => {
  const { units, formatUnit } = useSettings();

  return {
    units,
    formatUnit,
    unitLabel: getUnitLabel,
    volumeUnit: units?.volume ?? 'L',
    weightUnit: units?.weight ?? 'kg',
    tempUnit:   getUnitLabel(units?.temperature ?? 'C'),
  };
};

export default useUnits;
