/**
 * SummaryStats — shared weekly workout summary cards.
 *
 * Used on both the Home dashboard and the History → Overview tab.
 */

import { DarkPalette, Radii, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

export interface SummaryStatsProps {
  workoutsDone?: number | null;
  workoutsGoal?: number | null;
  totalSets: number;
  totalDuration: number;
}

export default function SummaryStats({
  workoutsDone,
  workoutsGoal,
  totalSets,
  totalDuration,
}: SummaryStatsProps) {
  const { palette: Palette } = useTheme();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const workoutCount = workoutsDone ?? 0;
  const avgDuration =
    workoutCount > 0 ? Math.round(totalDuration / 60 / workoutCount) : 0;

  const stats = [
    {
      label: "This Week",
      value:
        workoutsGoal != null
          ? `${workoutsDone ?? 0}/${workoutsGoal}`
          : String(workoutsDone ?? 0),
      sub: "workouts",
      icon: "🏋️",
      color: Palette.accent,
    },
    {
      label: "Avg Duration",
      value: String(avgDuration),
      sub: "min",
      icon: "⏱",
      color: Palette.info,
    },
    {
      label: "Total Sets",
      value: String(totalSets),
      sub: "sets",
      icon: "💪",
      color: Palette.warning,
    },
  ];

  return (
    <View style={styles.row}>
      {stats.map((s, i) => (
        <View key={i} style={[styles.card, { borderColor: s.color + "25" }]}>
          <Text style={styles.icon}>{s.icon}</Text>
          <Text style={styles.value}>{s.value}</Text>
          <Text style={styles.sub}>{s.sub}</Text>
          <Text style={styles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

function makeStyles(P: typeof DarkPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: Spacing.md,
      marginBottom: Spacing.xl,
    },
    card: {
      flex: 1,
      backgroundColor: P.bgCard,
      borderRadius: Radii.lg,
      padding: Spacing.md,
      alignItems: "center",
      borderWidth: 1,
    },
    icon: { fontSize: 20, marginBottom: 4 },
    value: {
      fontSize: 22,
      fontWeight: "800",
      color: P.textPrimary,
    },
    sub: {
      fontSize: 11,
      color: P.textSecondary,
      marginTop: 1,
    },
    label: {
      fontSize: 10,
      color: P.textMuted,
      marginTop: 4,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
  });
}
