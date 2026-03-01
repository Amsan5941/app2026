/**
 * Water Tracking Service
 *
 * Stores water intake in Supabase (synced across devices) with an
 * AsyncStorage write-through cache for fast offline reads.
 *
 * Schema: water_logs (id, user_id, logged_date, glasses, updated_at)
 *         — one row per user per day (upsert on conflict).
 */

import { supabase } from "@/constants/supabase";
import { getUserId } from "@/services/userCache";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Constants ──────────────────────────────────────────────

const WATER_CACHE_PREFIX = "water_intake_";
const REMINDER_COOLDOWN_KEY = "water_reminder_last_shown";

/** Daily water goal in glasses (8 oz each) */
export const DAILY_WATER_GOAL = 8;

// ── Helpers ────────────────────────────────────────────────

function getTodayLocal(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function cacheKey(date: string): string {
  return `${WATER_CACHE_PREFIX}${date}`;
}

/** Persist to local cache (fire-and-forget). */
async function setLocalCache(date: string, glasses: number) {
  try {
    await AsyncStorage.setItem(cacheKey(date), String(glasses));
  } catch {
    // non-critical
  }
}

async function getLocalCache(date: string): Promise<number | null> {
  try {
    const val = await AsyncStorage.getItem(cacheKey(date));
    return val !== null ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

// ── Core API ───────────────────────────────────────────────

/**
 * Get today's water intake (number of glasses).
 * Returns instantly from cache when available, then syncs from Supabase.
 */
export async function getTodayWaterIntake(): Promise<number> {
  const today = getTodayLocal();

  try {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from("water_logs")
      .select("glasses")
      .eq("user_id", userId)
      .eq("logged_date", today)
      .maybeSingle();

    if (!error && data) {
      const glasses = data.glasses ?? 0;
      await setLocalCache(today, glasses);
      return glasses;
    }

    // No row yet — return 0 (or cached value if remote failed)
    if (error) {
      console.warn("getTodayWaterIntake remote error, using cache:", error.message);
      const cached = await getLocalCache(today);
      return cached ?? 0;
    }

    return 0;
  } catch {
    // Fallback to local cache when offline / not authenticated
    const cached = await getLocalCache(today);
    return cached ?? 0;
  }
}

/**
 * Internal upsert: set the glasses count for today in Supabase.
 */
async function upsertWater(glasses: number): Promise<number> {
  const clamped = Math.min(Math.max(0, glasses), DAILY_WATER_GOAL);
  const today = getTodayLocal();

  // Optimistic local cache update
  await setLocalCache(today, clamped);

  try {
    const userId = await getUserId();

    await supabase.from("water_logs").upsert(
      {
        user_id: userId,
        logged_date: today,
        glasses: clamped,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,logged_date" },
    );
  } catch (e) {
    console.warn("upsertWater remote failed (local cache still updated):", e);
  }

  return clamped;
}

/** Log one glass of water */
export async function logWaterGlass(): Promise<number> {
  const current = await getTodayWaterIntake();
  return upsertWater(current + 1);
}

/** Remove one glass of water (undo) */
export async function removeWaterGlass(): Promise<number> {
  const current = await getTodayWaterIntake();
  return upsertWater(current - 1);
}

/** Set water intake to a specific count */
export async function setWaterIntake(count: number): Promise<void> {
  await upsertWater(count);
}

// ── Water History (for trends / insights) ──────────────────

export type WaterHistoryEntry = {
  date: string;
  glasses: number;
};

/**
 * Get the last N days of water intake for the current user.
 */
export async function getWaterHistory(
  days: number = 7,
): Promise<WaterHistoryEntry[]> {
  try {
    const userId = await getUserId();

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("water_logs")
      .select("logged_date, glasses")
      .eq("user_id", userId)
      .gte("logged_date", sinceStr)
      .order("logged_date", { ascending: true });

    if (error) throw error;

    return (data || []).map((d: any) => ({
      date: d.logged_date,
      glasses: d.glasses,
    }));
  } catch (e) {
    console.warn("getWaterHistory failed:", e);
    return [];
  }
}

// ── Reminder Logic (still local — device-specific preference) ──

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

// ── Tips ───────────────────────────────────────────────────

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
