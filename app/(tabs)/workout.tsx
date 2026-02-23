import { Palette, Radii, Spacing } from "@/constants/theme";
import { useWorkoutTimer } from "@/hooks/use-workout-timer";
import { useAuth } from "@/hooks/useAuth";
import {
  SessionExercise,
  WorkoutSession,
  addExerciseToSession,
  addSetToExercise,
  createWorkoutSession,
  deleteExercise,
  deleteSet,
  deleteWorkoutSession,
  getTodayWorkouts,
  updateSetNumber,
  updateWorkoutSession
} from "@/services/workoutTracking";
import { formatTime } from "@/utils/formatTime";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── New Workout Modal ───────────────────────────────────────
function NewWorkoutModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (sessionId: string) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Missing Name", "Please enter a workout name.");
      return;
    }
    setSaving(true);
    const res = await createWorkoutSession(trimmed);
    setSaving(false);
    if (res.success && res.sessionId) {
      setName("");
      onCreated(res.sessionId);
    } else {
      Alert.alert("Error", "Failed to create workout. Please try again.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={modalStyles.keyboardView}
        >
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>New Workout</Text>
            <Text style={modalStyles.subtitle}>
              What are you training today?
            </Text>

            <TextInput
              style={modalStyles.input}
              placeholder="e.g. Push Day, Leg Day, Upper Body..."
              placeholderTextColor={Palette.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />

            <View style={modalStyles.quickTags}>
              {["Push Day", "Pull Day", "Leg Day", "Upper Body", "Cardio", "Full Body"].map((tag) => (
                <Pressable
                  key={tag}
                  style={[modalStyles.tag, name === tag && modalStyles.tagActive]}
                  onPress={() => setName(tag)}
                >
                  <Text
                    style={[
                      modalStyles.tagText,
                      name === tag && modalStyles.tagTextActive,
                    ]}
                  >
                    {tag}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[modalStyles.btn, !name.trim() && modalStyles.btnDisabled]}
              onPress={handleCreate}
              disabled={saving || !name.trim()}
            >
              <LinearGradient
                colors={[Palette.gradientStart, Palette.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={modalStyles.btnGradient}
              >
                {saving ? (
                  <ActivityIndicator color={Palette.white} />
                ) : (
                  <Text style={modalStyles.btnText}>Start Workout</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Palette.overlay,
    justifyContent: "flex-end",
  },
  keyboardView: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Palette.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 40 : Spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Palette.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginBottom: Spacing.xl,
  },
  input: {
    backgroundColor: Palette.bgInput,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Spacing.lg,
    fontSize: 16,
    color: Palette.textPrimary,
    marginBottom: Spacing.lg,
  },
  quickTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Palette.bgCard,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  tagActive: {
    backgroundColor: Palette.accentMuted,
    borderColor: Palette.accent,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600",
    color: Palette.textSecondary,
  },
  tagTextActive: {
    color: Palette.accent,
  },
  btn: {
    borderRadius: Radii.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  btnDisabled: { opacity: 0.5 },
  btnGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: Palette.white,
    fontSize: 16,
    fontWeight: "800",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelText: {
    color: Palette.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
});

// ── Delete Exercise Modal ───────────────────────────────────
function DeleteExerciseModal({
  visible,
  exercise,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  exercise: { id: string; name: string } | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!exercise) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, deleteModalStyles.centeredSheet]}>
          <View style={modalStyles.handle} />
          
          {/* Warning Icon */}
          <View style={deleteModalStyles.iconContainer}>
            <Text style={deleteModalStyles.icon}>⚠️</Text>
          </View>

          <Text style={modalStyles.title}>Delete Exercise</Text>
          <Text style={[modalStyles.subtitle, deleteModalStyles.message]}>
            Remove "{exercise.name}" and all its sets? This action cannot be undone.
          </Text>

          <Pressable style={deleteModalStyles.deleteBtn} onPress={onConfirm}>
            <View style={deleteModalStyles.deleteBtnInner}>
              <Text style={deleteModalStyles.deleteBtnText}>Delete Exercise</Text>
            </View>
          </Pressable>

          <Pressable style={modalStyles.cancelBtn} onPress={onClose}>
            <Text style={modalStyles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const deleteModalStyles = StyleSheet.create({
  centeredSheet: {
    borderRadius: 24,
    margin: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  iconContainer: {
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  icon: {
    fontSize: 48,
  },
  message: {
    textAlign: "center",
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  deleteBtn: {
    borderRadius: Radii.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
    backgroundColor: Palette.error,
  },
  deleteBtnInner: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    color: Palette.white,
    fontSize: 16,
    fontWeight: "800",
  },
});

// ── Add Exercise Modal ──────────────────────────────────────
function AddExerciseModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={modalStyles.keyboardView}
        >
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>Add Exercise</Text>

            <TextInput
              style={modalStyles.input}
              placeholder="e.g. Bench Press, Squats, Deadlifts..."
              placeholderTextColor={Palette.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />

            <View style={modalStyles.quickTags}>
              {["Bench Press", "Squats", "Deadlifts", "Pull-ups", "OHP", "Rows", "Curls", "Lunges"].map(
                (tag) => (
                  <Pressable
                    key={tag}
                    style={[modalStyles.tag, name === tag && modalStyles.tagActive]}
                    onPress={() => setName(tag)}
                  >
                    <Text
                      style={[
                        modalStyles.tagText,
                        name === tag && modalStyles.tagTextActive,
                      ]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>

            <Pressable
              style={[modalStyles.btn, !name.trim() && modalStyles.btnDisabled]}
              onPress={handleAdd}
              disabled={!name.trim()}
            >
              <LinearGradient
                colors={[Palette.gradientStart, Palette.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={modalStyles.btnGradient}
              >
                <Text style={modalStyles.btnText}>Add Exercise</Text>
              </LinearGradient>
            </Pressable>

            <Pressable style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Add Set Row (inline) ────────────────────────────────────
function AddSetRow({
  onAdd,
}: {
  onAdd: (reps: number, weight: number | null) => void;
}) {
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");

  const handleAdd = () => {
    const r = parseInt(reps);
    if (!r || r <= 0) {
      Alert.alert("Invalid", "Please enter valid reps.");
      return;
    }
    const w = weight.trim() ? parseFloat(weight) : null;
    onAdd(r, w);
    setReps("");
    setWeight("");
  };

  return (
    <View style={setRowStyles.addRow}>
      <TextInput
        style={setRowStyles.input}
        placeholder="Reps"
        placeholderTextColor={Palette.textMuted}
        keyboardType="number-pad"
        value={reps}
        onChangeText={setReps}
      />
      <TextInput
        style={setRowStyles.input}
        placeholder="Weight"
        placeholderTextColor={Palette.textMuted}
        keyboardType="decimal-pad"
        value={weight}
        onChangeText={setWeight}
      />
      <Pressable style={setRowStyles.addBtn} onPress={handleAdd}>
        <Text style={setRowStyles.addBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

const setRowStyles = StyleSheet.create({
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Palette.bgInput,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    color: Palette.textPrimary,
    textAlign: "center",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.sm,
    backgroundColor: Palette.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: {
    color: Palette.white,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 24,
  },
});

// ── Exercise Card ───────────────────────────────────────────
function ExerciseCard({
  exercise,
  onAddSet,
  onDeleteSet,
  onDeleteExercise,
}: {
  exercise: SessionExercise;
  onAddSet: (exerciseId: string, reps: number, weight: number | null) => void;
  onDeleteSet: (setId: string) => void;
  onDeleteExercise: (exerciseId: string) => void;
}) {
  return (
    <View style={exStyles.card}>
      <View style={exStyles.header}>
        <View style={exStyles.iconWrap}>
          <Text style={exStyles.icon}>🏋️</Text>
        </View>
        <Text style={exStyles.name}>{exercise.exercise_name}</Text>
        <Pressable
          style={exStyles.deleteBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => {
            console.log("Delete button pressed for exercise:", exercise.exercise_name, "ID:", exercise.id);
            if (!exercise.id) {
              Alert.alert("Error", "Cannot delete exercise - invalid ID");
              return;
            }
            onDeleteExercise(exercise.id!);
          }}
        >
          <Text style={exStyles.deleteBtnText}>✕</Text>
        </Pressable>
      </View>

      {/* Set Headers */}
      {exercise.sets.length > 0 && (
        <View style={exStyles.setHeader}>
          <Text style={[exStyles.setHeaderText, { flex: 0.5 }]}>Set</Text>
          <Text style={[exStyles.setHeaderText, { flex: 1 }]}>Reps</Text>
          <Text style={[exStyles.setHeaderText, { flex: 1 }]}>Weight</Text>
          <View style={{ width: 30 }} />
        </View>
      )}

      {/* Sets */}
      {exercise.sets.map((set, idx) => (
        <View key={set.id || idx} style={exStyles.setRow}>
          <Text style={[exStyles.setText, { flex: 0.5 }]}>
            {set.set_number}
          </Text>
          <Text style={[exStyles.setText, { flex: 1 }]}>{set.reps}</Text>
          <Text style={[exStyles.setText, { flex: 1 }]}>
            {set.weight != null ? `${set.weight} lbs` : "BW"}
          </Text>
          <Pressable
            style={exStyles.setDeleteBtn}
            onPress={() => onDeleteSet(set.id!)}
          >
            <Text style={exStyles.setDeleteText}>✕</Text>
          </Pressable>
        </View>
      ))}

      {/* Add Set */}
      <AddSetRow
        onAdd={(reps, weight) => onAddSet(exercise.id!, reps, weight)}
      />
    </View>
  );
}

const exStyles = StyleSheet.create({
  card: {
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Palette.accentMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  icon: { fontSize: 18 },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.errorMuted,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    borderWidth: 1,
    borderColor: Palette.error + "40",
  },
  deleteBtnText: {
    color: Palette.error,
    fontSize: 16,
    fontWeight: "700",
  },
  setHeader: {
    flexDirection: "row",
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    marginBottom: Spacing.sm,
  },
  setHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: Palette.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  setText: {
    fontSize: 14,
    color: Palette.textPrimary,
    fontWeight: "600",
  },
  setDeleteBtn: {
    width: 30,
    alignItems: "center",
  },
  setDeleteText: {
    color: Palette.textMuted,
    fontSize: 11,
  },
});

// ── Workout Session Card (collapsed / today view) ───────────
function WorkoutSessionCard({
  session,
  onAddExercise,
  onAddSet,
  onDeleteSet,
  onDeleteExercise,
  onDelete,
  timer,
  isActive,
  onStartTimer,
  onStopTimer,
}: {
  session: WorkoutSession;
  onAddExercise: (sessionId: string) => void;
  onAddSet: (exerciseId: string, reps: number, weight: number | null) => void;
  onDeleteSet: (setId: string) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onDelete: (sessionId: string) => void;
  timer: any;
  isActive: boolean;
  onStartTimer: () => void;
  onStopTimer: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const exerciseCount = session.exercises?.length || 0;
  const totalSets = (session.exercises || []).reduce(
    (sum, ex) => sum + ex.sets.length,
    0,
  );

  return (
    <View style={sessionStyles.card}>
      <Pressable
        style={sessionStyles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={sessionStyles.headerLeft}>
          <Text style={sessionStyles.name}>{session.name}</Text>
          <Text style={sessionStyles.meta}>
            {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} · {totalSets} set
            {totalSets !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={sessionStyles.headerRight}>
          {isActive && (
            <View style={sessionStyles.timerBadge}>
              <Text style={sessionStyles.timerText}>
                {formatTime(timer.elapsedSeconds)}
              </Text>
            </View>
          )}
          <Text style={sessionStyles.chevron}>{expanded ? "▾" : "▸"}</Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={sessionStyles.body}>
          {/* Timer controls */}
          <View style={sessionStyles.timerRow}>
            {!isActive ? (
              <Pressable style={sessionStyles.timerBtn} onPress={onStartTimer}>
                <Text style={sessionStyles.timerBtnIcon}>▶</Text>
                <Text style={sessionStyles.timerBtnText}>Start Timer</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[sessionStyles.timerBtn, sessionStyles.timerBtnStop]}
                onPress={onStopTimer}
              >
                <Text style={sessionStyles.timerBtnIcon}>⏹</Text>
                <Text style={sessionStyles.timerBtnText}>
                  Stop ({formatTime(timer.elapsedSeconds)})
                </Text>
              </Pressable>
            )}
          </View>

          {/* Exercises */}
          {(session.exercises || []).map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onAddSet={onAddSet}
              onDeleteSet={onDeleteSet}
              onDeleteExercise={onDeleteExercise}
            />
          ))}

          {/* Add Exercise Button */}
          <Pressable
            style={sessionStyles.addExBtn}
            onPress={() => onAddExercise(session.id!)}
          >
            <Text style={sessionStyles.addExIcon}>+</Text>
            <Text style={sessionStyles.addExText}>Add Exercise</Text>
          </Pressable>

          {/* Delete Session */}
          <Pressable
            style={sessionStyles.deleteSession}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => {
              console.log("Delete workout button pressed for:", session.name, "ID:", session.id);
              if (!session.id) {
                Alert.alert("Error", "Cannot delete workout - invalid ID");
                return;
              }
              
              // For web, Alert.alert with buttons might not work properly, so provide a fallback
              if (Platform.OS === 'web') {
                if (window.confirm(`Delete "${session.name}" and all its exercises?`)) {
                  console.log("Delete workout confirmed (web) for ID:", session.id);
                  onDelete(session.id!);
                }
              } else {
                Alert.alert(
                  "Delete Workout",
                  `Delete "${session.name}" and all its exercises?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        console.log("Delete workout confirmed for ID:", session.id);
                        onDelete(session.id!);
                      },
                    },
                  ],
                );
              }
            }}
          >
            <Text style={sessionStyles.deleteSessionText}>Delete Workout</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const sessionStyles = StyleSheet.create({
  card: {
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  headerLeft: { flex: 1 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: Palette.textPrimary,
  },
  meta: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 16,
    color: Palette.textMuted,
  },
  timerBadge: {
    backgroundColor: Palette.accentMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  timerText: {
    fontSize: 12,
    fontWeight: "700",
    color: Palette.accent,
    fontVariant: ["tabular-nums"],
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  timerRow: {
    marginBottom: Spacing.lg,
  },
  timerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.accentMuted,
    borderRadius: Radii.md,
    paddingVertical: 12,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Palette.accent + "30",
  },
  timerBtnStop: {
    backgroundColor: Palette.errorMuted,
    borderColor: Palette.error + "30",
  },
  timerBtnIcon: { fontSize: 14, color: Palette.accent },
  timerBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Palette.accent,
  },
  addExBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radii.md,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Palette.accent + "40",
    borderStyle: "dashed",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  addExIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: Palette.accent,
  },
  addExText: {
    fontSize: 14,
    fontWeight: "700",
    color: Palette.accent,
  },
  deleteSession: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: Spacing.md,
  },
  deleteSessionText: {
    fontSize: 13,
    fontWeight: "600",
    color: Palette.error,
  },
});

// ── Empty State ─────────────────────────────────────────────
function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>💪</Text>
      <Text style={emptyStyles.title}>No Workouts Today</Text>
      <Text style={emptyStyles.body}>
        Start a new workout to begin tracking your exercises, sets, and reps.
      </Text>
      <Pressable style={emptyStyles.btn} onPress={onStart}>
        <LinearGradient
          colors={[Palette.gradientStart, Palette.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={emptyStyles.btnGradient}
        >
          <Text style={emptyStyles.btnText}>Start Workout</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 60,
  },
  icon: {
    fontSize: 56,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Palette.textPrimary,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 40,
    marginBottom: Spacing["2xl"],
  },
  btn: {
    borderRadius: Radii.lg,
    overflow: "hidden",
    width: 200,
  },
  btnGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: {
    color: Palette.white,
    fontSize: 16,
    fontWeight: "800",
  },
});

// ── Main Screen ─────────────────────────────────────────────
export default function WorkoutScreen() {
  const { user } = useAuth();
  const timer = useWorkoutTimer();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewWorkout, setShowNewWorkout] = useState(false);
  const [addExerciseSessionId, setAddExerciseSessionId] = useState<string | null>(null);
  const [activeTimerSessionId, setActiveTimerSessionId] = useState<string | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<{ id: string; name: string } | null>(null);

  const loadSessions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getTodayWorkouts();
    if (res.success) {
      setSessions(res.data || []);
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  // ── Handlers ──────────────────────────────────────────────
  const handleWorkoutCreated = async (sessionId: string) => {
    setShowNewWorkout(false);
    await loadSessions();
    setActiveTimerSessionId(sessionId);
    timer.reset();
    timer.start();
  };

  const handleAddExercise = async (name: string) => {
    if (!addExerciseSessionId) return;
    const session = sessions.find((s) => s.id === addExerciseSessionId);
    const sortOrder = session?.exercises?.length || 0;
    const res = await addExerciseToSession(addExerciseSessionId, name, sortOrder);
    setAddExerciseSessionId(null);
    if (res.success) {
      await loadSessions();
    } else {
      Alert.alert("Error", "Failed to add exercise.");
    }
  };

  const handleAddSet = async (
    exerciseId: string,
    reps: number,
    weight: number | null,
  ) => {
    // Find the max set number for this exercise
    let setNumber = 1;
    for (const session of sessions) {
      for (const ex of session.exercises || []) {
        if (ex.id === exerciseId) {
          // Use max set_number + 1 instead of length + 1
          const maxSetNumber = ex.sets.reduce((max, set) => 
            Math.max(max, set.set_number), 0);
          setNumber = maxSetNumber + 1;
        }
      }
    }

    const res = await addSetToExercise(exerciseId, setNumber, reps, weight);
    if (res.success) {
      await loadSessions();
    } else {
      Alert.alert("Error", "Failed to add set.");
    }
  };

  const handleDeleteSet = async (setId: string) => {
    // Find which exercise this set belongs to and its set_number
    let exerciseId: string | undefined;
    let deletedSetNumber: number = 0;
    
    for (const session of sessions) {
      for (const ex of session.exercises || []) {
        const foundSet = ex.sets.find(s => s.id === setId);
        if (foundSet) {
          exerciseId = ex.id;
          deletedSetNumber = foundSet.set_number;
          break;
        }
      }
      if (exerciseId) break;
    }

    const res = await deleteSet(setId);
    if (res.success && exerciseId) {
      // Renumber all sets with higher set_numbers in this exercise
      for (const session of sessions) {
        for (const ex of session.exercises || []) {
          if (ex.id === exerciseId) {
            for (const set of ex.sets) {
              if (set.set_number > deletedSetNumber) {
                await updateSetNumber(set.id!, set.set_number - 1);
              }
            }
          }
        }
      }
      await loadSessions();
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    console.log("Deleting exercise:", exerciseId);
    const res = await deleteExercise(exerciseId);
    if (res.success) {
      await loadSessions();
    } else {
      console.error("Failed to delete exercise:", res.error);
      Alert.alert("Error", "Failed to delete exercise. Please try again.");
    }
  };

  const handleRequestDeleteExercise = (exerciseId: string) => {
    // Find the exercise to get its name
    for (const session of sessions) {
      const exercise = session.exercises?.find((ex) => ex.id === exerciseId);
      if (exercise) {
        setExerciseToDelete({ id: exerciseId, name: exercise.exercise_name });
        return;
      }
    }
    // If not found, show error
    Alert.alert("Error", "Cannot delete exercise - not found");
  };

  const handleDeleteSession = async (sessionId: string) => {
    console.log("Deleting workout session:", sessionId);
    if (activeTimerSessionId === sessionId) {
      timer.stop();
      timer.reset();
      setActiveTimerSessionId(null);
    }
    const res = await deleteWorkoutSession(sessionId);
    if (res.success) {
      await loadSessions();
    } else {
      console.error("Failed to delete workout session:", res.error);
      Alert.alert("Error", "Failed to delete workout. Please try again.");
    }
  };

  const handleStartTimer = (sessionId: string) => {
    if (activeTimerSessionId && activeTimerSessionId !== sessionId) {
      // Stop previous timer and save duration
      timer.stop();
      updateWorkoutSession(activeTimerSessionId, {
        duration_seconds: timer.elapsedSeconds,
      });
    }
    setActiveTimerSessionId(sessionId);
    timer.reset();
    timer.start();
  };

  const handleStopTimer = async (sessionId: string) => {
    timer.stop();
    await updateWorkoutSession(sessionId, {
      duration_seconds: timer.elapsedSeconds,
    });
    timer.reset();
    setActiveTimerSessionId(null);
  };

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // ── Render ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Workout</Text>
            <Text style={styles.pageSub}>{todayFormatted}</Text>
          </View>
          {sessions.length > 0 && (
            <Pressable
              style={styles.newBtn}
              onPress={() => setShowNewWorkout(true)}
            >
              <LinearGradient
                colors={[Palette.gradientStart, Palette.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newBtnGradient}
              >
                <Text style={styles.newBtnText}>+ New</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Today's summary */}
        {sessions.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{sessions.length}</Text>
              <Text style={styles.summaryLabel}>Workouts</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {sessions.reduce(
                  (sum, s) => sum + (s.exercises?.length || 0),
                  0,
                )}
              </Text>
              <Text style={styles.summaryLabel}>Exercises</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {sessions.reduce(
                  (sum, s) =>
                    sum +
                    (s.exercises || []).reduce(
                      (eSum, ex) => eSum + ex.sets.length,
                      0,
                    ),
                  0,
                )}
              </Text>
              <Text style={styles.summaryLabel}>Total Sets</Text>
            </View>
          </View>
        )}

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Palette.accent} />
          </View>
        ) : sessions.length === 0 ? (
          <EmptyState onStart={() => setShowNewWorkout(true)} />
        ) : (
          sessions.map((session) => (
            <WorkoutSessionCard
              key={session.id}
              session={session}
              onAddExercise={setAddExerciseSessionId}
              onAddSet={handleAddSet}
              onDeleteSet={handleDeleteSet}
              onDeleteExercise={handleRequestDeleteExercise}
              onDelete={handleDeleteSession}
              timer={timer}
              isActive={activeTimerSessionId === session.id}
              onStartTimer={() => handleStartTimer(session.id!)}
              onStopTimer={() => handleStopTimer(session.id!)}
            />
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modals */}
      <NewWorkoutModal
        visible={showNewWorkout}
        onClose={() => setShowNewWorkout(false)}
        onCreated={handleWorkoutCreated}
      />
      <AddExerciseModal
        visible={!!addExerciseSessionId}
        onClose={() => setAddExerciseSessionId(null)}
        onAdd={handleAddExercise}
      />
      <DeleteExerciseModal
        visible={!!exerciseToDelete}
        exercise={exerciseToDelete}
        onConfirm={() => {
          if (exerciseToDelete) {
            handleDeleteExercise(exerciseToDelete.id);
            setExerciseToDelete(null);
          }
        }}
        onClose={() => setExerciseToDelete(null)}
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Palette.textPrimary,
    letterSpacing: -0.5,
  },
  pageSub: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginTop: 4,
  },
  newBtn: {
    borderRadius: Radii.full,
    overflow: "hidden",
  },
  newBtnGradient: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  newBtnText: {
    color: Palette.white,
    fontSize: 14,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Palette.border,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Palette.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 2,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
});
