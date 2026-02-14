import { Palette, Radii, Spacing } from "@/constants/theme";
import React, { useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Line, LinearGradient, Polyline, Stop, Circle as SvgCircle } from "react-native-svg";

// ── Types ───────────────────────────────────────────────────
type Workout = {
  id: string;
  date: string;
  duration: number;
  calories: number;
  type: string;
  icon: string;
};

type WeightEntry = {
  date: string;
  weight: number;
};

// ── Sample Data ─────────────────────────────────────────────
const SAMPLE_WORKOUTS: Workout[] = [
  { id: "1", date: "2026-02-13", duration: 55, calories: 480, type: "Push Day", icon: "🏋️" },
  { id: "2", date: "2026-02-12", duration: 45, calories: 380, type: "HIIT", icon: "⚡" },
  { id: "3", date: "2026-02-11", duration: 60, calories: 520, type: "Pull Day", icon: "💪" },
  { id: "4", date: "2026-02-10", duration: 30, calories: 220, type: "Cardio", icon: "🏃" },
  { id: "5", date: "2026-02-08", duration: 50, calories: 440, type: "Leg Day", icon: "🦵" },
];

const WEIGHT_DATA: WeightEntry[] = [
  { date: "Feb 7", weight: 185 },
  { date: "Feb 8", weight: 184.5 },
  { date: "Feb 9", weight: 184 },
  { date: "Feb 10", weight: 183.5 },
  { date: "Feb 11", weight: 184 },
  { date: "Feb 12", weight: 183 },
  { date: "Feb 13", weight: 182.5 },
];

// ── Mini Weight Chart ───────────────────────────────────────
function WeightChart({ data }: { data: WeightEntry[] }) {
  const width = 320;
  const height = 140;
  const paddingX = 10;
  const paddingY = 20;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const weights = data.map((d) => d.weight);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;

  const points = data.map((d, i) => ({
    x: paddingX + (i / (data.length - 1)) * chartW,
    y: paddingY + (1 - (d.weight - minW) / (maxW - minW)) * chartH,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const startWeight = data[0].weight;
  const endWeight = data[data.length - 1].weight;
  const diff = endWeight - startWeight;
  const isLoss = diff < 0;

  return (
    <View style={chartStyles.card}>
      <View style={chartStyles.header}>
        <View>
          <Text style={chartStyles.title}>Weight Trend</Text>
          <Text style={chartStyles.subtitle}>Last 7 days</Text>
        </View>
        <View style={[chartStyles.badge, isLoss ? chartStyles.badgeLoss : chartStyles.badgeGain]}>
          <Text style={[chartStyles.badgeText, isLoss ? chartStyles.badgeLossText : chartStyles.badgeGainText]}>
            {isLoss ? "↓" : "↑"} {Math.abs(diff).toFixed(1)} lbs
          </Text>
        </View>
      </View>

      <View style={chartStyles.currentWeight}>
        <Text style={chartStyles.weightValue}>{endWeight}</Text>
        <Text style={chartStyles.weightUnit}>lbs</Text>
      </View>

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={Palette.gradientStart} />
            <Stop offset="100%" stopColor={Palette.gradientEnd} />
          </LinearGradient>
        </Defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <Line
            key={i}
            x1={paddingX}
            y1={paddingY + pct * chartH}
            x2={paddingX + chartW}
            y2={paddingY + pct * chartH}
            stroke={Palette.border}
            strokeWidth={0.5}
          />
        ))}
        {/* Line */}
        <Polyline
          fill="none"
          stroke="url(#chartLine)"
          strokeWidth={2.5}
          points={polyline}
          strokeLinejoin="round"
        />
        {/* Dots */}
        {points.map((p, i) => (
          <SvgCircle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={Palette.accent}
            stroke={Palette.bg}
            strokeWidth={2}
          />
        ))}
      </Svg>

      {/* Date labels */}
      <View style={chartStyles.dateRow}>
        {data.map((d, i) => (
          <Text key={i} style={chartStyles.dateLabel}>
            {d.date.split(" ")[1]}
          </Text>
        ))}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  card: {
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  badgeLoss: { backgroundColor: Palette.successMuted },
  badgeGain: { backgroundColor: Palette.warningMuted },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeLossText: { color: Palette.success },
  badgeGainText: { color: Palette.warning },
  currentWeight: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.md,
    gap: 4,
  },
  weightValue: {
    fontSize: 36,
    fontWeight: "800",
    color: Palette.textPrimary,
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: "600",
    color: Palette.textSecondary,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
    paddingHorizontal: 4,
  },
  dateLabel: {
    fontSize: 10,
    color: Palette.textMuted,
  },
});

// ── Summary Stats ───────────────────────────────────────────
function SummaryStats() {
  const stats = [
    { label: "This Week", value: "4", sub: "workouts", icon: "🏋️", color: Palette.accent },
    { label: "Avg Duration", value: "47", sub: "min", icon: "⏱", color: Palette.info },
    { label: "Total Burned", value: "2,040", sub: "cal", icon: "🔥", color: Palette.warning },
  ];

  return (
    <View style={summaryStyles.row}>
      {stats.map((s, i) => (
        <View key={i} style={[summaryStyles.card, { borderColor: s.color + "25" }]}>
          <Text style={summaryStyles.icon}>{s.icon}</Text>
          <Text style={summaryStyles.value}>{s.value}</Text>
          <Text style={summaryStyles.sub}>{s.sub}</Text>
          <Text style={summaryStyles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  card: {
    flex: 1,
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
  },
  icon: { fontSize: 20, marginBottom: 4 },
  value: {
    fontSize: 22,
    fontWeight: "800",
    color: Palette.textPrimary,
  },
  sub: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  label: {
    fontSize: 10,
    color: Palette.textMuted,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});

// ── Workout History Card ────────────────────────────────────
function WorkoutCard({ item }: { item: Workout }) {
  const dateObj = new Date(item.date + "T00:00:00");
  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <View style={wkStyles.card}>
      <View style={wkStyles.dateCol}>
        <Text style={wkStyles.day}>{dayName}</Text>
        <Text style={wkStyles.monthDay}>{monthDay}</Text>
      </View>
      <View style={wkStyles.divider} />
      <View style={wkStyles.iconWrap}>
        <Text style={wkStyles.icon}>{item.icon}</Text>
      </View>
      <View style={wkStyles.info}>
        <Text style={wkStyles.type}>{item.type}</Text>
        <View style={wkStyles.metaRow}>
          <Text style={wkStyles.meta}>⏱ {item.duration}m</Text>
          <Text style={wkStyles.metaDot}>•</Text>
          <Text style={wkStyles.meta}>🔥 {item.calories} cal</Text>
        </View>
      </View>
    </View>
  );
}

const wkStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  dateCol: {
    alignItems: "center",
    width: 46,
  },
  day: {
    fontSize: 11,
    fontWeight: "700",
    color: Palette.accent,
    textTransform: "uppercase",
  },
  monthDay: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: Palette.border,
    marginHorizontal: Spacing.md,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Palette.accentMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  type: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  meta: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  metaDot: {
    color: Palette.textMuted,
    fontSize: 10,
  },
});

// ── Tab Selector ────────────────────────────────────────────
function TabSelector({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
}) {
  return (
    <View style={tabStyles.row}>
      {tabs.map((t) => (
        <Pressable
          key={t}
          style={[tabStyles.tab, active === t && tabStyles.tabActive]}
          onPress={() => onChange(t)}
        >
          <Text style={[tabStyles.text, active === t && tabStyles.textActive]}>
            {t}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.md,
    padding: 3,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: Palette.accent,
  },
  text: {
    fontSize: 13,
    fontWeight: "700",
    color: Palette.textMuted,
  },
  textActive: {
    color: Palette.white,
  },
});

// ── Main Screen ─────────────────────────────────────────────
export default function ProgressScreen() {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Progress</Text>
        <Text style={styles.pageSub}>Your fitness journey at a glance</Text>

        <TabSelector
          tabs={["Overview", "Workouts", "Body"]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "Overview" && (
          <>
            <SummaryStats />
            <WeightChart data={WEIGHT_DATA} />

            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            {SAMPLE_WORKOUTS.slice(0, 3).map((w) => (
              <View key={w.id} style={{ marginBottom: Spacing.md }}>
                <WorkoutCard item={w} />
              </View>
            ))}
          </>
        )}

        {activeTab === "Workouts" && (
          <>
            <Text style={styles.sectionTitle}>Workout History</Text>
            {SAMPLE_WORKOUTS.map((w) => (
              <View key={w.id} style={{ marginBottom: Spacing.md }}>
                <WorkoutCard item={w} />
              </View>
            ))}
            {SAMPLE_WORKOUTS.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏋️</Text>
                <Text style={styles.emptyTitle}>No workouts yet</Text>
                <Text style={styles.emptyBody}>
                  Start your first workout from the Home tab!
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === "Body" && (
          <>
            <WeightChart data={WEIGHT_DATA} />
            <View style={bodyStyles.infoCard}>
              <View style={bodyStyles.infoRow}>
                <Text style={bodyStyles.infoLabel}>Starting Weight</Text>
                <Text style={bodyStyles.infoValue}>185 lbs</Text>
              </View>
              <View style={bodyStyles.infoDivider} />
              <View style={bodyStyles.infoRow}>
                <Text style={bodyStyles.infoLabel}>Current Weight</Text>
                <Text style={bodyStyles.infoValue}>182.5 lbs</Text>
              </View>
              <View style={bodyStyles.infoDivider} />
              <View style={bodyStyles.infoRow}>
                <Text style={bodyStyles.infoLabel}>Total Change</Text>
                <Text style={[bodyStyles.infoValue, { color: Palette.success }]}>-2.5 lbs</Text>
              </View>
              <View style={bodyStyles.infoDivider} />
              <View style={bodyStyles.infoRow}>
                <Text style={bodyStyles.infoLabel}>Goal</Text>
                <Text style={[bodyStyles.infoValue, { color: Palette.accent }]}>175 lbs</Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const bodyStyles = StyleSheet.create({
  infoCard: {
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Palette.divider,
  },
  infoLabel: {
    fontSize: 14,
    color: Palette.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Palette.bg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Palette.textPrimary,
    letterSpacing: -0.5,
  },
  pageSub: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Palette.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Palette.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyBody: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: "center",
  },
});
