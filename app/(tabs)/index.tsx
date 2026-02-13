import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

function ProgressRing({ progress = 0.4 }) {
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.ringContainer}>
      <Svg width={150} height={150}>
        {/* Background ring */}
        <Circle
          stroke="#2B2B3D"
          fill="none"
          cx="75"
          cy="75"
          r={radius}
          strokeWidth={strokeWidth}
        />

        {/* Progress ring */}
        <Circle
          stroke="#6C5CE7"
          fill="none"
          cx="75"
          cy="75"
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
        />
      </Svg>

      <Text style={styles.ringText}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.container}>
        <Text style={styles.title}>APP2026</Text>

        {/* Greeting */}
        <Text style={styles.greeting}>Welcome back Amsan & Mith 👋</Text>

        {/* Progress Ring */}
        <ProgressRing progress={0.4} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Workouts</Text>
          <Text style={styles.statValue}>0</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={styles.statValue}>0</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Calories Burned Today</Text>
          <Text style={styles.statValue}>0</Text>
        </View>
      </View>

      {/* Goal Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Goal</Text>
        <Text style={styles.cardBody}>
          Complete 1 workout and burn 300 calories
        </Text>
      </View>

      {/* Button */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            console.log("Start Workout Pressed");
          }}
        >
          <Text style={styles.primaryButtonText}>Start Workout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B0B0F",
    paddingHorizontal: 16,
  },

  container: {
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },

  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  subtitle: {
    fontSize: 16,
    color: "#B3B3C2",
  },

  greeting: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 10,
  },

  ringContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },

  ringText: {
    position: "absolute",
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#151520",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
  },

  statLabel: {
    fontSize: 12,
    color: "#B3B3C2",
    textTransform: "uppercase",
  },

  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 4,
  },

  card: {
    backgroundColor: "#151520",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  cardBody: {
    fontSize: 14,
    color: "#B3B3C2",
    marginTop: 6,
  },

  actions: {
    marginTop: 20,
  },

  primaryButton: {
    backgroundColor: "#6C5CE7",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
