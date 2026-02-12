import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function HomeScreen(){
  return(
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>APP2026</Text>
        <Text style={styles.subtitle}>Welcome to the future of mobile apps</Text> 
      </View>

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
          <Text style={styles.statLabel}>Calories</Text>
          <Text style={styles.statValue}>0</Text>
        </View>
        
      </View>
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1, // Fill the entire screen height
    backgroundColor: "#0B0B0F", // Dark background
  },
  container: {
    flex: 1, // Allow container to grow to fill available space
    paddingHorizontal: 16, // Left/right padding
    paddingTop: 12, // Top padding inside safe area
    gap: 16, // Vertical spacing between sections (RN supports gap in newer versions)
  },
  header: {
    gap: 6, // Spacing between title and subtitle
  },
  title: {
    fontSize: 34, // Big headline
    fontWeight: "800", // Bold weight
    color: "#FFFFFF", // White text
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 16,
    color: "#B3B3C2", // Slightly muted text
  },
  statsRow: {
    flexDirection: "row", // Lay children out horizontally
    gap: 12, // Space between the stat cards
  },
  statCard: {
    flex: 1, // Each card takes equal width
    backgroundColor: "#151520",
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    color: "#B3B3C2",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actions: {
    gap: 12, // Space between buttons
  },
  primaryButton: {
    backgroundColor: "#6C5CE7", // Purple
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center", // Center text horizontally
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#1C1C2A",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2B2B3D",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85, // Slight fade effect when pressed
    transform: [{ scale: 0.99 }], // Tiny press animation
  },
  card: {
    backgroundColor: "#151520",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardBody: {
    fontSize: 14,
    color: "#B3B3C2",
    lineHeight: 20,
  },
});