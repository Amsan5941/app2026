import DailyWeightPrompt from "@/components/DailyWeightPrompt";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoginButton from "@/components/login-button";
import WaterReminderBanner from "@/components/WaterReminderBanner";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppThemeProvider, useTheme } from "@/hooks/useTheme";
import {
  initPostHog,
  identifyUser as posthogIdentify,
  resetUser as posthogReset,
} from "@/services/analytics";
import { initNotifications } from "@/services/notifications";
import {
  initSentry,
  clearUser as sentryClear,
  identifyUser as sentryIdentify,
} from "@/services/sentry";
import { shouldShowWaterReminder } from "@/services/waterTracking";
import { hasCompletedWeightCheckToday } from "@/services/weightTracking";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

export const unstable_settings = {
  anchor: "(tabs)",
};

// ─── Set up a global error handler to prevent native bridge errors ──────────
// from crashing the app with an unrecoverable SIGSEGV / SIGABRT.
// Entire block is wrapped in try-catch because accessing ErrorUtils can itself
// trigger TurboModule interactions before the bridge is fully ready.
try {
  if (typeof ErrorUtils !== "undefined") {
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.error("[GlobalErrorHandler]", isFatal ? "FATAL:" : "ERROR:", error);
      // Delegate to the original handler but guard against re‑throw
      try {
        originalHandler?.(error, isFatal);
      } catch {
        // swallow – we already logged
      }
    });
  }
} catch {
  // ErrorUtils setup is best-effort — swallow any failure so the app
  // can still proceed to render.
}

// ─── Instrumentation is now initialised inside useEffect (see below) ────────
// This prevents native TurboModule calls at module‑load time which crash
// on certain devices (iPad + iPadOS 26.x) before the bridge is ready.

function NavigationContent() {
  const { session, authReady } = useAuth();
  const { palette: Palette } = useTheme();
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [showWaterReminder, setShowWaterReminder] = useState(false);
  const instrumentationInitRef = useRef(false);

  // ─── Deferred instrumentation init ──────────────────────────────────
  // Runs once after the first render so native TurboModules are fully
  // bootstrapped before we call into them.
  useEffect(() => {
    if (instrumentationInitRef.current) return;
    instrumentationInitRef.current = true;

    try {
      initSentry();
    } catch (e) {
      console.warn("Sentry init failed:", e);
    }

    initPostHog().catch((e) => console.warn("PostHog init failed:", e));
  }, []);

  // Identify / clear user in analytics + crash reporting on auth changes
  useEffect(() => {
    if (!authReady) return;
    if (session?.user) {
      sentryIdentify(session.user.id, session.user.email);
      posthogIdentify(session.user.id, { email: session.user.email ?? null });
    } else {
      sentryClear();
      posthogReset();
    }
  }, [session, authReady]);

  useEffect(() => {
    if (!authReady) return;
    if (session) {
      checkWeightLogging();
      checkWaterReminder();
      // Initialise push notifications (permissions + scheduled reminders)
      // Wrapped in a try-catch to prevent native module failures from crashing
      initNotifications().catch((e: unknown) =>
        console.warn("Notification init failed:", e),
      );
    } else {
      setShowWeightPrompt(false);
      setShowWaterReminder(false);
    }
  }, [session, authReady]);

  // Re-check when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && session) {
        checkWeightLogging();
        checkWaterReminder();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [session]);

  async function checkWeightLogging() {
    try {
      const hasCompleted = await hasCompletedWeightCheckToday();
      setShowWeightPrompt(!hasCompleted);
    } catch (error) {
      console.error("Error checking weight logging status:", error);
    }
  }

  async function checkWaterReminder() {
    try {
      const shouldShow = await shouldShowWaterReminder();
      // Show water reminder only when weight prompt is NOT showing
      // (delay slightly so it appears after the weight modal if needed)
      if (shouldShow) {
        setTimeout(() => setShowWaterReminder(true), 500);
      }
    } catch (error) {
      console.error("Error checking water reminder:", error);
    }
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Palette.bg },
          headerTintColor: Palette.textPrimary,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: Palette.bg },
            headerTitle: () => null,
            headerLeft: () => null,
            headerRight: () => <LoginButton />,

          }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <DailyWeightPrompt
        visible={showWeightPrompt && !!session}
        onComplete={() => {
          setShowWeightPrompt(false);
          // Re-check weight status after completion
          checkWeightLogging();
        }}
      />
      <WaterReminderBanner
        visible={showWaterReminder && !showWeightPrompt && !!session}
        onDismiss={() => setShowWaterReminder(false)}
      />
    </>
  );
}

// Reads from AppThemeProvider so react-navigation theme stays in sync
function NavThemeWrapper({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      {children}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <NavThemeWrapper>
          <AuthProvider>
            <NavigationContent />
          </AuthProvider>
          <StatusBar style="auto" />
        </NavThemeWrapper>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
