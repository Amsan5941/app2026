import { supabase } from "@/constants/supabase";
import { Palette, Radii, Spacing } from "@/constants/theme";
import { useWorkoutTimer } from "@/hooks/use-workout-timer";
import { useAuth } from "@/hooks/useAuth";
import { formatTime } from "@/utils/formatTime";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from "react-native-svg";

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
      <View style={[qaStyles.iconWrap, { backgroundColor: accentColor + "18" }]}>
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

// ── Home Screen ─────────────────────────────────────────────
export default function HomeScreen() {
  const timer = useWorkoutTimer();
  const { user } = useAuth();
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [firstname, setFirstname] = useState("");

  // Fetch user's first name
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("firstname")
        .eq("auth_id", user.id)
        .single();
      if (data?.firstname) setFirstname(data.firstname);
    })();
  }, [user]);

  const handleStartWorkout = () => {
    timer.start();
    setIsWorkoutActive(true);
  };

  const handleStopWorkout = async () => {
    timer.stop();
    setIsWorkoutActive(false);
    setIsSaving(true);

    try {
      const { error } = await supabase.from("workouts").insert([
        {
          duration_seconds: timer.elapsedSeconds,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) {
        console.error("Error saving workout:", error);
      }
      setTimeout(() => timer.reset(), 1500);
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = firstname || "Athlete";

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
          <View style={styles.streakBadge}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakCount}>0</Text>
          </View>
        </View>

        {/* ── Progress Ring ──────────────────── */}
        <View style={styles.ringSection}>
          <ProgressRing progress={0.4} />
        </View>

        {/* ── Timer (only when active) ───────── */}
        {isWorkoutActive && (
          <View style={styles.timerSection}>
            <Text style={styles.timerLabel}>WORKOUT TIME</Text>
            <Text style={styles.timerText}>
              {formatTime(timer.elapsedSeconds)}
            </Text>
          </View>
        )}

        {/* ── Start / Stop Button ────────────── */}
        <View style={styles.buttonSection}>
          <Pressable
            onPress={isWorkoutActive ? handleStopWorkout : handleStartWorkout}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.mainButton,
              pressed && styles.mainButtonPressed,
            ]}
          >
            <LinearGradient
              colors={
                isWorkoutActive
                  ? [Palette.error, "#C0392B"]
                  : [Palette.gradientStart, Palette.gradientEnd]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.mainButtonGradient}
            >
              <Text style={styles.mainButtonIcon}>
                {isSaving ? "💾" : isWorkoutActive ? "⏹" : "💪"}
              </Text>
              <Text style={styles.mainButtonText}>
                {isSaving
                  ? "Saving..."
                  : isWorkoutActive
                    ? "End Workout"
                    : "Start Workout"}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── Quick Stats ────────────────────── */}
        <View style={styles.statsRow}>
          <QuickAction
            icon="🏋️"
            label="Workouts"
            value="0"
            sub="this week"
            accentColor={Palette.accent}
          />
          <QuickAction
            icon="🔥"
            label="Calories"
            value="0"
            sub="burned today"
            accentColor={Palette.warning}
          />
          <QuickAction
            icon="👣"
            label="Steps"
            value="0"
            sub="today"
            accentColor={Palette.success}
          />
        </View>

        {/* ── Today's Goal Card ──────────────── */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalIcon}>🎯</Text>
            <Text style={styles.goalTitle}>Today's Goal</Text>
          </View>
          <Text style={styles.goalBody}>
            Complete 1 workout and burn 300 calories
          </Text>
          <View style={styles.goalProgress}>
            <View style={styles.goalBarTrack}>
              <View style={[styles.goalBarFill, { width: "40%" }]} />
            </View>
            <Text style={styles.goalPct}>40%</Text>
          </View>
        </View>

        {/* ── Motivational Quote ─────────────── */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteIcon}>💬</Text>
          <Text style={styles.quoteText}>"{quote}"</Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
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

  // Timer
  timerSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Palette.accent,
    letterSpacing: 2,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 52,
    fontWeight: "800",
    color: Palette.textPrimary,
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },

  // Main action button
  buttonSection: {
    marginBottom: Spacing["2xl"],
  },
  mainButton: {
    borderRadius: Radii.lg,
    overflow: "hidden",
  },
  mainButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  mainButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  mainButtonIcon: {
    fontSize: 22,
  },
  mainButtonText: {
    color: Palette.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
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
});
