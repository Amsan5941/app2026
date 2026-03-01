/**
 * Push Notifications Service (Native Platforms)
 *
 * Uses expo-notifications to schedule local notifications for:
 *  - Water reminders (every 2 hours during the day, 8 AM – 9 PM)
 *  - Workout reminders (daily at user-preferred time, default 6 PM)
 *
 * On physical devices with Expo push tokens this also registers for
 * remote push (future: backend cron job can trigger via Expo Push API).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ── Constants ──────────────────────────────────────────────

const PUSH_TOKEN_KEY = "expo_push_token";
const NOTIFICATIONS_ENABLED_KEY = "notifications_enabled";
const WATER_CHANNEL_ID = "water-reminders";
const WORKOUT_CHANNEL_ID = "workout-reminders";

// ── Setup ──────────────────────────────────────────────────

/**
 * Configure notification handler (call once at app startup).
 * Sets how notifications behave when app is in the foreground.
 */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Android notification channels
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync(WATER_CHANNEL_ID, {
      name: "Water Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      lightColor: "#38BDF8",
    });
    Notifications.setNotificationChannelAsync(WORKOUT_CHANNEL_ID, {
      name: "Workout Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#A78BFA",
    });
  }
}

// ── Permission & Token ─────────────────────────────────────

/**
 * Request notification permissions and return the Expo push token.
 * Returns null when running on a simulator or if the user denies.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Notifications only work on physical devices
  if (!Device.isDevice) {
    console.log("[Notifications] Not a physical device — skipping push token.");
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[Notifications] Permission not granted.");
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // auto-detected from app.json
    });
    const token = tokenData.data;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch (e) {
    console.warn("[Notifications] Failed to get push token:", e);
    return null;
  }
}

// ── Preferences ────────────────────────────────────────────

export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    // Default to true if never set
    return val !== "false";
  } catch {
    return true;
  }
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));
  if (enabled) {
    await scheduleAllReminders();
  } else {
    await cancelAllReminders();
  }
}

// ── Water Reminders ────────────────────────────────────────

const WATER_MESSAGES = [
  { title: "💧 Hydration Check", body: "Time for a glass of water! Stay on track." },
  { title: "💧 Water Break", body: "Drink up! Hydration boosts your energy." },
  { title: "💧 Stay Hydrated", body: "Your muscles need water to perform." },
  { title: "💧 Sip Some Water", body: "Even mild dehydration hurts performance." },
  { title: "💧 H₂O Time", body: "A glass of water keeps fatigue away." },
];

/**
 * Schedule repeating water reminders every 2 hours from 8 AM to 9 PM.
 */
export async function scheduleWaterReminders(): Promise<void> {
  // Cancel existing water reminders first
  await cancelWaterReminders();

  const hours = [8, 10, 12, 14, 16, 18, 20]; // 8AM, 10AM, 12PM, 2PM, 4PM, 6PM, 8PM

  for (let i = 0; i < hours.length; i++) {
    const msg = WATER_MESSAGES[i % WATER_MESSAGES.length];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        data: { type: "water_reminder" },
        ...(Platform.OS === "android" && { channelId: WATER_CHANNEL_ID }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours[i],
        minute: 0,
      },
    });
  }
}

async function cancelWaterReminders(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if ((n.content.data as any)?.type === "water_reminder") {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

// ── Workout Reminder ───────────────────────────────────────

/**
 * Schedule a daily workout reminder at 6 PM (default).
 */
export async function scheduleWorkoutReminder(hour: number = 18): Promise<void> {
  await cancelWorkoutReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "💪 Time to Grind",
      body: "Your workout is waiting. Let's get it!",
      data: { type: "workout_reminder" },
      ...(Platform.OS === "android" && { channelId: WORKOUT_CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
}

async function cancelWorkoutReminder(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if ((n.content.data as any)?.type === "workout_reminder") {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

// ── Convenience ────────────────────────────────────────────

/** Schedule all default reminders. */
export async function scheduleAllReminders(): Promise<void> {
  const enabled = await areNotificationsEnabled();
  if (!enabled) return;

  await Promise.all([scheduleWaterReminders(), scheduleWorkoutReminder()]);
}

/** Cancel all scheduled reminders. */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Full init: configure handler, request permission, schedule reminders.
 * Call once at app startup after the user is authenticated.
 */
export async function initNotifications(): Promise<void> {
  configureNotifications();
  await registerForPushNotifications();

  const enabled = await areNotificationsEnabled();
  if (enabled) {
    await scheduleAllReminders();
  }
}
