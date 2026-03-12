/**
 * PostHog analytics wrapper.
 *
 * Provides a thin abstraction so the rest of the app never imports
 * posthog-react-native directly. Set your API key via the env var
 * EXPO_PUBLIC_POSTHOG_API_KEY.
 *
 * ⚠️  The posthog-react-native import is **lazy** (via require()) to avoid
 * TurboModule registration at JS module-evaluation time.  On certain
 * iPad / iPadOS combinations the synchronous native module setup that
 * occurs on import throws an ObjC exception before the bridge is ready,
 * crashing the app on launch (Apple Review Guideline 2.1a).
 */

type PostHogClient = {
  ready: () => Promise<void>;
  capture: (event: string, properties?: Record<string, any>) => void;
  screen: (name: string, properties?: Record<string, any>) => void;
  identify: (userId: string, traits?: Record<string, any>) => void;
  reset: () => void;
  optOut: () => void;
  optIn: () => void;
  flush: () => Promise<void>;
};

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? "";
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let _client: PostHogClient | null = null;

/**
 * Initialise PostHog. Safe to call multiple times.
 */
export async function initPostHog(): Promise<void> {
  if (_client || !POSTHOG_API_KEY) {
    if (!POSTHOG_API_KEY) {
      console.warn(
        "[PostHog] EXPO_PUBLIC_POSTHOG_API_KEY not set — analytics disabled.",
      );
    }
    return;
  }

  try {
    const PostHog = require("posthog-react-native").default;
    _client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      // Flush events every 30 s or when 20 events are queued
      flushInterval: 30_000,
      flushAt: 20,
    });

    await (_client as any).ready();
  } catch (e) {
    console.warn("[PostHog] initPostHog failed:", e);
    _client = null;
  }
}

/**
 * Track a custom event.
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean | null>,
): void {
  _client?.capture(eventName, properties);
}

/**
 *  Track a screen view (call from navigation state changes).
 */
export function trackScreen(screenName: string): void {
  _client?.screen(screenName, { screen: screenName });
}

/**
 * Identify a signed-in user.
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, string | number | boolean | null>,
): void {
  _client?.identify(userId, traits);
}

/**
 * Reset identity on sign-out.
 */
export function resetUser(): void {
  _client?.reset();
}

/**
 * Opt the user out of tracking (e.g. from a settings toggle).
 */
export function optOut(): void {
  _client?.optOut();
}

/**
 * Re-opt the user in.
 */
export function optIn(): void {
  _client?.optIn();
}

/**
 * Flush any pending events immediately (e.g. before app backgrounding).
 */
export async function flush(): Promise<void> {
  await _client?.flush();
}
