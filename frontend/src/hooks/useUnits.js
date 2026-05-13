
import { useSettings, getUnitLabel } from '../context/SettingsContext';

const useUnits = () => {
  const { units, formatUnit } = useSettings();

  return {
    units,
    formatUnit,
    unitLabel: getUnitLabel,
    volumeUnit: units?.volume ?? 'L',
    weightUnit: units?.weight ?? 'kg',
    tempUnit: getUnitLabel(units?.temperature ?? 'C'),
  };
};

export default useUnits;
