import { Palette, Radii, Spacing } from "@/constants/theme";
import { useSteps } from "@/hooks/useSteps";
import { getDayAbbrev } from "@/services/stepTracking";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    ActivityIndicator,
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
    Line,
    Rect,
    Stop,
    LinearGradient as SvgGradient,
    Text as SvgText,
} from "react-native-svg";

const STEP_GOAL = 10000;

// ── Circular Progress Ring ──────────────────────────────────
function StepRing({
  steps,
  goal,
  size = 220,
  strokeWidth = 16,
}: {
  steps: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(steps / goal, 1);
  const center = size / 2;

  return (
    <View style={ringStyles.container}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="stepRingGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#22C55E" />
            <Stop offset="100%" stopColor="#38BDF8" />
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
          stroke="url(#stepRingGrad)"
          fill="none"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      <View style={ringStyles.inner}>
        <Text style={ringStyles.emoji}>👣</Text>
        <Text style={ringStyles.steps}>{steps.toLocaleString()}</Text>
        <Text style={ringStyles.label}>
          of {goal.toLocaleString()} steps
        </Text>
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
  emoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  steps: {
    fontSize: 36,
    fontWeight: "900",
    color: Palette.textPrimary,
    letterSpacing: -1.5,
  },
  label: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 2,
  },
});

// ── Stat Card ───────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  color = Palette.success,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <View style={[statStyles.card, { borderColor: color + "25" }]}>
      <View style={[statStyles.iconBg, { backgroundColor: color + "18" }]}>
        <Text style={statStyles.icon}>{icon}</Text>
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
      {sub ? <Text style={statStyles.sub}>{sub}</Text> : null}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 1,
  },
  iconBg: {
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

// ── Weekly Bar Chart ────────────────────────────────────────
function WeeklyChart({
  data,
  goal,
}: {
  data: { steps: number; date: string }[];
  goal: number;
}) {
  if (data.length === 0) return null;

  const chartWidth = 320;
  const chartHeight = 160;
  const barWidth = 28;
  const paddingX = 20;
  const paddingBottom = 28;
  const chartArea = chartHeight - paddingBottom;

  const maxSteps = Math.max(goal, ...data.map((d) => d.steps)) * 1.1;

  const barSpacing =
    data.length > 1
      ? (chartWidth - paddingX * 2 - barWidth) / (data.length - 1)
      : 0;

  const goalY = chartArea - (goal / maxSteps) * chartArea;

  return (
    <View style={chartStyles.card}>
      <View style={chartStyles.header}>
        <Text style={chartStyles.title}>This Week</Text>
        <Text style={chartStyles.subtitle}>
          Avg {Math.round(data.reduce((s, d) => s + d.steps, 0) / (data.length || 1)).toLocaleString()} steps
        </Text>
      </View>

      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <SvgGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#22C55E" />
            <Stop offset="100%" stopColor="#22C55E" stopOpacity={0.4} />
          </SvgGradient>
        </Defs>

        {/* Goal line */}
        <Line
          x1={paddingX - 5}
          y1={goalY}
          x2={chartWidth - paddingX + 5}
          y2={goalY}
          stroke={Palette.warning}
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.6}
        />
        <SvgText
          x={chartWidth - paddingX + 8}
          y={goalY + 4}
          fontSize={9}
          fill={Palette.warning}
          textAnchor="start"
          opacity={0.8}
        >
          Goal
        </SvgText>

        {/* Bars */}
        {data.map((d, i) => {
          const x = paddingX + i * barSpacing;
          const barHeight = Math.max(
            3,
            (d.steps / maxSteps) * chartArea
          );
          const y = chartArea - barHeight;
          const isToday = i === data.length - 1;
          const hitGoal = d.steps >= goal;

          return (
            <React.Fragment key={d.date}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={6}
                fill={hitGoal ? "#22C55E" : isToday ? "url(#barGrad)" : Palette.accent + "40"}
              />
              {/* Day label */}
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight - 8}
                fontSize={10}
                fill={isToday ? Palette.textPrimary : Palette.textMuted}
                textAnchor="middle"
                fontWeight={isToday ? "700" : "400"}
              >
                {isToday ? "Today" : getDayAbbrev(d.date)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  card: {
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: "center",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
});

// ── Permission Prompt ───────────────────────────────────────
function PermissionPrompt({
  onRequest,
  isAvailable,
}: {
  onRequest: () => void;
  isAvailable: boolean;
}) {
  if (!isAvailable) {
    return (
      <View style={permStyles.container}>
        <Text style={permStyles.emoji}>📱</Text>
        <Text style={permStyles.title}>Pedometer Not Available</Text>
        <Text style={permStyles.body}>
          Step tracking requires a device with a motion sensor. Please use a
          physical device to track your steps.
        </Text>
      </View>
    );
  }

  return (
    <View style={permStyles.container}>
      <Text style={permStyles.emoji}>🚶</Text>
      <Text style={permStyles.title}>Enable Step Tracking</Text>
      <Text style={permStyles.body}>
        Allow access to your device's motion data to automatically track your
        daily steps. On iPhone, this reads from Apple Health.
      </Text>
      <Pressable
        onPress={onRequest}
        style={({ pressed }) => [
          permStyles.button,
          pressed && { opacity: 0.85 },
        ]}
      >
        <LinearGradient
          colors={[Palette.success, "#16A34A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={permStyles.buttonGradient}
        >
          <Text style={permStyles.buttonText}>Enable Steps</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const permStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Palette.textPrimary,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: Palette.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing["2xl"],
  },
  button: {
    borderRadius: Radii.lg,
    overflow: "hidden",
    width: "100%",
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: Palette.white,
    fontSize: 17,
    fontWeight: "800",
  },
});

// ── Steps Screen ────────────────────────────────────────────
export default function StepsScreen() {
  const steps = useSteps(STEP_GOAL);

  // Loading state
  if (steps.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Palette.success} />
          <Text style={styles.loadingText}>Loading steps...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission or unavailable state
  if (!steps.hasPermission || !steps.isAvailable) {
    return (
      <SafeAreaView style={styles.safe}>
        <PermissionPrompt
          onRequest={steps.requestPermission}
          isAvailable={steps.isAvailable}
        />
      </SafeAreaView>
    );
  }

  const progressPct = Math.min(Math.round(steps.progress * 100), 100);
  const remaining = Math.max(0, steps.goal - steps.todaySteps);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Steps</Text>
            <Text style={styles.subtitle}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
          <Pressable
            onPress={steps.refresh}
            style={({ pressed }) => [
              styles.refreshBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.refreshIcon}>🔄</Text>
          </Pressable>
        </View>

        {/* ── Progress Ring ───────────── */}
        <View style={styles.ringSection}>
          <StepRing steps={steps.todaySteps} goal={steps.goal} />
        </View>

        {/* ── Progress message ────────── */}
        <View style={styles.messageSection}>
          {steps.todaySteps >= steps.goal ? (
            <View style={styles.goalReached}>
              <Text style={styles.goalReachedEmoji}>🎉</Text>
              <Text style={styles.goalReachedText}>
                Goal reached! Keep going!
              </Text>
            </View>
          ) : (
            <Text style={styles.remainingText}>
              {remaining.toLocaleString()} steps to go ({progressPct}% complete)
            </Text>
          )}
        </View>

        {/* ── Stat Cards ─────────────── */}
        <View style={styles.statsRow}>
          <StatCard
            icon="🔥"
            label="Calories"
            value={steps.calories.toString()}
            sub="burned"
            color={Palette.warning}
          />
          <StatCard
            icon="📏"
            label="Distance"
            value={`${steps.distanceMiles}`}
            sub="miles"
            color={Palette.info}
          />
          <StatCard
            icon="🎯"
            label="Goal"
            value={`${progressPct}%`}
            sub={`of ${(steps.goal / 1000).toFixed(0)}k`}
            color={Palette.success}
          />
        </View>

        {/* ── Weekly Chart ────────────── */}
        {steps.weeklySteps.length > 0 && (
          <WeeklyChart data={steps.weeklySteps} goal={steps.goal} />
        )}

        {/* ── Daily Breakdown ─────────── */}
        {steps.weeklySteps.length > 0 && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Daily Breakdown</Text>
            {[...steps.weeklySteps].reverse().map((day) => {
              const pct = Math.min(day.steps / steps.goal, 1);
              const isToday =
                day.date === new Date().toISOString().split("T")[0];
              return (
                <View key={day.date} style={styles.breakdownRow}>
                  <Text
                    style={[
                      styles.breakdownDay,
                      isToday && styles.breakdownDayToday,
                    ]}
                  >
                    {isToday ? "Today" : getDayAbbrev(day.date)}
                  </Text>
                  <View style={styles.breakdownBarTrack}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${Math.max(pct * 100, 2)}%`,
                          backgroundColor:
                            day.steps >= steps.goal
                              ? Palette.success
                              : Palette.accent,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.breakdownSteps,
                      day.steps >= steps.goal && styles.breakdownStepsGoal,
                    ]}
                  >
                    {day.steps.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────
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

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Palette.textSecondary,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Palette.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Palette.border,
  },
  refreshIcon: {
    fontSize: 20,
  },

  // Ring section
  ringSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },

  // Message
  messageSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  remainingText: {
    fontSize: 14,
    color: Palette.textSecondary,
    fontWeight: "500",
  },
  goalReached: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Palette.successMuted,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radii.full,
  },
  goalReachedEmoji: {
    fontSize: 18,
  },
  goalReachedText: {
    fontSize: 15,
    fontWeight: "700",
    color: Palette.success,
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },

  // Breakdown
  breakdownCard: {
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.textPrimary,
    marginBottom: Spacing.lg,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  breakdownDay: {
    width: 42,
    fontSize: 13,
    fontWeight: "500",
    color: Palette.textSecondary,
  },
  breakdownDayToday: {
    color: Palette.textPrimary,
    fontWeight: "700",
  },
  breakdownBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Palette.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  breakdownBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  breakdownSteps: {
    width: 52,
    fontSize: 13,
    fontWeight: "600",
    color: Palette.textSecondary,
    textAlign: "right",
  },
  breakdownStepsGoal: {
    color: Palette.success,
  },
});
