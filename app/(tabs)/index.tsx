import DailyWeightPrompt from "@/components/DailyWeightPrompt";
import { supabase } from "@/constants/supabase";
import { DarkPalette, Radii, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useSteps } from "@/hooks/useSteps";
import { useTheme } from "@/hooks/useTheme";
import { getCurrentUserBioProfile } from "@/services/bioProfile";
import { getDailySummary } from "@/services/foodRecognition";
import {
  DAILY_WATER_GOAL,
  getTodayWaterIntake,
  logWaterGlass,
  removeWaterGlass,
} from "@/services/waterTracking";
import { hasLoggedWeightToday } from "@/services/weightTracking";
import {
  getTodayWorkouts,
  getWeeklyWorkoutStats,
} from "@/services/workoutTracking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const { palette: Palette } = useTheme();
  const ringStyles = useMemo(() => makeRingStyles(Palette), [Palette]);
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

function makeRingStyles(P: typeof DarkPalette) {
  return StyleSheet.create({
    container: { justifyContent: "center", alignItems: "center" },
    inner: {
      position: "absolute",
      alignItems: "center",
    },
    pct: {
      fontSize: 32,
      fontWeight: "800",
      color: P.textPrimary,
      letterSpacing: -1,
    },
    label: {
      fontSize: 12,
      color: P.textMuted,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginTop: 2,
    },
  });
}

// ── Quick-Action Card ───────────────────────────────────────
function QuickAction({
  icon,
  label,
  value,
  sub,
  accentColor = DarkPalette.accent,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accentColor?: string;
}) {
  const { palette: Palette } = useTheme();
  const qaStyles = useMemo(() => makeQaStyles(Palette), [Palette]);
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

function makeQaStyles(P: typeof DarkPalette) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: P.bgCard,
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
      color: P.textPrimary,
      marginBottom: 2,
    },
    label: {
      fontSize: 11,
      fontWeight: "600",
      color: P.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    sub: {
      fontSize: 10,
      color: P.textMuted,
      marginTop: 2,
    },
  });
}

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
  const { palette: Palette } = useTheme();
  const summaryStyles = useMemo(() => makeSummaryStyles(Palette), [Palette]);
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

function makeSummaryStyles(P: typeof DarkPalette) {
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

// ── Home Screen ─────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  const { palette: Palette } = useTheme();
  const styles = useMemo(() => makeHomeStyles(Palette), [Palette]);
  const steps = useSteps();
  const [loading, setLoading] = useState(true);
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
  // track EST date string so we can detect day rollover in Eastern Time (US)
  const [estDate, setEstDate] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }),
  );
  // track whether we've shown the congrats popup for the current EST day
  const [congratsShownDate, setCongratsShownDate] = useState<string | null>(
    null,
  );
  const [quote] = useState(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
  );
  const [firstname, setFirstname] = useState("");
  const [streakCount, setStreakCount] = useState<number>(0);

  // ── All-in-one parallel data loader ───────────────────────
  async function loadAllData(isInitial = false) {
    if (!user) return;
    if (isInitial) setLoading(true);

    try {
      // ensure estDate is current when loading initially
      const currentEst = new Date().toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
      });
      if (isInitial) setEstDate(currentEst);
      // update login streak (stored locally) on initial and subsequent loads
      try {
        await updateLoginStreak(currentEst);
      } catch (err) {
        // ignore
      }
      // Fire ALL requests in parallel instead of sequentially
      const [
        nameResult,
        bioResult,
        statsResult,
        weightResult,
        caloriesResult,
        workoutsResult,
        waterResult,
      ] = await Promise.allSettled([
        supabase
          .from("users")
          .select("firstname")
          .eq("auth_id", user.id)
          .single(),
        getCurrentUserBioProfile(),
        getWeeklyWorkoutStats(),
        hasLoggedWeightToday(),
        getDailySummary(new Date().toISOString().slice(0, 10)),
        getTodayWorkouts(),
        getTodayWaterIntake(),
      ]);
      // if backend tracks water by date, above getTodayWaterIntake should already return EST-aware count
      // ensure we keep estDate in sync with today in EST
      setEstDate(
        new Date().toLocaleDateString("en-CA", {
          timeZone: "America/New_York",
        }),
      );
      // Apply all results at once (single render batch)
      if (
        nameResult.status === "fulfilled" &&
        nameResult.value.data?.firstname
      ) {
        setFirstname(nameResult.value.data.firstname);
      }

      if (
        bioResult.status === "fulfilled" &&
        bioResult.value.success &&
        bioResult.value.profile
      ) {
        setBioProfile(bioResult.value.profile);
      }

      if (statsResult.status === "fulfilled" && statsResult.value.success) {
        setWeeklyStats({
          workoutCount: statsResult.value.workoutCount || 0,
          totalSets: statsResult.value.totalSets || 0,
          totalDuration: statsResult.value.totalDuration || 0,
        });
      }

      if (weightResult.status === "fulfilled") {
        setHasLoggedWeight(weightResult.value);
      }

      if (caloriesResult.status === "fulfilled") {
        const summary = caloriesResult.value;
        setConsumedCalories(summary?.total_calories ?? 0);
        const meals = summary?.meals_by_type ?? {};
        setMealsLogged({
          breakfast: (meals.breakfast?.count ?? 0) > 0,
          lunch: (meals.lunch?.count ?? 0) > 0,
          dinner: (meals.dinner?.count ?? 0) > 0,
        });
      }

      if (workoutsResult.status === "fulfilled") {
        const wres = workoutsResult.value;
        const has = Array.isArray(wres?.data)
          ? wres.data.length > 0
          : !!(
              wres &&
              (wres as any).success &&
              (wres as any).data &&
              (wres as any).data.length > 0
            );
        setHasWorkoutToday(has);
      }

      if (waterResult.status === "fulfilled") {
        setWaterIntake(waterResult.value);
      }
    } catch (err) {
      // ignore
    } finally {
      if (isInitial) setLoading(false);
    }
  }

  // --- Streak helpers (persisted in AsyncStorage per-user) ----------------
  function getStreakKey() {
    return user ? `streak:${user.id}` : null;
  }

  function getYesterdayEst(dateStr?: string) {
    const today = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
    // compute yesterday in America/New_York by shifting one day back
    const d = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
    );
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  }

  async function updateLoginStreak(currentEstDate?: string) {
    if (!user) return;
    const key = getStreakKey();
    if (!key) return;
    const today =
      currentEstDate ??
      new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) {
        // first-time: start streak at 1
        const payload = { count: 1, last: today };
        await AsyncStorage.setItem(key, JSON.stringify(payload));
        setStreakCount(1);
        return;
      }

      const parsed = JSON.parse(raw || "{}");
      const last = parsed.last as string | undefined;
      const count = Number(parsed.count) || 0;

      if (last === today) {
        // already recorded today
        setStreakCount(count);
        return;
      }

      const yesterday = getYesterdayEst();
      if (last === yesterday) {
        // consecutive day: increment
        const next = count + 1 || 1;
        const payload = { count: next, last: today };
        await AsyncStorage.setItem(key, JSON.stringify(payload));
        setStreakCount(next);
      } else {
        // broke streak: reset to 1
        const payload = { count: 1, last: today };
        await AsyncStorage.setItem(key, JSON.stringify(payload));
        setStreakCount(1);
      }
    } catch (err) {
      // fallback: set zero or keep existing
      // don't crash the app for storage errors
    }
  }

  // ── Initial load when user signs in ───────────────────────
  useEffect(() => {
    if (!user) {
      setFirstname("");
      setBioProfile(null);
      setConsumedCalories(0);
      setMealsLogged({ breakfast: false, lunch: false, dinner: false });
      setHasWorkoutToday(false);
      setHasLoggedWeight(false);
      setWeeklyStats({ workoutCount: 0, totalSets: 0, totalDuration: 0 });
      setWaterIntake(0);
      setLoading(false);
      return;
    }
    loadAllData(true);
  }, [user]);

  // ── Refresh on screen focus ───────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (user) loadAllData(false);
    }, [user]),
  );

  // ── Refresh when app comes to foreground ──────────────────
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && user) {
        loadAllData(false);
      }
    };
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [user]);

  // ── Detect EST day rollover and reset water at midnight EST ─────────────────
  useEffect(() => {
    // check every minute whether the date in America/New_York changed
    const check = () => {
      const todayEst = new Date().toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
      });
      if (todayEst !== estDate) {
        // new EST day: reset local water counter and refresh remote data
        setEstDate(todayEst);
        setWaterIntake(0);
        // allow the congrats popup to show again on the new day
        setCongratsShownDate(null);
        if (user) loadAllData(false);
      }
    };

    const id = setInterval(check, 60_000);
    // also run once immediately in case interval delay would miss exact rollover
    check();
    return () => clearInterval(id);
  }, [estDate, user]);

  async function handleAddWater() {
    if (waterIntake >= DAILY_WATER_GOAL) {
      Alert.alert(
        "Goal reached",
        "You've already reached your daily water goal.",
      );
      return;
    }

    const updated = await logWaterGlass();
    setWaterIntake(Math.min(updated, DAILY_WATER_GOAL));
  }

  async function handleRemoveWater() {
    const updated = await removeWaterGlass();
    setWaterIntake(updated);
  }

  // show a one-time congrats popup when the user reaches the daily water goal
  useEffect(() => {
    if (
      typeof DAILY_WATER_GOAL === "number" &&
      waterIntake >= DAILY_WATER_GOAL &&
      estDate &&
      congratsShownDate !== estDate
    ) {
      Alert.alert(
        "Nice!",
        `You hit ${DAILY_WATER_GOAL}/${DAILY_WATER_GOAL} glasses today — great job!`,
        [{ text: "Awesome" }],
      );
      setCongratsShownDate(estDate);
    }
  }, [waterIntake, estDate, congratsShownDate]);

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
      {loading && user ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Palette.accent} />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      ) : (
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
                <Text style={styles.streakCount}>{streakCount}</Text>
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
                const WORKOUT_PCT = 0.2; // 20% (reduced 10% to give to Water)
                const WATER_PCT = 0.1; // 10% new for water
                const WEIGHT_PCT = 0.1; // 10%
                const BREAKFAST_PCT = 0.2; // 20%
                const LUNCH_PCT = 0.2; // 20%
                const DINNER_PCT = 0.2; // 20%

                let score = 0;
                if (hasWorkoutToday) score += WORKOUT_PCT;
                if (waterIntake >= DAILY_WATER_GOAL) score += WATER_PCT;
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
                    pct: 20,
                    label: "Workout",
                  },
                  {
                    key: "water",
                    icon: "💧",
                    done: waterIntake >= DAILY_WATER_GOAL,
                    pct: 10,
                    label: "Water",
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
                    Math.round(
                      (bioProfile.calorie_goal ?? 0) - consumedCalories,
                    ),
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
                  {Math.round(consumedCalories)} eaten •{" "}
                  {bioProfile.calorie_goal} goal
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
      )}

      {/* ── Weight Prompt Modal (manual trigger after skip) ── */}
      <DailyWeightPrompt
        visible={showWeightPrompt}
        onComplete={() => {
          setShowWeightPrompt(false);
          loadAllData(false);
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
function makeHomeStyles(P: typeof DarkPalette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: P.bg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: Spacing.lg,
    },
    loadingText: {
      fontSize: 14,
      color: P.textSecondary,
      fontWeight: "600",
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
      color: P.textPrimary,
      letterSpacing: -0.5,
    },
    date: {
      fontSize: 14,
      color: P.textSecondary,
      marginTop: 4,
    },
    weightBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: P.accentMuted,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: P.accent + "30",
    },
    weightBadgeIcon: {
      fontSize: 20,
    },
    streakBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: P.warningMuted,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: Radii.full,
      gap: 4,
    },
    streakIcon: { fontSize: 18 },
    streakCount: {
      fontSize: 16,
      fontWeight: "800",
      color: P.warning,
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
      backgroundColor: P.bgCard,
      borderRadius: Radii.lg,
      padding: Spacing.xl,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: P.border,
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
      color: P.textPrimary,
    },
    goalBody: {
      fontSize: 14,
      color: P.textSecondary,
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
      backgroundColor: P.border,
      borderRadius: 4,
      overflow: "hidden",
    },
    goalBarFill: {
      height: "100%",
      backgroundColor: P.accent,
      borderRadius: 4,
    },
    goalPct: {
      fontSize: 13,
      fontWeight: "700",
      color: P.accent,
    },
    // Quote card
    quoteCard: {
      backgroundColor: P.accentMuted,
      borderRadius: Radii.lg,
      padding: Spacing.xl,
      flexDirection: "row",
      gap: Spacing.md,
      alignItems: "flex-start",
      borderWidth: 1,
      borderColor: P.accent + "30",
    },
    quoteIcon: { fontSize: 20, marginTop: 2 },
    quoteText: {
      flex: 1,
      fontSize: 14,
      fontStyle: "italic",
      color: P.accentLight,
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
      color: P.textSecondary,
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
      color: P.textSecondary,
    },
    legendPct: {
      fontSize: 12,
      marginLeft: 6,
      color: P.textSecondary,
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
      backgroundColor: P.bgCard,
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
      backgroundColor: P.bgCard,
      borderWidth: 1,
      borderColor: P.border,
      alignItems: "center",
      justifyContent: "center",
    },
    waterBtnText: {
      fontSize: 20,
      fontWeight: "700",
      color: P.textSecondary,
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
}
