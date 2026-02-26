import AsyncStorage from "@react-native-async-storage/async-storage";

const WATER_KEY_PREFIX = "water_intake_";
const REMINDER_COOLDOWN_KEY = "water_reminder_last_shown";

/** Daily water goal in glasses (8 oz each) */
export const DAILY_WATER_GOAL = 8;

function getTodayKey(): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${WATER_KEY_PREFIX}${today}`;
}

/** Get today's water intake (number of glasses) */
export async function getTodayWaterIntake(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(getTodayKey());
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

/** Log one glass of water */
export async function logWaterGlass(): Promise<number> {
  const current = await getTodayWaterIntake();
  const updated = Math.min(current + 1, DAILY_WATER_GOAL);
  await AsyncStorage.setItem(getTodayKey(), String(updated));
  return updated;
}

/** Remove one glass of water (undo) */
export async function removeWaterGlass(): Promise<number> {
  const current = await getTodayWaterIntake();
  const updated = Math.max(0, current - 1);
  await AsyncStorage.setItem(getTodayKey(), String(updated));
  return updated;
}

/** Set water intake to a specific count */
export async function setWaterIntake(count: number): Promise<void> {
  const clamped = Math.min(Math.max(0, count), DAILY_WATER_GOAL);
  await AsyncStorage.setItem(getTodayKey(), String(clamped));
}

/**
 * Check if we should show the water reminder.
 * Returns true if at least 30 minutes have passed since the last reminder.
 */
export async function shouldShowWaterReminder(): Promise<boolean> {
  try {
    const lastShown = await AsyncStorage.getItem(REMINDER_COOLDOWN_KEY);
    if (!lastShown) return true;

    const elapsed = Date.now() - parseInt(lastShown, 10);
    const THIRTY_MINUTES = 30 * 60 * 1000;
    return elapsed >= THIRTY_MINUTES;
  } catch {
    return true;
  }
}

/** Mark that we just showed the water reminder */
export async function markWaterReminderShown(): Promise<void> {
  await AsyncStorage.setItem(REMINDER_COOLDOWN_KEY, String(Date.now()));
}

/** Hydration tip messages (rotated randomly) */
export const WATER_TIPS = [
  "Stay hydrated! Water boosts energy and focus.",
  "Drink up! Hydration improves workout performance.",
  "Time for water! Your muscles are 75% water.",
  "Hydration check! Even mild dehydration hurts performance.",
  "Water break! Staying hydrated helps burn more calories.",
  "Don't forget to drink water! It aids muscle recovery.",
  "Hydrate! Water helps transport nutrients to your muscles.",
  "Sip some water! Proper hydration reduces fatigue.",
  "Water time! Hydration keeps your joints lubricated.",
  "Drink water! It helps regulate your body temperature.",
];

export function getRandomWaterTip(): string {
  return WATER_TIPS[Math.floor(Math.random() * WATER_TIPS.length)];
}
