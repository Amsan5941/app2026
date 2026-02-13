import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Workout = {
  id: string;
  date: string;
  duration: number; // minutes
  calories: number;
  type: string;
};

const SAMPLE_DATA: Workout[] = [
  { id: "1", date: "2026-02-10", duration: 30, calories: 220, type: "Run" },
  { id: "2", date: "2026-02-09", duration: 45, calories: 380, type: "HIIT" },
  { id: "3", date: "2026-02-07", duration: 25, calories: 180, type: "Cycle" },
];

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Workout History</Text>

        <FlatList
          data={SAMPLE_DATA}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No workouts yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.type}</Text>
              <Text style={styles.cardBody}>
                {item.date} • {item.duration} min • {item.calories} cal
              </Text>
            </View>
          )}
          contentContainerStyle={{ paddingVertical: 12 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#151520",
    borderRadius: 12,
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardBody: {
    fontSize: 13,
    color: "#B3B3C2",
    marginTop: 6,
  },
  empty: {
    color: "#B3B3C2",
    textAlign: "center",
    marginTop: 24,
  },
});
