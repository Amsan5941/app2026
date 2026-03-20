import SummaryStats from "@/components/SummaryStats";
import { supabase } from "@/constants/supabase";
import { DarkPalette, Radii, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useLoadingGuard } from "@/hooks/useLoadingGuard";
import { useTheme } from "@/hooks/useTheme";
import { getCurrentUserBioProfile } from "@/services/bioProfile";
import {
  deleteProgressPhoto,
  getProgressPhotos,
  uploadProgressPhoto,
} from "@/services/progressPhotos";
import { getCachedUserId, getUserId } from "@/services/userCache";
import { getWeightHistory } from "@/services/weightTracking";
import {
  WorkoutHistoryItem,
  WorkoutSession,
  getWeeklyWorkoutStats,
  getWorkoutHistory,
  getWorkoutSession,
} from "@/services/workoutTracking";
import { formatTime } from "@/utils/formatTime";
import { log } from "@/utils/log";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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

/** Empty fallback — shown only when there is genuinely no weight data yet. */
const EMPTY_WEIGHT_DATA: WeightEntry[] = [];

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
  const { palette: Palette } = useTheme();
  const chartStyles = useMemo(() => makeChartStyles(Palette), [Palette]);
  // Must be declared before any early return (Rules of Hooks)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Need at least 2 points to draw a meaningful chart
  if (data.length < 2) {
    return (
      <View style={chartStyles.card}>
        <Text style={chartStyles.title}>Weight Trend</Text>
        <Text
          style={{
            color: Palette.textMuted,
            textAlign: "center",
            paddingVertical: 30,
          }}
        >
          Log at least 2 days of weight to see your trend chart.
        </Text>
      </View>
    );
  }

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

  function handlePointPress(index: number) {
    setSelectedIndex(selectedIndex === index ? null : index);
  }

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

      <Pressable
        onPress={() => setSelectedIndex(null)}
        style={{ position: "relative" }}
      >
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
          {/* Vertical indicator line for selected point */}
          {selectedIndex !== null && (
            <Line
              x1={points[selectedIndex].x}
              y1={paddingY}
              x2={points[selectedIndex].x}
              y2={paddingY + chartH}
              stroke={Palette.accent + "40"}
              strokeWidth={1}
              strokeDasharray="4,3"
            />
          )}
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
              r={selectedIndex === i ? 6 : 4}
              fill={selectedIndex === i ? Palette.accentLight : Palette.accent}
              stroke={selectedIndex === i ? Palette.accent : Palette.bg}
              strokeWidth={2}
            />
          ))}
        </Svg>

        {/* Invisible touch targets over each point */}
        {points.map((p, i) => (
          <Pressable
            key={i}
            onPress={(e) => {
              e.stopPropagation();
              handlePointPress(i);
            }}
            hitSlop={6}
            style={{
              position: "absolute",
              left: p.x - 16,
              top: p.y - 16,
              width: 32,
              height: 32,
              borderRadius: 16,
            }}
          />
        ))}

        {/* Tooltip for selected point */}
        {selectedIndex !== null && (
          <View
            style={[
              chartStyles.tooltip,
              {
                left: Math.max(
                  4,
                  Math.min(points[selectedIndex].x - 44, width - 92),
                ),
                top: Math.max(0, points[selectedIndex].y - 48),
              },
            ]}
          >
            <Text style={chartStyles.tooltipWeight}>
              {data[selectedIndex].weight} lbs
            </Text>
            <Text style={chartStyles.tooltipDate}>
              {data[selectedIndex].date}
            </Text>
            <View
              style={[
                chartStyles.tooltipArrow,
                {
                  left: Math.min(
                    Math.max(
                      points[selectedIndex].x -
                        Math.max(
                          4,
                          Math.min(points[selectedIndex].x - 44, width - 92),
                        ) -
                        4,
                      8,
                    ),
                    76,
                  ),
                },
              ]}
            />
          </View>
        )}
      </Pressable>

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

function makeChartStyles(P: typeof DarkPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: P.bgCard,
      borderRadius: Radii.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.xl,
      borderWidth: 1,
      borderColor: P.border,
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
      color: P.textPrimary,
    },
    subtitle: {
      fontSize: 12,
      color: P.textMuted,
      marginTop: 2,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: Radii.full,
    },
    badgeLoss: { backgroundColor: P.successMuted },
    badgeGain: { backgroundColor: P.warningMuted },
    badgeText: {
      fontSize: 12,
      fontWeight: "700",
    },
    badgeLossText: { color: P.success },
    badgeGainText: { color: P.warning },
    currentWeight: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: Spacing.md,
      gap: 4,
    },
    weightValue: {
      fontSize: 36,
      fontWeight: "800",
      color: P.textPrimary,
    },
    weightUnit: {
      fontSize: 16,
      fontWeight: "600",
      color: P.textSecondary,
    },
    dateRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: Spacing.sm,
      paddingHorizontal: 4,
    },
    dateLabel: {
      fontSize: 10,
      color: P.textMuted,
    },
    tooltip: {
      position: "absolute",
      backgroundColor: P.bgElevated,
      borderRadius: Radii.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: P.accent + "40",
      alignItems: "center",
      minWidth: 88,
      shadowColor: P.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
      zIndex: 10,
    },
    tooltipWeight: {
      fontSize: 14,
      fontWeight: "800",
      color: P.textPrimary,
    },
    tooltipDate: {
      fontSize: 10,
      color: P.textMuted,
      marginTop: 1,
    },
    tooltipArrow: {
      position: "absolute",
      bottom: -5,
      width: 10,
      height: 10,
      backgroundColor: P.bgElevated,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: P.accent + "40",
      transform: [{ rotate: "45deg" }],
    },
  });
}

// ── Workout History Card ────────────────────────────────────
function WorkoutCard({
  item,
  onPress,
}: {
  item: WorkoutHistoryItem;
  onPress: () => void;
}) {
  const { palette: Palette } = useTheme();
  const wkStyles = useMemo(() => makeWkStyles(Palette), [Palette]);
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
  const { palette: Palette } = useTheme();
  const detailStyles = useMemo(() => makeDetailStyles(Palette), [Palette]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId || !visible) {
      setSession(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    getWorkoutSession(sessionId)
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setSession(res.data);
        }
      })
      .catch((e) => {
        log.error("WorkoutDetailModal", "Failed to load session: " + String(e));
      })
      .finally(() => {
        if (mounted) setLoading(false);
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

function makeDetailStyles(P: typeof DarkPalette) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: P.overlay,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: P.bgElevated,
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
      backgroundColor: P.border,
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
      color: P.textPrimary,
    },
    date: {
      fontSize: 13,
      color: P.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: P.bgCard,
      alignItems: "center",
      justifyContent: "center",
    },
    closeBtnText: {
      color: P.textSecondary,
      fontSize: 14,
      fontWeight: "700",
    },
    durationBadge: {
      backgroundColor: P.accentMuted,
      borderRadius: Radii.md,
      paddingVertical: 10,
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.lg,
      alignSelf: "flex-start",
    },
    durationText: {
      color: P.accent,
      fontSize: 13,
      fontWeight: "700",
    },
    exerciseCard: {
      backgroundColor: P.bgCard,
      borderRadius: Radii.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: P.border,
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
      backgroundColor: P.accentMuted,
      alignItems: "center",
      justifyContent: "center",
      marginRight: Spacing.sm,
    },
    exerciseName: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
      color: P.textPrimary,
    },
    setCount: {
      fontSize: 12,
      color: P.textSecondary,
      fontWeight: "600",
    },
    setHeaderRow: {
      flexDirection: "row",
      paddingBottom: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: P.divider,
      marginBottom: Spacing.sm,
    },
    setHeaderText: {
      fontSize: 11,
      fontWeight: "700",
      color: P.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    setRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: P.divider,
    },
    setText: {
      fontSize: 14,
      color: P.textPrimary,
      fontWeight: "600",
    },
  });
}

function makeWkStyles(P: typeof DarkPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: P.bgCard,
      borderRadius: Radii.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: P.border,
    },
    dateCol: {
      alignItems: "center",
      width: 46,
    },
    day: {
      fontSize: 11,
      fontWeight: "700",
      color: P.accent,
      textTransform: "uppercase",
    },
    monthDay: {
      fontSize: 12,
      color: P.textSecondary,
      marginTop: 2,
    },
    divider: {
      width: 1,
      height: 36,
      backgroundColor: P.border,
      marginHorizontal: Spacing.md,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: P.accentMuted,
      alignItems: "center",
      justifyContent: "center",
      marginRight: Spacing.md,
    },
    icon: { fontSize: 20 },
    info: { flex: 1 },
    type: {
      fontSize: 16,
      fontWeight: "700",
      color: P.textPrimary,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
      gap: 6,
    },
    meta: {
      fontSize: 12,
      color: P.textSecondary,
    },
    metaDot: {
      color: P.textMuted,
      fontSize: 10,
    },
    chevron: {
      fontSize: 14,
      color: P.textMuted,
      marginLeft: Spacing.sm,
    },
  });
}

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
  const { palette: Palette } = useTheme();
  const tabStyles = useMemo(() => makeTabStyles(Palette), [Palette]);
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

function makeTabStyles(P: typeof DarkPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      backgroundColor: P.bgCard,
      borderRadius: Radii.md,
      padding: 3,
      marginBottom: Spacing.xl,
      borderWidth: 1,
      borderColor: P.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: Radii.sm,
      alignItems: "center",
    },
    tabActive: {
      backgroundColor: P.accent,
    },
    text: {
      fontSize: 13,
      fontWeight: "700",
      color: P.textMuted,
    },
    textActive: {
      color: P.white,
    },
  });
}

// ── Main Screen ─────────────────────────────────────────────
export default function ProgressScreen() {
  const { user, authReady } = useAuth();
  const insets = useSafeAreaInsets();
  const { palette: Palette } = useTheme();
  const bodyStyles = useMemo(() => makeBodyStyles(Palette), [Palette]);
  const styles = useMemo(() => makeProgressStyles(Palette), [Palette]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [weightData, setWeightData] =
    useState<WeightEntry[]>(EMPTY_WEIGHT_DATA);
  const [loadingWeights, setLoadingWeights] = useState(false);
  const [weightUnit, setWeightUnit] = useState<string>("lbs");
  const [bioProfile, setBioProfile] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { timedOut } = useLoadingGuard("ProgressScreen", loadingWeights);

  // Workout state
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>(
    [],
  );
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [loadingMoreWorkouts, setLoadingMoreWorkouts] = useState(false);
  const [workoutCursor, setWorkoutCursor] = useState<string | null>(null);
  const [hasMoreWorkouts, setHasMoreWorkouts] = useState(false);
  const workoutFetchRef = useRef(false);
  const [weeklyStats, setWeeklyStats] = useState({
    workoutCount: 0,
    totalSets: 0,
    totalDuration: 0,
  });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [showDetail, setShowDetail] = useState(false);

  // Progress photos state
  const [photos, setPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    let mounted = true;
    async function loadWeights() {
      setLoadingWeights(true);
      setLoadError(null);
      log.time("history:loadWeights");
      try {
        // only call getCurrentUserBioProfile if there's an auth session (no network call)
        const {
          data: { session },
        } = await supabase.auth.getSession();
        let bpRes: any = { success: false, profile: null };
        if (session?.user) {
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
          setWeightData(EMPTY_WEIGHT_DATA);
        }
      } catch (e) {
        log.error("ProgressScreen", "Error loading weight data: " + String(e));
        setLoadError("Could not load weight data.");
        setWeightData(EMPTY_WEIGHT_DATA);
      } finally {
        if (mounted) setLoadingWeights(false);
        log.timeEnd("history:loadWeights");
      }
    }
    loadWeights();

    // Set up realtime listener so chart updates when user logs weight
    let channel: any = null;
    (async () => {
      try {
        const userId = getCachedUserId();
        if (!userId) return;

        channel = supabase
          .channel("public:body_weight")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "body_weight",
              filter: `user_id=eq.${userId}`,
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
              filter: `user_id=eq.${userId}`,
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
  }, [authReady, user?.id]);

  // Load workout history with pagination
  const loadWorkouts = useCallback(
    async (reset = true) => {
      if (workoutFetchRef.current) return;
      workoutFetchRef.current = true;

      if (reset) {
        setLoadingWorkouts(true);
      } else {
        setLoadingMoreWorkouts(true);
      }

      try {
        const cursorToUse = reset ? null : workoutCursor;
        const [histRes, statsRes] = await Promise.all([
          getWorkoutHistory(20, cursorToUse),
          reset ? getWeeklyWorkoutStats() : Promise.resolve(null),
        ]);

        if (histRes.success) {
          const newItems = histRes.data || [];
          if (reset) {
            setWorkoutHistory(newItems);
          } else {
            setWorkoutHistory((prev) => {
              const existingIds = new Set(prev.map((w) => w.id));
              const unique = newItems.filter((w) => !existingIds.has(w.id));
              return [...prev, ...unique];
            });
          }
          setHasMoreWorkouts(histRes.has_more ?? false);
          setWorkoutCursor(histRes.next_cursor ?? null);
        }
        if (statsRes && statsRes.success) {
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
        setLoadingMoreWorkouts(false);
        workoutFetchRef.current = false;
      }
    },
    [workoutCursor],
  );

  const loadMoreWorkouts = useCallback(() => {
    if (!hasMoreWorkouts || loadingMoreWorkouts || workoutFetchRef.current)
      return;
    loadWorkouts(false);
  }, [hasMoreWorkouts, loadingMoreWorkouts, loadWorkouts]);

  // ── Initial load when auth hydrates (useFocusEffect alone won't fire
  // if the screen is already focused when authReady transitions false→true)
  useEffect(() => {
    if (authReady && user) loadWorkouts(true);
  }, [authReady, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reload workout list every time the tab gains focus ─────
  useFocusEffect(
    useCallback(() => {
      loadWorkouts(true);
      if (activeTab === "Body" && authReady && user) {
        void loadPhotosForUser();
      }
    }, [loadWorkouts, activeTab, authReady, user?.id]),
  );

  const handleOpenDetail = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowDetail(true);
  };

  // Load user's progress photos from DB + storage
  async function loadPhotosForUser() {
    try {
      setLoadingPhotos(true);
      const userId = await getUserId();
      if (!userId) return;
      const res = await getProgressPhotos(userId);
      if (res.success) setPhotos(res.data || []);
      else {
        console.error("getProgressPhotos failed", res.error);
      }
    } catch (e) {
      console.error("loadPhotosForUser", e);
    } finally {
      setLoadingPhotos(false);
    }
  }

  // Load photos when the user opens the Body tab.
  useEffect(() => {
    if (!authReady || !user || activeTab !== "Body") return;
    loadPhotosForUser();
  }, [authReady, user?.id, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pickAndUploadPhoto() {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera permission required");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      const cancelled =
        (result as any).cancelled ?? (result as any).canceled ?? false;
      if (cancelled) return;

      const uri = (result as any).uri ?? (result as any).assets?.[0]?.uri;
      if (!uri) return;

      const manip = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const resp = await fetch(manip.uri);
      const bytes = new Uint8Array(await resp.arrayBuffer());

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const userId = await getUserId();
      if (!userId) throw new Error("Could not resolve user ID");

      const fileName = `${Date.now()}.jpg`;
      const up = await uploadProgressPhoto({
        authUid: session.user.id,
        userId: userId,
        fileName,
        blob: bytes,
      });
      if (!up.success) throw up.error;
      await loadPhotosForUser();
    } catch (e) {
      console.error("pickAndUploadPhoto", e);
      Alert.alert("Upload failed", String((e as any)?.message || e));
    }
  }

  async function handleDeletePhoto(p: any) {
    Alert.alert("Delete photo?", "This will remove the photo permanently.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await deleteProgressPhoto(p.id, p.storage_path);
          if (res.success) loadPhotosForUser();
        },
      },
    ]);
  }

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
              workoutsDone={weeklyStats.workoutCount}
              workoutsGoal={null}
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
              <>
                {workoutHistory.map((w) => (
                  <View key={w.id} style={{ marginBottom: Spacing.md }}>
                    <WorkoutCard
                      item={w}
                      onPress={() => handleOpenDetail(w.id)}
                    />
                  </View>
                ))}
                {hasMoreWorkouts && (
                  <Pressable
                    onPress={loadMoreWorkouts}
                    style={{
                      paddingVertical: 16,
                      alignItems: "center",
                      marginBottom: Spacing.md,
                    }}
                  >
                    {loadingMoreWorkouts ? (
                      <ActivityIndicator color={Palette.accent} />
                    ) : (
                      <Text
                        style={{
                          color: Palette.accent,
                          fontWeight: "700",
                          fontSize: 14,
                        }}
                      >
                        Load More
                      </Text>
                    )}
                  </Pressable>
                )}
              </>
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

            {/* Progress photos section */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
              Progress Photos
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: Spacing.md,
              }}
            >
              <Text style={{ color: Palette.textSecondary }}>
                Take photos to track your progress over time
              </Text>
              <TouchableOpacity
                onPress={pickAndUploadPhoto}
                style={{
                  backgroundColor: Palette.accent,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  Add Photo
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: Spacing.lg }}>
              {loadingPhotos ? (
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                  <ActivityIndicator color={Palette.accent} />
                </View>
              ) : photos.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📷</Text>
                  <Text style={styles.emptyTitle}>No progress photos yet</Text>
                  <Text style={styles.emptyBody}>
                    Tap "Add Photo" to take your first progress picture.
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  {photos.map((item, index) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        setViewerIndex(index);
                        setViewerVisible(true);
                      }}
                      onLongPress={() => handleDeletePhoto(item)}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 8,
                        overflow: "hidden",
                      }}
                    >
                      <Image
                        source={{ uri: item.url }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* full-screen viewer */}
            <Modal
              visible={viewerVisible}
              transparent={false}
              onRequestClose={() => setViewerVisible(false)}
            >
              <View style={{ flex: 1, backgroundColor: Palette.bgElevated }}>
                <Pressable
                  onPress={() => setViewerVisible(false)}
                  hitSlop={12}
                  style={{
                    position: "absolute",
                    top: insets.top + 8,
                    left: 12,
                    zIndex: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: Palette.textSecondary }}>Close ✕</Text>
                </Pressable>
                {viewerIndex != null && photos[viewerIndex] && (
                  <Image
                    source={{ uri: photos[viewerIndex].url }}
                    style={{ flex: 1, width: "100%" }}
                    resizeMode="contain"
                  />
                )}
              </View>
            </Modal>
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

function makeBodyStyles(P: typeof DarkPalette) {
  return StyleSheet.create({
    infoCard: {
      backgroundColor: P.bgCard,
      borderRadius: Radii.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: P.border,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: Spacing.md,
    },
    infoDivider: {
      height: 1,
      backgroundColor: P.divider,
    },
    infoLabel: {
      fontSize: 14,
      color: P.textSecondary,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: "700",
      color: P.textPrimary,
    },
  });
}

function makeProgressStyles(P: typeof DarkPalette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: P.bg,
    },
    scrollContent: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: P.textPrimary,
      letterSpacing: -0.5,
    },
    pageSub: {
      fontSize: 14,
      color: P.textSecondary,
      marginTop: 4,
      marginBottom: Spacing.xl,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: P.textPrimary,
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
      color: P.textPrimary,
      marginBottom: Spacing.sm,
    },
    emptyBody: {
      fontSize: 14,
      color: P.textSecondary,
      textAlign: "center",
    },
  });
}
