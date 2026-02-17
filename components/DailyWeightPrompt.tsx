import { Palette, Radii, Spacing } from "@/constants/theme";
import { logWeight, skipWeightForToday } from "@/services/weightTracking";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  const [skipping, setSkipping] = useState(false);

  async function handleSubmit() {
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert("Invalid Weight", "Please enter a valid weight");
      return;
    }

    setLoading(true);
    try {
      const result = await logWeight(parseFloat(weight), unit);

      if (result.success) {
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

  async function handleSkip() {
    setSkipping(true);
    try {
      await skipWeightForToday();
      // Small delay to ensure AsyncStorage write completes
      await new Promise((resolve) => setTimeout(resolve, 100));
      setWeight("");
      onComplete();
    } catch (error) {
      console.error("Error skipping weight:", error);
      Alert.alert("Error", "Failed to skip. Please try again.");
    } finally {
      setSkipping(false);
    }
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
          {/* Decorative top bar */}
          <View style={styles.topBar} />

          <View style={styles.header}>
            <Text style={styles.emoji}>⚖️</Text>
            <Text style={styles.title}>Daily Check-In</Text>
            <Text style={styles.subtitle}>
              How much do you weigh today?
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
              placeholder="0.0"
              placeholderTextColor={Palette.textMuted}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={styles.inputUnit}>{unit}</Text>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.skipButton,
                pressed && { opacity: 0.7 },
                (loading || skipping) && styles.buttonDisabled,
              ]}
              onPress={handleSkip}
              disabled={loading || skipping}
            >
              <Text style={styles.skipButtonText}>
                {skipping ? "Skipping..." : "Skip"}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                (loading || skipping) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading || skipping}
            >
              <Text style={styles.submitButtonText}>
                {loading ? "Saving..." : "Log Weight"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Palette.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: Palette.bgElevated,
    borderRadius: Radii.xl,
    padding: Spacing["3xl"],
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: "hidden",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Palette.accent,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Palette.textPrimary,
    marginBottom: Spacing.xs,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: "center",
  },
  unitSelector: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgInput,
    alignItems: "center",
  },
  unitButtonSelected: {
    borderColor: Palette.accent,
    backgroundColor: Palette.accentMuted,
  },
  unitText: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.textMuted,
  },
  unitTextSelected: {
    color: Palette.accent,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    backgroundColor: Palette.bgInput,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: "800",
    paddingVertical: 16,
    color: Palette.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  inputUnit: {
    fontSize: 18,
    fontWeight: "600",
    color: Palette.textMuted,
    marginLeft: Spacing.sm,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: "center",
    backgroundColor: Palette.bgCard,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Palette.textSecondary,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Radii.md,
    alignItems: "center",
    backgroundColor: Palette.accent,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: Palette.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
