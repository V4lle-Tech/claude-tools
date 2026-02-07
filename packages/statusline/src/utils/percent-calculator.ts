/**
 * Utility functions for safe percentage calculations.
 */

/**
 * Calculate percentage safely, avoiding division by zero.
 *
 * @param value - Current value
 * @param total - Total value
 * @param decimals - Number of decimal places (default: 0)
 * @returns Percentage value (0-100)
 */
export function calculatePercentage(value: number, total: number, decimals: number = 0): number {
  if (total === 0) {
    return 0;
  }

  const percentage = (value / total) * 100;
  return Number(percentage.toFixed(decimals));
}

/**
 * Clamp a value between min and max.
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round to specified decimal places.
 *
 * @param value - Value to round
 * @param decimals - Number of decimal places
 * @returns Rounded value
 */
export function roundTo(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}
