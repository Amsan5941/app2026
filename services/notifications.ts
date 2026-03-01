/**
 * Notifications service — base file used by TypeScript for type resolution.
 *
 * Metro bundler uses platform-specific overrides at runtime:
 *  - notifications.native.ts  → iOS / Android
 *  - notifications.web.ts     → Web
 *
 * This file is the TypeScript-visible API for the module. It matches the
 * signatures in both platform files so type-checking works on all platforms.
 */

export function configureNotifications(): void {}

export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

export async function areNotificationsEnabled(): Promise<boolean> {
  return false;
}

export async function setNotificationsEnabled(_enabled: boolean): Promise<void> {}

export async function scheduleWaterReminders(): Promise<void> {}

export async function scheduleWorkoutReminder(_hour?: number): Promise<void> {}

export async function scheduleAllReminders(): Promise<void> {}

export async function cancelAllReminders(): Promise<void> {}

export async function initNotifications(): Promise<void> {}
