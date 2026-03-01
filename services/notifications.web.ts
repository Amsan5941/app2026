/**
 * Push Notifications Service (Web Stub)
 *
 * Web platform doesn't support expo-notifications.
 * This file provides no-op implementations for web.
 */

// ── Stub Functions for Web ─────────────────────────────────

export function configureNotifications() {
  // No-op on web
}

export async function registerForPushNotifications(): Promise<string | null> {
  console.log("[Notifications] Not supported on web platform.");
  return null;
}

export async function areNotificationsEnabled(): Promise<boolean> {
  return false; // Always false on web
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  // No-op on web
}

export async function scheduleWaterReminders(): Promise<void> {
  // No-op on web
}

export async function scheduleWorkoutReminder(hour: number = 18): Promise<void> {
  // No-op on web
}

export async function scheduleAllReminders(): Promise<void> {
  // No-op on web
}

export async function cancelAllReminders(): Promise<void> {
  // No-op on web
}

export async function initNotifications(): Promise<void> {
  console.log("[Notifications] Skipping initialization on web platform.");
}