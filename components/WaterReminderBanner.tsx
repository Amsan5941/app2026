import { Palette, Radii, Spacing } from "@/constants/theme";
import {
    getRandomWaterTip,
    logWaterGlass,
    markWaterReminderShown,
} from "@/services/waterTracking";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

const USE_NATIVE_DRIVER = Platform.OS !== "web";

interface WaterReminderBannerProps {
  visible: boolean;
  onDismiss: () => void;
  onLogWater?: () => void;
}

const AUTO_DISMISS_MS = 6000;

export default function WaterReminderBanner({
  visible,
  onDismiss,
  onLogWater,
}: WaterReminderBannerProps) {
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [tip] = useState(() => getRandomWaterTip());
  const [isVisible, setIsVisible] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      markWaterReminderShown();

      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: USE_NATIVE_DRIVER,
          tension: 60,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();

      // Auto-dismiss after delay
      dismissTimer.current = setTimeout(() => {
        slideOut();
      }, AUTO_DISMISS_MS);
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [visible]);

  function slideOut() {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: 300,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => {
      setIsVisible(false);
      onDismiss();
    });
  }

  async function handleLogWater() {
    await logWaterGlass();
    onLogWater?.();
    slideOut();
  }

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.banner}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>💧</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Hydration Reminder</Text>
          <Text style={styles.tip}>{tip}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.dismissButton,
            pressed && { opacity: 0.6 },
          ]}
          onPress={slideOut}
          hitSlop={10}
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      </View>

      {/* Quick-log button */}
      <Pressable
        style={({ pressed }) => [
          styles.logButton,
          pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
        onPress={handleLogWater}
      >
        <Text style={styles.logButtonIcon}>💧</Text>
        <Text style={styles.logButtonText}>Log a Glass</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.bgElevated,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "#38BDF830",
    // Shadow
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  icon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#38BDF8",
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  tip: {
    fontSize: 13,
    color: Palette.textSecondary,
    lineHeight: 18,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissText: {
    fontSize: 14,
    color: Palette.textMuted,
    fontWeight: "600",
  },
  logButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm + 2,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.20)",
    gap: 6,
  },
  logButtonIcon: {
    fontSize: 16,
  },
  logButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#38BDF8",
    letterSpacing: 0.3,
  },
});
