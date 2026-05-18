/**
 * Smart quantity formatter — preserves the original unit but displays enough decimal
 * places for small values (e.g. 0.013 L shows as "0.013 L" instead of "0.0 L").
 *
 * @param {number} value  - The raw quantity value
 * @param {string} unit   - The stored unit (e.g. 'L', 'mL', 'kg', 'g')
 * @returns {{ value: number, unit: string }} - Formatted value and unit
 */
export function formatQuantity(value, unit) {
  const num = Number(value);
  if (isNaN(num)) return { value: '—', unit: unit || '' };

  // Smart precision for the original unit:
  // If it's a very small number, show more decimal places so it's not rounded to 0.
  const precision = num === 0 ? 0 : num < 0.01 ? 4 : num < 1 ? 3 : num < 10 ? 2 : 1;
  
  // parseFloat strips trailing zeros, e.g. 0.0130 -> 0.013
  const formatted = parseFloat(num.toFixed(precision));
  return { value: formatted, unit: unit || '' };
}

/**
 * Convenience — returns a single display string: "0.013 L", "5.2 kg", etc.
 */
export function fmtQty(value, unit) {
  const { value: v, unit: u } = formatQuantity(value, unit);
  return `${v} ${u}`.trim();
}
