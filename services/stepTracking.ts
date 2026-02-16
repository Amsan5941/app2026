/**
 * Step Tracking Service
 *
 * Uses expo-sensors Pedometer to read step data.
 * - iOS: Reads from CoreMotion (Apple Health step data)
 * - Android: Uses device step counter sensor
 *
 * Provides functions to:
 * - Check pedometer availability
 * - Get step count for a date range
 * - Subscribe to live step updates
 * - Get weekly step history
 */

import { Pedometer } from "expo-sensors";

export type StepData = {
  steps: number;
  date: string; // ISO date string (YYYY-MM-DD)
};

export type WeeklySteps = StepData[];

/**
 * Check if the pedometer is available on this device
 */
export async function isPedometerAvailable(): Promise<boolean> {
  try {
    return await Pedometer.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Request pedometer permissions
 */
export async function requestPedometerPermissions(): Promise<boolean> {
  try {
    const { granted } = await Pedometer.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/**
 * Check current pedometer permission status
 */
export async function getPedometerPermissions(): Promise<boolean> {
  try {
    const { granted } = await Pedometer.getPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/**
 * Get the start of a given day (midnight)
 */
function getStartOfDay(date: Date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Get the end of a given day (23:59:59.999)
 */
function getEndOfDay(date: Date = new Date()): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Get step count for today
 */
export async function getTodaySteps(): Promise<number> {
  try {
    const start = getStartOfDay();
    const end = new Date();
    const result = await Pedometer.getStepCountAsync(start, end);
    return result.steps;
  } catch (error) {
    console.warn("Failed to get today's steps:", error);
    return 0;
  }
}

/**
 * Get step count for a specific date
 */
export async function getStepsForDate(date: Date): Promise<number> {
  try {
    const start = getStartOfDay(date);
    const end = getEndOfDay(date);
    const result = await Pedometer.getStepCountAsync(start, end);
    return result.steps;
  } catch (error) {
    console.warn("Failed to get steps for date:", error);
    return 0;
  }
}

/**
 * Get step counts for the last N days (including today)
 */
export async function getWeeklySteps(days: number = 7): Promise<WeeklySteps> {
  const results: WeeklySteps = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const steps = await getStepsForDate(date);
    results.push({
      steps,
      date: date.toISOString().split("T")[0],
    });
  }

  return results;
}

/**
 * Subscribe to live pedometer updates (steps since subscription start).
 * Returns an unsubscribe function.
 */
export function subscribeToPedometer(
  callback: (steps: number) => void
): { remove: () => void } {
  return Pedometer.watchStepCount((result) => {
    callback(result.steps);
  });
}

/**
 * Format step count with commas (e.g., 10,234)
 */
export function formatSteps(steps: number): string {
  return steps.toLocaleString();
}

/**
 * Calculate estimated calories burned from steps
 * Rough estimate: ~0.04 calories per step (average person)
 */
export function estimateCaloriesFromSteps(steps: number): number {
  return Math.round(steps * 0.04);
}

/**
 * Calculate estimated distance in miles from steps
 * Average stride length ~2.5 feet, 5280 feet per mile
 */
export function estimateDistanceFromSteps(steps: number): number {
  const strideLengthFeet = 2.5;
  const miles = (steps * strideLengthFeet) / 5280;
  return Math.round(miles * 100) / 100;
}

/**
 * Get day name abbreviation from ISO date string
 */
export function getDayAbbrev(isoDate: string): string {
  const date = new Date(isoDate + "T12:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short" });
}
