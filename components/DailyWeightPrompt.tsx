import React, { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { logWeight } from "@/services/weightTracking";

interface DailyWeightPromptProps {
  visible: boolean;
  onComplete: () => void;
}

export default function DailyWeightPrompt({
  visible,
  onComplete,
}: DailyWeightPromptProps) {
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"lbs" | "kg">("lbs");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert("Invalid Weight", "Please enter a valid weight");
      return;
    }

    setLoading(true);
    try {
      const result = await logWeight(parseFloat(weight), unit);

      if (result.success) {
        Alert.alert("Success", "Weight logged successfully!");
        setWeight("");
        onComplete();
      } else {
        Alert.alert("Error", "Failed to log weight. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    Alert.alert(
      "Skip Weight Logging?",
      "Tracking your weight daily helps monitor your progress. Are you sure you want to skip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          style: "destructive",
          onPress: () => {
            setWeight("");
            onComplete();
          },
        },
      ]
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.emoji}>⚖️</Text>
            <Text style={styles.title}>Daily Weight Check-In</Text>
            <Text style={styles.subtitle}>
              Track your progress by logging your weight
            </Text>
          </View>

          <View style={styles.unitSelector}>
            <TouchableOpacity
              style={[
                styles.unitButton,
                unit === "lbs" && styles.unitButtonSelected,
              ]}
              onPress={() => setUnit("lbs")}
            >
              <Text
                style={[
                  styles.unitText,
                  unit === "lbs" && styles.unitTextSelected,
                ]}
              >
                lbs
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.unitButton,
                unit === "kg" && styles.unitButtonSelected,
              ]}
              onPress={() => setUnit("kg")}
            >
              <Text
                style={[
                  styles.unitText,
                  unit === "kg" && styles.unitTextSelected,
                ]}
              >
                kg
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={`Enter weight in ${unit}`}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={styles.inputUnit}>{unit}</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? "Saving..." : "Log Weight"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  unitSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    backgroundColor: "#F8F8F8",
    alignItems: "center",
  },
  unitButtonSelected: {
    borderColor: "#6C5CE7",
    backgroundColor: "#6C5CE7",
  },
  unitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  unitTextSelected: {
    color: "#FFFFFF",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#F8F8F8",
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    paddingVertical: 16,
    color: "#1A1A1A",
  },
  inputUnit: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#6C5CE7",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
