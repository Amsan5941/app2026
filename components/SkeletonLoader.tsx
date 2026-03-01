/**
 * SkeletonLoader — shimmer placeholder for loading states.
 *
 * Renders grey rounded rectangles with a subtle animated pulse so users
 * perceive faster loading compared to a plain spinner.
 *
 * Usage:
 *   <SkeletonLoader />                       // single line
 *   <SkeletonLoader width="60%" height={16} /> // shorter line
 *   <DashboardSkeleton />                     // full home-screen skeleton
 *   <CardSkeleton />                          // generic card placeholder
 */

import { DarkPalette, Radii, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  DimensionValue,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

// ── Base shimmer bar ────────────────────────────────────────

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function SkeletonLoader({
  width = "100%",
  height = 14,
  borderRadius = Radii.sm,
  style,
}: SkeletonProps) {
  const { palette: P } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: P.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ── Preset: stat card row (3 cards) ─────────────────────────

export function StatCardsSkeleton() {
  const { palette: P } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.xl }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: P.bgCard,
            borderRadius: Radii.lg,
            padding: Spacing.md,
            alignItems: "center",
            borderWidth: 1,
            borderColor: P.border,
            gap: 6,
          }}
        >
          <SkeletonLoader width={28} height={28} borderRadius={14} />
          <SkeletonLoader width={40} height={22} />
          <SkeletonLoader width={32} height={11} />
          <SkeletonLoader width={48} height={10} />
        </View>
      ))}
    </View>
  );
}

// ── Preset: generic card ────────────────────────────────────

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  const { palette: P } = useTheme();
  const styles = useMemo(() => makeCardStyles(P), [P]);
  return (
    <View style={styles.card}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLoader
          key={i}
          width={i === lines - 1 ? "60%" : "100%"}
          height={i === 0 ? 18 : 14}
          style={{ marginBottom: i < lines - 1 ? 10 : 0 }}
        />
      ))}
    </View>
  );
}

function makeCardStyles(P: typeof DarkPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: P.bgCard,
      borderRadius: Radii.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: P.border,
    },
  });
}

// ── Preset: full Home dashboard skeleton ────────────────────

export function DashboardSkeleton() {
  const { palette: P } = useTheme();
  return (
    <View style={{ flex: 1, padding: Spacing.lg }}>
      {/* Header */}
      <View style={{ marginBottom: Spacing.xl }}>
        <SkeletonLoader width="55%" height={22} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="35%" height={14} />
      </View>

      {/* Progress ring placeholder */}
      <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
        <SkeletonLoader
          width={160}
          height={160}
          borderRadius={80}
        />
      </View>

      {/* Stat cards */}
      <StatCardsSkeleton />

      {/* Quick-action cards */}
      <View style={{ flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.xl }}>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: P.bgCard,
              borderRadius: Radii.lg,
              padding: Spacing.lg,
              alignItems: "center",
              borderWidth: 1,
              borderColor: P.border,
              gap: 8,
            }}
          >
            <SkeletonLoader width={44} height={44} borderRadius={22} />
            <SkeletonLoader width={48} height={20} />
            <SkeletonLoader width={56} height={11} />
          </View>
        ))}
      </View>

      {/* Water / checklist */}
      <CardSkeleton lines={2} />
      <CardSkeleton lines={4} />
    </View>
  );
}

// ── Preset: Workout screen skeleton ─────────────────────────

export function WorkoutSkeleton() {
  return (
    <View style={{ paddingVertical: Spacing.xl, gap: Spacing.md }}>
      <CardSkeleton lines={4} />
      <CardSkeleton lines={3} />
    </View>
  );
}

// ── Preset: History screen skeleton ─────────────────────────

export function HistorySkeleton() {
  return (
    <View style={{ gap: Spacing.md }}>
      <StatCardsSkeleton />
      <CardSkeleton lines={3} />
      <CardSkeleton lines={3} />
      <CardSkeleton lines={2} />
    </View>
  );
}
