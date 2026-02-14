import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import "react-native-reanimated";

import LoginButton from "@/components/login-button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import DailyWeightPrompt from "@/components/DailyWeightPrompt";
import { hasLoggedWeightToday } from "@/services/weightTracking";

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
    }
  }, [session]);

  async function checkWeightLogging() {
    try {
      const hasLogged = await hasLoggedWeightToday();
      setShowWeightPrompt(!hasLogged);
    } catch (error) {
      console.error("Error checking weight logging status:", error);
    }
  }

  return (
    <>
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: true,
            title: "FitnessApp",
            headerRight: () => <LoginButton />,
          }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <DailyWeightPrompt
        visible={showWeightPrompt}
        onComplete={() => setShowWeightPrompt(false)}
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
