/**
 * Utility functions for converting height between different formats
 */

/**
 * Convert feet and inches to total inches
 * @param feet - Number of feet
 * @param inches - Number of inches (0-11)
 * @returns Total inches
 */
export function feetInchesToInches(feet: number, inches: number = 0): number {
  return feet * 12 + inches;
}

/**
 * Convert total inches to feet and inches
 * @param totalInches - Total height in inches
 * @returns Object with feet and inches
 */
export function inchesToFeetInches(totalInches: number): { feet: number; inches: number } {
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { feet, inches };
}

/**
 * Convert inches to centimeters
 * @param inches - Height in inches
 * @returns Height in centimeters
 */
export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54);
}

/**
 * Convert centimeters to inches
 * @param cm - Height in centimeters
 * @returns Height in inches
 */
export function cmToInches(cm: number): number {
  return Math.round(cm / 2.54);
}

/**
 * Format height for display
 * @param totalInches - Height in inches
 * @returns Formatted string like "5'10\"" or "178 cm"
 */
export function formatHeight(totalInches: number, unit: 'imperial' | 'metric' = 'imperial'): string {
  if (unit === 'metric') {
    return `${inchesToCm(totalInches)} cm`;
  }
  
  const { feet, inches } = inchesToFeetInches(totalInches);
  return `${feet}'${inches}"`;
}
