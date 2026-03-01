/**
 * Sentry crash-reporting wrapper.
 *
 * Provides a thin abstraction so the rest of the app never imports
 * @sentry/react-native directly. Set your DSN via the env var
 * EXPO_PUBLIC_SENTRY_DSN.
 */
import * as Sentry from "@sentry/react-native";

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

  Sentry.init({
    dsn: SENTRY_DSN,
    // Set to a lower value in production to reduce noise
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    debug: __DEV__,
    environment: __DEV__ ? "development" : "production",
  });

  _initialized = true;
}

/**
 * Capture an exception manually (e.g. in a catch block).
 */
export function captureException(error: unknown): void {
  if (_initialized) {
    Sentry.captureException(error);
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
  level: Sentry.SeverityLevel = "info",
): void {
  if (_initialized) {
    Sentry.addBreadcrumb({ category, message, level });
  }
}

/**
 * Identify the current user so crash reports are attributable.
 */
export function identifyUser(userId: string, email?: string): void {
  if (_initialized) {
    Sentry.setUser({ id: userId, email });
  }
}

/**
 * Clear user context (e.g. on sign-out).
 */
export function clearUser(): void {
  if (_initialized) {
    Sentry.setUser(null);
  }
}

/**
 * Wrap the root component with Sentry's error boundary HOC.
 */
export const SentryErrorBoundary = Sentry.wrap;
