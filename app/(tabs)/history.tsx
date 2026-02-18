import { Palette, Radii, Spacing } from "@/constants/theme";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Polyline,
  Stop,
  Circle as SvgCircle,
} from "react-native-svg";

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
  {
    id: "1",
    date: "2026-02-13",
    duration: 55,
    calories: 480,
    type: "Push Day",
    icon: "🏋️",
  },
  {
    id: "2",
    date: "2026-02-12",
    duration: 45,
    calories: 380,
    type: "HIIT",
    icon: "⚡",
  },
  {
    id: "3",
    date: "2026-02-11",
    duration: 60,
    calories: 520,
    type: "Pull Day",
    icon: "💪",
  },
  {
    id: "4",
    date: "2026-02-10",
    duration: 30,
    calories: 220,
    type: "Cardio",
    icon: "🏃",
  },
  {
    id: "5",
    date: "2026-02-08",
    duration: 50,
    calories: 440,
    type: "Leg Day",
    icon: "🦵",
  },
];

import { supabase } from "@/constants/supabase";
import { getCurrentUserBioProfile } from "@/services/bioProfile";
import { getWeightHistory } from "@/services/weightTracking";

const WEIGHT_DATA: WeightEntry[] = [
  { date: "Feb 7", weight: 185 },
  { date: "Feb 8", weight: 184.5 },
  { date: "Feb 9", weight: 184 },
  { date: "Feb 10", weight: 183.5 },
  { date: "Feb 11", weight: 184 },
  { date: "Feb 12", weight: 183 },
  { date: "Feb 13", weight: 182.5 },
];

// Helper to format recorded_date (YYYY-MM-DD) to 'Mon D' like 'Feb 7'
function formatRecordedDate(dateStr: string) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

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
        </View>
        <View
          style={[
            chartStyles.badge,
            isLoss ? chartStyles.badgeLoss : chartStyles.badgeGain,
          ]}
        >
          <Text
            style={[
              chartStyles.badgeText,
              isLoss ? chartStyles.badgeLossText : chartStyles.badgeGainText,
            ]}
          >
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
            {(() => {
              const parts = String(d.date).split(" ");
              return parts.length > 1 ? parts[1] : parts[0];
            })()}
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
function SummaryStats({
  workoutsPerWeek,
  workoutsDone,
}: {
  workoutsPerWeek?: number | null;
  workoutsDone?: number;
}) {
  const stats = [
    {
      label: "Goal/Week",
      value:
        workoutsPerWeek != null
          ? `${workoutsDone ?? 0}/${workoutsPerWeek}`
          : workoutsDone != null
            ? String(workoutsDone)
            : "—",
      sub: "this week",
      icon: "🏋️",
      color: Palette.accent,
    },
    {
      label: "Avg Duration",
      value: "47",
      sub: "min",
      icon: "⏱",
      color: Palette.info,
    },
    {
      label: "Total Burned",
      value: "2,040",
      sub: "cal",
      icon: "🔥",
      color: Palette.warning,
    },
  ];

  return (
    <View style={summaryStyles.row}>
      {stats.map((s, i) => (
        <View
          key={i}
          style={[summaryStyles.card, { borderColor: s.color + "25" }]}
        >
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
  const monthDay = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

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
  const [weightData, setWeightData] = useState<WeightEntry[]>(WEIGHT_DATA);
  const [loadingWeights, setLoadingWeights] = useState(false);
  const [weightUnit, setWeightUnit] = useState<string>("lbs");
  const [bioProfile, setBioProfile] = useState<any | null>(null);

  // Count workouts completed this week (client-side, based on SAMPLE_WORKOUTS)
  function countWorkoutsThisWeek(workouts: Workout[]) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay(); // 0 = Sunday
    start.setDate(start.getDate() - day);
    return workouts.filter((w) => {
      try {
        const d = new Date(w.date + "T00:00:00");
        d.setHours(0, 0, 0, 0);
        return d >= start && d <= now;
      } catch (e) {
        return false;
      }
    }).length;
  }

  const workoutsDoneThisWeek = countWorkoutsThisWeek(SAMPLE_WORKOUTS);

  useEffect(() => {
    let mounted = true;
    async function loadWeights() {
      setLoadingWeights(true);
      try {
        const bpRes = await getCurrentUserBioProfile();
        const whRes = await getWeightHistory(7);

        if (!mounted) return;

        if (bpRes.success && bpRes.profile) setBioProfile(bpRes.profile);

        if (whRes.success && whRes.data && whRes.data.length > 0) {
          // weight history comes back newest first — reverse to oldest-first for chart
          const entries = (whRes.data as any[])
            .slice()
            .reverse()
            .map((e) => ({
              date: formatRecordedDate(e.recorded_date),
              weight: e.weight,
            }));
          // If we have a bio_profile starting weight, prepend it as the earliest point
          if (bpRes.success && bpRes.profile && bpRes.profile.weight != null) {
            const startWeight = bpRes.profile.weight;
            // use bio_profile.created_at if available for a date label, else use 'Start'
            const startDate = bpRes.profile.created_at
              ? formatRecordedDate(
                  (bpRes.profile.created_at as string).split("T")[0],
                )
              : "Start";
            // Only prepend if it differs from the first entry to avoid duplicates
            if (entries.length === 0 || entries[0].weight !== startWeight) {
              entries.unshift({ date: startDate, weight: startWeight });
            }
          }
          setWeightUnit((whRes.data as any)[0]?.weight_unit ?? "lbs");
          setWeightData(entries);
        } else if (
          bpRes.success &&
          bpRes.profile &&
          bpRes.profile.weight != null
        ) {
          // no daily history — fallback to bio_profile weight repeated across last 7 days
          const w = bpRes.profile.weight;
          const days = 7;
          const arr: WeightEntry[] = [];
          for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            arr.push({
              date: d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              weight: w,
            });
          }
          setWeightUnit(bpRes.profile.weight_unit ?? "lbs");
          setWeightData(arr);
        } else {
          // final fallback: use sample data
          setWeightData(WEIGHT_DATA);
        }
      } catch (e) {
        console.error("Error loading weight data:", e);
        setWeightData(WEIGHT_DATA);
      } finally {
        if (mounted) setLoadingWeights(false);
      }
    }
    loadWeights();

    // Set up realtime listener so chart updates when user logs weight
    let channel: any = null;
    (async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) return;

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single();

        if (userError || !userData) return;

        channel = supabase
          .channel("public:body_weight")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "body_weight",
              filter: `user_id=eq.${userData.id}`,
            },
            (payload) => {
              // reload weights when a new entry is added
              loadWeights();
            },
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "body_weight",
              filter: `user_id=eq.${userData.id}`,
            },
            (payload) => {
              loadWeights();
            },
          )
          .subscribe();
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      mounted = false;
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, []);

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
            <SummaryStats
              workoutsPerWeek={bioProfile?.workouts_per_week ?? null}
              workoutsDone={workoutsDoneThisWeek}
            />
            <WeightChart data={weightData} />

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
            <WeightChart data={weightData} />
            <View style={bodyStyles.infoCard}>
              <View style={bodyStyles.infoRow}>
                <Text style={bodyStyles.infoLabel}>Starting Weight</Text>
                <Text style={bodyStyles.infoValue}>
                  {bioProfile && bioProfile.weight != null
                    ? `${bioProfile.weight} ${weightUnit}`
                    : weightData?.[0]?.weight != null
                      ? `${weightData[0].weight} ${weightUnit}`
                      : "—"}
                </Text>
              </View>
              <View style={bodyStyles.infoDivider} />
              <View style={bodyStyles.infoRow}>
                <Text style={bodyStyles.infoLabel}>Current Weight</Text>
                <Text style={bodyStyles.infoValue}>
                  {weightData?.[weightData.length - 1]?.weight ?? "—"}{" "}
                  {weightUnit}
                </Text>
              </View>
              <View style={bodyStyles.infoDivider} />
              <View style={bodyStyles.infoRow}>
                <Text style={bodyStyles.infoLabel}>Total Change</Text>
                <Text
                  style={[bodyStyles.infoValue, { color: Palette.success }]}
                >
                  {(() => {
                    const startRaw =
                      bioProfile && bioProfile.weight != null
                        ? bioProfile.weight
                        : weightData?.[0]?.weight;
                    const endRaw = weightData?.[weightData.length - 1]?.weight;
                    const start =
                      typeof startRaw === "string"
                        ? parseFloat(startRaw)
                        : startRaw;
                    const end =
                      typeof endRaw === "string" ? parseFloat(endRaw) : endRaw;
                    if (
                      typeof start === "number" &&
                      !Number.isNaN(start) &&
                      typeof end === "number" &&
                      !Number.isNaN(end)
                    ) {
                      const diff = (end - start).toFixed(1);
                      return `${diff.startsWith("-") ? "" : "+"}${diff} ${weightUnit}`;
                    }
                    return "—";
                  })()}
                </Text>
              </View>
              <View style={bodyStyles.infoDivider} />
              <View style={bodyStyles.infoRow}>
                <Text style={bodyStyles.infoLabel}>Goal</Text>
                <Text style={[bodyStyles.infoValue, { color: Palette.accent }]}>
                  {bioProfile && bioProfile.goal_weight != null
                    ? `${bioProfile.goal_weight}${typeof bioProfile.goal_weight === "number" && String(bioProfile.goal_weight).includes(".") ? "" : ""} ${weightUnit}`
                    : "—"}
                </Text>
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
