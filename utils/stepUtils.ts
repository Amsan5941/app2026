/**
 * Pure utility functions for step-related calculations.
 * Extracted from stepTracking.ts for testability (no native module deps).
 */

/**
 * Calculate estimated calories burned from steps.
 * Rough estimate: ~0.04 calories per step (average person).
 */
export function estimateCaloriesFromSteps(steps: number): number {
  return Math.round(steps * 0.04);
}

/**
 * Calculate estimated distance in miles from steps.
 * Average stride length ~2.5 feet, 5280 feet per mile.
 */
export function estimateDistanceFromSteps(steps: number): number {
  const strideLengthFeet = 2.5;
  const miles = (steps * strideLengthFeet) / 5280;
  return Math.round(miles * 100) / 100;
}

/**
 * Get day name abbreviation from ISO date string.
 */
export function getDayAbbrev(isoDate: string): string {
  const date = new Date(isoDate + "T12:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short" });
}
