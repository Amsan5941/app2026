import { Tabs } from "expo-router";
import React from "react";
import { Platform, useWindowDimensions } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/useTheme";

/** Compact breakpoint – iPads in any orientation hit this. */
const TABLET_MIN_WIDTH = 768;

export default function TabLayout() {
  const { palette: P } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_MIN_WIDTH;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: P.accent,
        tabBarInactiveTintColor: P.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: P.bgCard,
          borderTopColor: P.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? (isTablet ? 68 : 88) : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? (isTablet ? 12 : 28) : 8,
        },
        tabBarLabelStyle: {
          fontSize: isTablet ? 13 : 11,
          fontWeight: "600",
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: "Workout",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="dumbbell.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Nutrition",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="fork.knife" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Progress",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={26}
              name="chart.line.uptrend.xyaxis"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person.crop.circle" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
