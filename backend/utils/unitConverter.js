/**
 * Unit conversion utility for chemical inventory.
 * Base units: 'g' for mass, 'ml' for volume.
 */

const CONVERSION_RATES = {
  // Mass to grams
  'kg': 1000,
  'g': 1,
  'mg': 0.001,
  'mcg': 0.000001,
  
  // Volume to milliliters
  'L': 1000,
  'ml': 1,
  'ul': 0.001,
  'nl': 0.000001
};

/**
 * Converts a quantity from a given unit to its base unit (g or ml).
 * @param {number} value 
 * @param {string} unit 
 * @returns {number} Value in base units
 */
function convertToBase(value, unit) {
  const rate = CONVERSION_RATES[unit];
  if (rate === undefined) return value; // Fallback if unit not recognized
  return value * rate;
}

/**
 * Converts a value from a base unit to a target unit.
 * @param {number} valueInBase 
 * @param {string} targetUnit 
 * @returns {number} Value in target units
 */
function convertFromBase(valueInBase, targetUnit) {
  const rate = CONVERSION_RATES[targetUnit];
  if (!rate) return valueInBase;
  return valueInBase / rate;
}

/**
 * Determines the base unit for a given unit.
 */
function getBaseUnit(unit) {
  if (['kg', 'g', 'mg', 'mcg'].includes(unit)) return 'g';
  if (['L', 'ml', 'ul', 'nl'].includes(unit)) return 'ml';
  return unit;
}

module.exports = {
  convertToBase,
  convertFromBase,
  getBaseUnit,
  CONVERSION_RATES
};
