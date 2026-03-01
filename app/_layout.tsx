import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import "react-native-reanimated";

import DailyWeightPrompt from "@/components/DailyWeightPrompt";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoginButton from "@/components/login-button";
import WaterReminderBanner from "@/components/WaterReminderBanner";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppThemeProvider, useTheme } from "@/hooks/useTheme";
import {
  initPostHog, identifyUser as posthogIdentify,
  resetUser as posthogReset
} from "@/services/analytics";
import { initNotifications } from "@/services/notifications";
import {
  initSentry,
  clearUser as sentryClear,
  identifyUser as sentryIdentify,
} from "@/services/sentry";
import { shouldShowWaterReminder } from "@/services/waterTracking";
import { hasCompletedWeightCheckToday } from "@/services/weightTracking";

export const unstable_settings = {
  anchor: "(tabs)",
};

// ─── Initialise instrumentation once at module load ─────────────────────────
initSentry();
initPostHog().catch((e) => console.warn("PostHog init failed:", e));

function NavigationContent() {
  const { session } = useAuth();
  const { palette: Palette } = useTheme();
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [showWaterReminder, setShowWaterReminder] = useState(false);

  // Identify / clear user in analytics + crash reporting on auth changes
  useEffect(() => {
    if (session?.user) {
      sentryIdentify(session.user.id, session.user.email);
      posthogIdentify(session.user.id, { email: session.user.email });
    } else {
      sentryClear();
      posthogReset();
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      checkWeightLogging();
      checkWaterReminder();
      // Initialise push notifications (permissions + scheduled reminders)
      initNotifications().catch((e: unknown) =>
        console.warn("Notification init failed:", e),
      );
    } else {
      setShowWeightPrompt(false);
      setShowWaterReminder(false);
    }
  }, [session]);

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
            title: "GrindApp",
            headerTitleStyle: {
              fontWeight: "800",
              fontSize: 20,
            },
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
