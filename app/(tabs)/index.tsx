import DailyWeightPrompt from "@/components/DailyWeightPrompt";
import { supabase } from "@/constants/supabase";
import { Palette, Radii, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useSteps } from "@/hooks/useSteps";
import { getCurrentUserBioProfile } from "@/services/bioProfile";
import { getDailySummary } from "@/services/foodRecognition";
import {
  DAILY_WATER_GOAL,
  getTodayWaterIntake,
  logWaterGlass,
  removeWaterGlass,
} from "@/services/waterTracking";
import { hasLoggedWeightToday } from "@/services/weightTracking";
import { getTodayWorkouts, getWeeklyWorkoutStats } from "@/services/workoutTracking";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Stop,
  LinearGradient as SvgGradient,
} from "react-native-svg";

// ── Motivational quotes ─────────────────────────────────────
const QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Strive for progress, not perfection.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "Champions are made when nobody is watching.",
  "Discipline is choosing between what you want now and what you want most.",
  "You don't have to be extreme, just consistent.",
  "Success isn't always about greatness. It's about consistency.",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayFormatted(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

// ── Animated Progress Ring ──────────────────────────────────
function ProgressRing({
  progress = 0,
  size = 160,
  strokeWidth = 12,
}: {
  progress?: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <View style={ringStyles.container}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={Palette.gradientStart} />
            <Stop offset="100%" stopColor={Palette.gradientEnd} />
          </SvgGradient>
        </Defs>
        {/* Background track */}
        <Circle
          stroke={Palette.border}
          fill="none"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <Circle
          stroke="url(#ringGrad)"
          fill="none"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(progress, 1))}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      <View style={ringStyles.inner}>
        <Text style={ringStyles.pct}>{Math.round(progress * 100)}%</Text>
        <Text style={ringStyles.label}>daily goal</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: { justifyContent: "center", alignItems: "center" },
  inner: {
    position: "absolute",
    alignItems: "center",
  },
  pct: {
    fontSize: 32,
    fontWeight: "800",
    color: Palette.textPrimary,
    letterSpacing: -1,
  },
  label: {
    fontSize: 12,
    color: Palette.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },
});

// ── Quick-Action Card ───────────────────────────────────────
function QuickAction({
  icon,
  label,
  value,
  sub,
  accentColor = Palette.accent,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accentColor?: string;
}) {
  return (
    <View style={[qaStyles.card, { borderColor: accentColor + "25" }]}>
      <View
        style={[qaStyles.iconWrap, { backgroundColor: accentColor + "18" }]}
      >
        <Text style={qaStyles.icon}>{icon}</Text>
      </View>
      <Text style={qaStyles.value}>{value}</Text>
      <Text style={qaStyles.label}>{label}</Text>
      {sub ? <Text style={qaStyles.sub}>{sub}</Text> : null}
    </View>
  );
}

const qaStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  icon: { fontSize: 22 },
  value: {
    fontSize: 22,
    fontWeight: "800",
    color: Palette.textPrimary,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: Palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sub: {
    fontSize: 10,
    color: Palette.textMuted,
    marginTop: 2,
  },
});

// ── Summary Stats (copied from history.tsx) ─────────────────
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

// ── Home Screen ─────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  const steps = useSteps();
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [hasLoggedWeight, setHasLoggedWeight] = useState(false);
  const [bioProfile, setBioProfile] = useState<any | null>(null);
  const [weeklyStats, setWeeklyStats] = useState({
    workoutCount: 0,
    totalSets: 0,
    totalDuration: 0,
  });
  const [consumedCalories, setConsumedCalories] = useState(0);
  const [mealsLogged, setMealsLogged] = useState({
    breakfast: false,
    lunch: false,
    dinner: false,
  });
  const [hasWorkoutToday, setHasWorkoutToday] = useState(false);
  const [waterIntake, setWaterIntake] = useState(0);
  const [quote] = useState(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
  );
  const [firstname, setFirstname] = useState("");

  // Fetch user's first name
  useEffect(() => {
    if (!user) {
      // reset UI to defaults when no user is signed in
      setFirstname("");
      setBioProfile(null);
      setConsumedCalories(0);
      setMealsLogged({ breakfast: false, lunch: false, dinner: false });
      setHasWorkoutToday(false);
      setHasLoggedWeight(false);
      setWeeklyStats({ workoutCount: 0, totalSets: 0, totalDuration: 0 });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("firstname")
        .eq("auth_id", user.id)
        .single();
      if (data?.firstname) setFirstname(data.firstname);
      try {
        const bp = await getCurrentUserBioProfile();
        if (bp.success && bp.profile) setBioProfile(bp.profile);
      } catch (e) {
        // ignore
      }
    })();
  }, [user]);

  // Load weekly workout stats on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getWeeklyWorkoutStats();
        if (!mounted) return;
        if (res.success) {
          setWeeklyStats({
            workoutCount: res.workoutCount || 0,
            totalSets: res.totalSets || 0,
            totalDuration: res.totalDuration || 0,
          });
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Refresh weekly workout stats when screen focuses
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        if (!user) return;
        try {
          const statsRes = await getWeeklyWorkoutStats();
          if (!mounted) return;
          if (statsRes.success) {
            setWeeklyStats({
              workoutCount: statsRes.workoutCount || 0,
              totalSets: statsRes.totalSets || 0,
              totalDuration: statsRes.totalDuration || 0,
            });
          }
        } catch (e) {
          // ignore
        }
      })();
      return () => {
        mounted = false;
      };
    }, [user]),
  );

  // Check if weight has been logged today (not just skipped)
  useEffect(() => {
    if (!user) return;
    checkWeightStatus();
    fetchCaloriesToday();
    refreshWaterIntake();
  }, [user]);

  // Re-check weight status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        updateDailyTasks();
      }
    }, [user]),
  );

  // Re-check weight status when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && user) {
        updateDailyTasks();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [user]);

  async function checkWeightStatus() {
    const hasLogged = await hasLoggedWeightToday();
    setHasLoggedWeight(hasLogged);
  }

  async function refreshWaterIntake() {
    const intake = await getTodayWaterIntake();
    setWaterIntake(intake);
  }

  async function handleAddWater() {
    const updated = await logWaterGlass();
    setWaterIntake(updated);
  }

  async function handleRemoveWater() {
    const updated = await removeWaterGlass();
    setWaterIntake(updated);
  }

  async function fetchCaloriesToday() {
    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const summary = await getDailySummary(today);
      const total = summary?.total_calories ?? 0;
      setConsumedCalories(total);

      // meals_by_type contains counts per meal type
      const meals = summary?.meals_by_type ?? {};
      setMealsLogged({
        breakfast: (meals.breakfast?.count ?? 0) > 0,
        lunch: (meals.lunch?.count ?? 0) > 0,
        dinner: (meals.dinner?.count ?? 0) > 0,
      });

      // check for workouts today
      try {
        const wres = await getTodayWorkouts();
        setHasWorkoutToday(!!(wres.success && (wres.data || []).length > 0));
      } catch (e) {
        setHasWorkoutToday(false);
      }
    } catch (e) {
      // ignore
    }
  }

  // Consolidated update to ensure UI reflects actual user data
  async function updateDailyTasks() {
    if (!user) return;
    try {
      // update calories and meals
      await fetchCaloriesToday();

      // update workout state independently (more robust)
      try {
        const wres = await getTodayWorkouts();
        const has = Array.isArray(wres?.data)
          ? wres.data.length > 0
          : !!(
              wres &&
              (wres as any).success &&
              (wres as any).data &&
              (wres as any).data.length > 0
            );
        setHasWorkoutToday(has);
      } catch (e) {
        setHasWorkoutToday(false);
      }

      // update weight logged status
      const hasLogged = await hasLoggedWeightToday();
      setHasLoggedWeight(hasLogged);

      // update water intake
      await refreshWaterIntake();
    } catch (err) {
      // ignore
    }
  }

  const displayName = firstname || "Athlete";

  // Compute workouts this week same as History SummaryStats
  const workoutsDone = bioProfile?.workout_counter ?? weeklyStats.workoutCount;
  const workoutsGoal = bioProfile?.workouts_per_week ?? null;
  const workoutsValue =
    workoutsGoal != null
      ? `${workoutsDone ?? 0}/${workoutsGoal}`
      : String(workoutsDone ?? 0);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {displayName} 👋
            </Text>
            <Text style={styles.date}>{getTodayFormatted()}</Text>
          </View>
          <View style={styles.headerBadges}>
            {!hasLoggedWeight && user && (
              <Pressable
                onPress={() => setShowWeightPrompt(true)}
                style={({ pressed }) => [
                  styles.weightBadge,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.weightBadgeIcon}>⚖️</Text>
              </Pressable>
            )}
            <View style={styles.streakBadge}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakCount}>0</Text>
            </View>
          </View>
        </View>

        {/* ── Progress Ring ──────────────────── */}
        <View style={styles.ringSection}>
          {
            // compute composite progress from workout, meals, and weight
          }
          <ProgressRing
            progress={(() => {
              const WORKOUT_PCT = 0.3; // 30%
              const WEIGHT_PCT = 0.1; // 10%
              const BREAKFAST_PCT = 0.2; // 20%
              const LUNCH_PCT = 0.2; // 20%
              const DINNER_PCT = 0.2; // 20%

              let score = 0;
              if (hasWorkoutToday) score += WORKOUT_PCT;
              if (hasLoggedWeight) score += WEIGHT_PCT;
              if (mealsLogged.breakfast) score += BREAKFAST_PCT;
              if (mealsLogged.lunch) score += LUNCH_PCT;
              if (mealsLogged.dinner) score += DINNER_PCT;

              return Math.min(score, 1);
            })()}
          />
          <Text style={styles.legendHeader}>Daily Tasks</Text>
          <View style={styles.legendRow}>
            {(() => {
              const items = [
                {
                  key: "workout",
                  icon: "🔥",
                  done: hasWorkoutToday,
                  pct: 30,
                  label: "Workout",
                },
                {
                  key: "breakfast",
                  icon: "🍳",
                  done: mealsLogged.breakfast,
                  pct: 20,
                  label: "Breakfast",
                },
                {
                  key: "lunch",
                  icon: "🥗",
                  done: mealsLogged.lunch,
                  pct: 20,
                  label: "Lunch",
                },
                {
                  key: "dinner",
                  icon: "🍽️",
                  done: mealsLogged.dinner,
                  pct: 20,
                  label: "Dinner",
                },
                {
                  key: "weight",
                  icon: "⚖️",
                  done: hasLoggedWeight,
                  pct: 10,
                  label: "Log Weight",
                },
              ];

              return items.map((it) => (
                <View key={it.key} style={styles.legendItemRow}>
                  <Text
                    style={[
                      styles.legendIcon,
                      it.done
                        ? { color: Palette.success }
                        : { color: Palette.textMuted },
                    ]}
                  >
                    {it.done ? "✅" : "○"}
                  </Text>
                  <Text
                    style={[
                      styles.legendLabel,
                      it.done
                        ? { color: Palette.textPrimary }
                        : { color: Palette.textSecondary },
                    ]}
                  >
                    {it.icon} {it.label}
                  </Text>
                </View>
              ));
            })()}
          </View>
        </View>

        {/* ── Quick Stats ────────────────────── */}
        <View style={styles.statsRow}>
          <QuickAction
            icon="🏋️"
            label="Workouts"
            value={workoutsValue}
            sub="this week"
            accentColor={Palette.accent}
          />
          <QuickAction
            icon="🔥"
            label="Calories"
            value={Math.round(consumedCalories).toString()}
            sub="eaten today"
            accentColor={Palette.warning}
          />
          <QuickAction
            icon="👣"
            label="Steps"
            value={steps.todayStepsFormatted}
            sub="today"
            accentColor={Palette.success}
          />
        </View>

        {/* ── Water Intake Tracker ───────────── */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalIcon}>💧</Text>
            <Text style={styles.goalTitle}>Water Intake</Text>
            <Text style={styles.waterCount}>
              {waterIntake}/{DAILY_WATER_GOAL} glasses
            </Text>
          </View>
          <View style={styles.waterRow}>
            {Array.from({ length: DAILY_WATER_GOAL }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.waterDrop,
                  i < waterIntake
                    ? styles.waterDropFilled
                    : styles.waterDropEmpty,
                ]}
              >
                <Text style={{ fontSize: 18 }}>
                  {i < waterIntake ? "💧" : "○"}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.goalProgress}>
            <View style={styles.goalBarTrack}>
              <View
                style={[
                  styles.goalBarFill,
                  {
                    width: `${Math.min(waterIntake / DAILY_WATER_GOAL, 1) * 100}%`,
                    backgroundColor: "#38BDF8",
                  },
                ]}
              />
            </View>
            <Text style={[styles.goalPct, { color: "#38BDF8" }]}>
              {Math.round(Math.min(waterIntake / DAILY_WATER_GOAL, 1) * 100)}%
            </Text>
          </View>
          <View style={styles.waterButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.waterBtnMinus,
                pressed && { opacity: 0.7 },
                waterIntake === 0 && { opacity: 0.3 },
              ]}
              onPress={handleRemoveWater}
              disabled={waterIntake === 0}
            >
              <Text style={styles.waterBtnText}>−</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.waterBtnPlus,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleAddWater}
            >
              <Text style={styles.waterBtnPlusText}>+ Log Glass</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Calories Remaining Card ─────────── */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalIcon}>🍽️</Text>
            <Text style={styles.goalTitle}>Calories Left</Text>
          </View>
          {bioProfile?.calorie_goal ? (
            <>
              <Text style={styles.goalBody}>
                {Math.max(
                  Math.round((bioProfile.calorie_goal ?? 0) - consumedCalories),
                  0,
                )}{" "}
                cal left
              </Text>
              <View style={styles.goalProgress}>
                <View style={styles.goalBarTrack}>
                  <View
                    style={[
                      styles.goalBarFill,
                      {
                        width: `${
                          Math.min(
                            (consumedCalories || 0) /
                              (bioProfile?.calorie_goal || 1),
                            1,
                          ) * 100
                        }%`,
                        backgroundColor: Palette.warning,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.goalPct}>
                  {bioProfile.calorie_goal
                    ? `${Math.round(
                        Math.min(
                          (consumedCalories / bioProfile.calorie_goal) * 100,
                          100,
                        ),
                      )}%`
                    : "—"}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: Palette.textMuted,
                  marginTop: Spacing.sm,
                }}
              >
                {Math.round(consumedCalories)} eaten • {bioProfile.calorie_goal}{" "}
                goal
              </Text>
            </>
          ) : (
            <Text style={styles.goalBody}>
              Set a daily calorie goal in your profile
            </Text>
          )}
        </View>

        {/* ── Motivational Quote ─────────────── */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteIcon}>💬</Text>
          <Text style={styles.quoteText}>"{quote}"</Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Weight Prompt Modal (manual trigger after skip) ── */}
      <DailyWeightPrompt
        visible={showWeightPrompt}
        onComplete={() => {
          setShowWeightPrompt(false);
          checkWeightStatus();
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Palette.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: Palette.textPrimary,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginTop: 4,
  },
  weightBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.accentMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Palette.accent + "30",
  },
  weightBadgeIcon: {
    fontSize: 20,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.warningMuted,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    gap: 4,
  },
  streakIcon: { fontSize: 18 },
  streakCount: {
    fontSize: 16,
    fontWeight: "800",
    color: Palette.warning,
  },

  // Progress ring
  ringSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },

  // Goal card
  goalCard: {
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  goalIcon: { fontSize: 20 },
  goalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  goalBody: {
    fontSize: 14,
    color: Palette.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  goalProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  goalBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Palette.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  goalBarFill: {
    height: "100%",
    backgroundColor: Palette.accent,
    borderRadius: 4,
  },
  goalPct: {
    fontSize: 13,
    fontWeight: "700",
    color: Palette.accent,
  },

  // Quote card
  quoteCard: {
    backgroundColor: Palette.accentMuted,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: Palette.accent + "30",
  },
  quoteIcon: { fontSize: 20, marginTop: 2 },
  quoteText: {
    flex: 1,
    fontSize: 14,
    fontStyle: "italic",
    color: Palette.accentLight,
    lineHeight: 22,
  },
  legendRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  legendHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: Palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    alignSelf: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.sm,
  },
  legendItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  legendIcon: {
    fontSize: 16,
  },
  legendLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  legendPct: {
    fontSize: 12,
    marginLeft: 6,
    color: Palette.textSecondary,
    fontWeight: "700",
  },

  // Water intake tracker
  waterCount: {
    fontSize: 13,
    color: "#38BDF8",
    fontWeight: "700",
    marginLeft: "auto",
  },
  waterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    justifyContent: "center",
  },
  waterDrop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  waterDropFilled: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  waterDropEmpty: {
    backgroundColor: Palette.bgCard,
  },
  waterButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  waterBtnMinus: {
    width: 44,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Palette.bgCard,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  waterBtnText: {
    fontSize: 20,
    fontWeight: "700",
    color: Palette.textSecondary,
  },
  waterBtnPlus: {
    flex: 1,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  waterBtnPlusText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#38BDF8",
    letterSpacing: 0.3,
  },
});
