/**
 * Sentry crash-reporting wrapper.
 *
 * Provides a thin abstraction so the rest of the app never imports
 * @sentry/react-native directly. Set your DSN via the env var
 * EXPO_PUBLIC_SENTRY_DSN.
 *
 * ⚠️  The `@sentry/react-native` import is **lazy** (via require()) so that
 * its TurboModule registration does not execute at JS module-evaluation time.
 * On certain iPad / iPadOS combinations the synchronous TurboModule setup
 * triggered by the import throws an ObjC exception before the bridge is
 * fully ready, crashing the app on launch (Apple Review Guideline 2.1a).
 */

type SentryModule = typeof import("@sentry/react-native");

let _sentry: SentryModule | null = null;

function getSentry(): SentryModule | null {
  if (!_sentry) {
    try {
      _sentry = require("@sentry/react-native") as SentryModule;
    } catch (e) {
      console.warn("[Sentry] Failed to load @sentry/react-native:", e);
    }
  }
  return _sentry;
}

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

let _initialized = false;

/**
 * Initialise Sentry. Safe to call multiple times — only the first
 * invocation does anything.
 */
export function initSentry(): void {
  if (_initialized || !SENTRY_DSN) {
    if (!SENTRY_DSN) {
      console.warn(
        "[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — crash reporting disabled.",
      );
    }
    return;
  }

  try {
    const Sentry = getSentry();
    if (!Sentry) return;

    Sentry.init({
      dsn: SENTRY_DSN,
      // Lower sample rate keeps dev fast; production cuts noise
      tracesSampleRate: __DEV__ ? 0.1 : 0.2,
      // Never enable debug — it floods the console with 20+ integration logs
      debug: false,
      environment: __DEV__ ? "development" : "production",
    });
    _initialized = true;
  } catch (e) {
    console.warn("[Sentry] init() failed — crash reporting disabled:", e);
  }
}

/**
 * Capture an exception manually (e.g. in a catch block).
 */
export function captureException(error: unknown): void {
  if (_initialized) {
    getSentry()?.captureException(error);
  } else {
    console.error("[Sentry] Not initialised. Error:", error);
  }
}

/**
 * Capture a breadcrumb for additional context before a crash.
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: "fatal" | "error" | "warning" | "log" | "info" | "debug" = "info",
): void {
  if (_initialized) {
    getSentry()?.addBreadcrumb({ category, message, level });
  }
}

/**
 * Identify the current user so crash reports are attributable.
 */
export function identifyUser(userId: string, email?: string): void {
  if (_initialized) {
    getSentry()?.setUser({ id: userId, email });
  }
}

/**
 * Clear user context (e.g. on sign-out).
 */
export function clearUser(): void {
  if (_initialized) {
    getSentry()?.setUser(null);
  }
}

/**
 * Wrap the root component with Sentry's error boundary HOC.
 * Falls back to a passthrough if Sentry couldn't load.
 */
export const SentryErrorBoundary: (component: any) => any =
  getSentry()?.wrap ?? ((c: any) => c);
