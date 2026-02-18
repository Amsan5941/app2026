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
import LoginButton from "@/components/login-button";
import { Palette } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { hasCompletedWeightCheckToday } from "@/services/weightTracking";

export const unstable_settings = {
  anchor: "(tabs)",
};

function NavigationContent() {
  const colorScheme = useColorScheme();
  const { session } = useAuth();
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);

  useEffect(() => {
    if (session) {
      checkWeightLogging();
    } else {
      setShowWeightPrompt(false);
    }
  }, [session]);

  // Re-check weight status when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && session) {
        checkWeightLogging();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
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
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <NavigationContent />
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
