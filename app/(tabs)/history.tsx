import { supabase } from "@/constants/supabase";
import { Palette, Radii, Spacing } from "@/constants/theme";
import { getCurrentUserBioProfile } from "@/services/bioProfile";
import { getWeightHistory } from "@/services/weightTracking";
import {
  WorkoutHistoryItem,
  WorkoutSession,
  getWeeklyWorkoutStats,
  getWorkoutHistory,
  getWorkoutSession,
} from "@/services/workoutTracking";
import { formatTime } from "@/utils/formatTime";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
type WeightEntry = {
  date: string;
  weight: number;
};

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
  workoutsDone,
  workoutsGoal,
  totalSets,
  totalDuration,
}: {
  workoutsDone?: number | null;
  workoutsGoal?: number | null;
  totalSets: number;
  totalDuration: number;
}) {
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
function WorkoutCard({
  item,
  onPress,
}: {
  item: WorkoutHistoryItem;
  onPress: () => void;
}) {
  const dateObj = new Date(item.workout_date + "T00:00:00");
  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const durationMin = item.duration_seconds
    ? Math.round(item.duration_seconds / 60)
    : null;

  return (
    <Pressable onPress={onPress}>
      <View style={wkStyles.card}>
        <View style={wkStyles.dateCol}>
          <Text style={wkStyles.day}>{dayName}</Text>
          <Text style={wkStyles.monthDay}>{monthDay}</Text>
        </View>
        <View style={wkStyles.divider} />
        <View style={wkStyles.iconWrap}>
          <Text style={wkStyles.icon}>🏋️</Text>
        </View>
        <View style={wkStyles.info}>
          <Text style={wkStyles.type}>{item.name}</Text>
          <View style={wkStyles.metaRow}>
            <Text style={wkStyles.meta}>
              {item.exercise_count} exercise
              {item.exercise_count !== 1 ? "s" : ""}
            </Text>
            <Text style={wkStyles.metaDot}>•</Text>
            <Text style={wkStyles.meta}>
              {item.total_sets} set{item.total_sets !== 1 ? "s" : ""}
            </Text>
            {durationMin != null && (
              <>
                <Text style={wkStyles.metaDot}>•</Text>
                <Text style={wkStyles.meta}>{durationMin}m</Text>
              </>
            )}
          </View>
        </View>
        <Text style={wkStyles.chevron}>▸</Text>
      </View>
    </Pressable>
  );
}

// ── Workout Detail Modal ────────────────────────────────────
function WorkoutDetailModal({
  visible,
  sessionId,
  onClose,
}: {
  visible: boolean;
  sessionId: string | null;
  onClose: () => void;
}) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId || !visible) {
      setSession(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    getWorkoutSession(sessionId).then((res) => {
      if (!mounted) return;
      if (res.success && res.data) {
        setSession(res.data);
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [sessionId, visible]);

  const dateStr = session?.workout_date
    ? new Date(session.workout_date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const durationStr = session?.duration_seconds
    ? formatTime(session.duration_seconds)
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={detailStyles.overlay}>
        <View style={detailStyles.sheet}>
          <View style={detailStyles.handle} />

          {/* Header with close */}
          <View style={detailStyles.header}>
            <View style={{ flex: 1 }}>
              <Text style={detailStyles.title}>
                {session?.name || "Workout"}
              </Text>
              <Text style={detailStyles.date}>{dateStr}</Text>
            </View>
            <Pressable style={detailStyles.closeBtn} onPress={onClose}>
              <Text style={detailStyles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={Palette.accent} />
            </View>
          ) : session ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 500 }}
            >
              {/* Duration badge */}
              {durationStr && (
                <View style={detailStyles.durationBadge}>
                  <Text style={detailStyles.durationText}>
                    ⏱ Duration: {durationStr}
                  </Text>
                </View>
              )}

              {/* Exercises */}
              {(session.exercises || []).map((ex, i) => (
                <View key={ex.id || i} style={detailStyles.exerciseCard}>
                  <View style={detailStyles.exerciseHeader}>
                    <View style={detailStyles.exIconWrap}>
                      <Text style={{ fontSize: 16 }}>🏋️</Text>
                    </View>
                    <Text style={detailStyles.exerciseName}>
                      {ex.exercise_name}
                    </Text>
                    <Text style={detailStyles.setCount}>
                      {ex.sets.length} set{ex.sets.length !== 1 ? "s" : ""}
                    </Text>
                  </View>

                  {/* Set header */}
                  {ex.sets.length > 0 && (
                    <View style={detailStyles.setHeaderRow}>
                      <Text style={[detailStyles.setHeaderText, { flex: 0.5 }]}>
                        #
                      </Text>
                      <Text style={[detailStyles.setHeaderText, { flex: 1 }]}>
                        Reps
                      </Text>
                      <Text style={[detailStyles.setHeaderText, { flex: 1 }]}>
                        Weight
                      </Text>
                    </View>
                  )}

                  {/* Sets */}
                  {ex.sets.map((set, si) => (
                    <View key={set.id || si} style={detailStyles.setRow}>
                      <Text style={[detailStyles.setText, { flex: 0.5 }]}>
                        {set.set_number}
                      </Text>
                      <Text style={[detailStyles.setText, { flex: 1 }]}>
                        {set.reps}
                      </Text>
                      <Text style={[detailStyles.setText, { flex: 1 }]}>
                        {set.weight != null ? `${set.weight} lbs` : "BW"}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}

              {(session.exercises || []).length === 0 && (
                <View style={{ alignItems: "center", paddingVertical: 30 }}>
                  <Text style={{ color: Palette.textMuted, fontSize: 14 }}>
                    No exercises recorded
                  </Text>
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 30 }}>
              <Text style={{ color: Palette.textMuted }}>
                Could not load workout details
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Palette.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Palette.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 40 : Spacing.xl,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Palette.textPrimary,
  },
  date: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: Palette.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  durationBadge: {
    backgroundColor: Palette.accentMuted,
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    alignSelf: "flex-start",
  },
  durationText: {
    color: Palette.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  exerciseCard: {
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  exIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Palette.accentMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  exerciseName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  setCount: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: "600",
  },
  setHeaderRow: {
    flexDirection: "row",
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    marginBottom: Spacing.sm,
  },
  setHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: Palette.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  setText: {
    fontSize: 14,
    color: Palette.textPrimary,
    fontWeight: "600",
  },
});

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
  chevron: {
    fontSize: 14,
    color: Palette.textMuted,
    marginLeft: Spacing.sm,
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

  // Workout state
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>(
    [],
  );
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState({
    workoutCount: 0,
    totalSets: 0,
    totalDuration: 0,
  });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadWeights() {
      setLoadingWeights(true);
      try {
        // only call getCurrentUserBioProfile if there's an auth user to avoid AuthSessionMissingError
        const {
          data: { user },
        } = await supabase.auth.getUser();
        let bpRes: any = { success: false, profile: null };
        if (user) {
          try {
            bpRes = await getCurrentUserBioProfile();
          } catch (e) {
            // ignore profile fetch errors
            console.warn("getCurrentUserBioProfile skipped/failed:", e);
          }
        }

        const whRes = await getWeightHistory(7);

        if (!mounted) return;

        if (bpRes.success && bpRes.profile) setBioProfile(bpRes.profile);

        if (whRes.success && whRes.data && whRes.data.length > 0) {
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

  // Load workout history when tab focuses or activeTab changes
  const loadWorkouts = useCallback(async () => {
    setLoadingWorkouts(true);
    try {
      const [histRes, statsRes] = await Promise.all([
        getWorkoutHistory(30),
        getWeeklyWorkoutStats(),
      ]);
      if (histRes.success) {
        setWorkoutHistory(histRes.data || []);
      }
      if (statsRes.success) {
        setWeeklyStats({
          workoutCount: statsRes.workoutCount || 0,
          totalSets: statsRes.totalSets || 0,
          totalDuration: statsRes.totalDuration || 0,
        });
      }
    } catch (e) {
      console.error("Error loading workouts:", e);
    } finally {
      setLoadingWorkouts(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [loadWorkouts]),
  );

  const handleOpenDetail = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowDetail(true);
  };

  // Compute total change (end - start) and choose color: red for gain, green for loss
  const { totalChangeDisplay, totalChangeColor } = (() => {
    const startRaw =
      bioProfile && bioProfile.weight != null
        ? bioProfile.weight
        : weightData?.[0]?.weight;
    const endRaw = weightData?.[weightData.length - 1]?.weight;
    const start =
      typeof startRaw === "string" ? parseFloat(startRaw) : startRaw;
    const end = typeof endRaw === "string" ? parseFloat(endRaw) : endRaw;

    if (
      typeof start === "number" &&
      !Number.isNaN(start) &&
      typeof end === "number" &&
      !Number.isNaN(end)
    ) {
      const diff = end - start;
      const sign = diff > 0 ? "+" : "";
      const color =
        diff > 0
          ? Palette.error
          : diff < 0
            ? Palette.success
            : Palette.textPrimary;
      return {
        totalChangeDisplay: `${sign}${diff.toFixed(1)} ${weightUnit}`,
        totalChangeColor: color,
      };
    }
    return { totalChangeDisplay: "—", totalChangeColor: Palette.textPrimary };
  })();

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
              workoutsDone={
                bioProfile?.workout_counter ?? weeklyStats.workoutCount
              }
              workoutsGoal={bioProfile?.workouts_per_week ?? null}
              totalSets={weeklyStats.totalSets}
              totalDuration={weeklyStats.totalDuration}
            />
            <WeightChart data={weightData} />

            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            {loadingWorkouts ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator color={Palette.accent} />
              </View>
            ) : workoutHistory.length > 0 ? (
              workoutHistory.slice(0, 3).map((w) => (
                <View key={w.id} style={{ marginBottom: Spacing.md }}>
                  <WorkoutCard
                    item={w}
                    onPress={() => handleOpenDetail(w.id)}
                  />
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏋️</Text>
                <Text style={styles.emptyTitle}>No workouts yet</Text>
                <Text style={styles.emptyBody}>
                  Log your first workout from the Workout tab!
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === "Workouts" && (
          <>
            <Text style={styles.sectionTitle}>Workout History</Text>
            {loadingWorkouts ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator color={Palette.accent} />
              </View>
            ) : workoutHistory.length > 0 ? (
              workoutHistory.map((w) => (
                <View key={w.id} style={{ marginBottom: Spacing.md }}>
                  <WorkoutCard
                    item={w}
                    onPress={() => handleOpenDetail(w.id)}
                  />
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏋️</Text>
                <Text style={styles.emptyTitle}>No workouts yet</Text>
                <Text style={styles.emptyBody}>
                  Start your first workout from the Workout tab!
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
                  style={[bodyStyles.infoValue, { color: totalChangeColor }]}
                >
                  {totalChangeDisplay}
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

      {/* Workout Detail Modal */}
      <WorkoutDetailModal
        visible={showDetail}
        sessionId={selectedSessionId}
        onClose={() => {
          setShowDetail(false);
          setSelectedSessionId(null);
        }}
      />
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
