import { Palette, Radii, Spacing } from "@/constants/theme";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
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

import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import {
    changeUserPassword,
    getCurrentUserProfile,
    updateBioProfile,
    updateUserProfile,
} from "@/services/auth";
import { Alert } from "react-native";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [bioProfile, setBioProfile] = useState<any | null>(null);
  const [editing, setEditing] = useState(false);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [promptShown, setPromptShown] = useState(false);
  const [bioEditing, setBioEditing] = useState(false);
  const [editHeight, setEditHeight] = useState<number | string>("");
  const [editSex, setEditSex] = useState<string>("");
  const [editGoal, setEditGoal] = useState<string>("");
  const [savingBio, setSavingBio] = useState(false);
  const [showFitnessModal, setShowFitnessModal] = useState(false);
  const [fGoal, setFGoal] = useState<string>("");
  const [fActivityLevel, setFActivityLevel] = useState<
    "sedentary" | "light" | "moderate" | "active" | "very_active" | ""
  >("");
  const [fWorkoutStyle, setFWorkoutStyle] = useState<
    "strength" | "cardio" | "mix" | ""
  >("");
  const [fWorkoutsPerWeek, setFWorkoutsPerWeek] = useState<string>("");
  const [fDailyCalorie, setFDailyCalorie] = useState<string>("");
  const [fAutoFilled, setFAutoFilled] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const res = await getCurrentUserProfile();
      if (!mounted) return;
      if (res.success) {
        setProfile(res.profile ?? null);
        setBioProfile(res.bioProfile ?? null);
        // initialize fitness modal defaults
        const bp = res.bioProfile ?? null;
        setFGoal(bp?.goal ?? "");
        setFActivityLevel(bp?.activity_level ?? "");
        setFWorkoutStyle(bp?.workout_style ?? "");
        setFWorkoutsPerWeek(
          bp?.workouts_per_week ? String(bp.workouts_per_week) : "",
        );
        setFDailyCalorie(bp?.calorie_goal ? String(bp.calorie_goal) : "");
        setFirstname(res.profile?.firstname ?? "");
        setLastname(res.profile?.lastname ?? "");
      } else {
        // clear when there's no authenticated user
        setProfile(null);
        setBioProfile(null);
        setFirstname("");
        setLastname("");
      }
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Estimate calories for fitness modal (Mifflin-St Jeor)
  function estimateCaloriesForModal(): number | null {
    const bp = bioProfile;
    if (!bp) return null;
    const age = bp.age;
    const weight = bp.weight; // lbs
    const heightInInches = bp.height;
    const sex = bp.sex;
    const goal = fGoal;
    const activity = fActivityLevel;

    if (!age || !weight || !heightInInches || !sex || !goal || !activity)
      return null;

    const heightCm = (heightInInches as number) * 2.54;
    const weightKg = (weight as number) * 0.45359237;
    let bmr: number;
    if (sex.toLowerCase() === "male") {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else if (sex.toLowerCase() === "female") {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    } else {
      const male = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
      const female = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
      bmr = (male + female) / 2;
    }

    const multiplier =
      activity === "sedentary"
        ? 1.2
        : activity === "light"
          ? 1.375
          : activity === "moderate"
            ? 1.55
            : activity === "active"
              ? 1.725
              : 1.2;

    let maintenance = Math.round(bmr * multiplier);
    if (goal === "Cutting" || goal === "cutting") maintenance -= 500;
    else if (goal === "Bulking" || goal === "bulking") maintenance += 500;
    maintenance = Math.max(1200, maintenance);
    return maintenance;
  }

  // auto-fill calorie in modal when eligible
  useEffect(() => {
    if (!showFitnessModal) return;
    const est = estimateCaloriesForModal();
    if (est && (fDailyCalorie === "" || fAutoFilled)) {
      setFDailyCalorie(String(est));
      setFAutoFilled(true);
    }
  }, [showFitnessModal, fActivityLevel, fGoal, bioProfile]);

  useEffect(() => {
    // If not signed in and we haven't shown the prompt yet, show a popup
    if (!loading && !user && !promptShown) {
      setPromptShown(true);
      Alert.alert("Please Sign In to View your Profile!", undefined, [
        { text: "Sign In", onPress: () => setAuthModalVisible(true) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
    // reset promptShown when user signs in so it can show if they sign out again
    if (user) setPromptShown(false);
  }, [loading, user, promptShown]);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Profile</Text>

        {loading ? (
          <ActivityIndicator color={Palette.accent} />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email ?? "—"}</Text>

              <Text style={[styles.label, { marginTop: Spacing.md }]}>
                Name
              </Text>
              {editing ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={firstname}
                    onChangeText={setFirstname}
                    placeholder="First name"
                    placeholderTextColor={Palette.textMuted}
                  />
                  <TextInput
                    style={styles.input}
                    value={lastname}
                    onChangeText={setLastname}
                    placeholder="Last name"
                    placeholderTextColor={Palette.textMuted}
                  />
                  <View style={styles.rowRight}>
                    <Pressable
                      style={[styles.btn, { backgroundColor: Palette.accent }]}
                      onPress={async () => {
                        setSavingName(true);
                        await updateUserProfile(firstname, lastname);
                        setSavingName(false);
                        setEditing(false);
                        const res = await getCurrentUserProfile();
                        if (res.success) setProfile(res.profile ?? null);
                      }}
                    >
                      <Text style={styles.btnText}>
                        {savingName ? "Saving..." : "Save"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.btn,
                        { backgroundColor: Palette.bgElevated },
                      ]}
                      onPress={() => {
                        setEditing(false);
                        setFirstname(profile?.firstname ?? "");
                        setLastname(profile?.lastname ?? "");
                      }}
                    >
                      <Text style={styles.btnTextSecondary}>Cancel</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.value}>
                    {profile?.firstname || profile?.lastname
                      ? `${profile?.firstname ?? ""} ${profile?.lastname ?? ""}`.trim()
                      : "—"}
                  </Text>
                  <View style={styles.rowRight}>
                    <Pressable
                      style={styles.ghostBtn}
                      onPress={() => setEditing(true)}
                    >
                      <Text style={styles.ghostText}>Edit</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Bio</Text>
              {bioProfile ? (
                <>
                  {bioEditing ? (
                    <>
                      <Text style={styles.inputLabel}>Height (inches)</Text>
                      <TextInput
                        style={styles.input}
                        value={String(editHeight)}
                        onChangeText={(t) =>
                          setEditHeight(t.replace(/[^0-9]/g, ""))
                        }
                        keyboardType="numeric"
                        placeholder="e.g. 70"
                        placeholderTextColor={Palette.textMuted}
                      />

                      <Text
                        style={[styles.inputLabel, { marginTop: Spacing.sm }]}
                      >
                        Sex
                      </Text>
                      <View style={styles.optionRowSmall}>
                        {["Male", "Female"].map((g) => (
                          <Pressable
                            key={g}
                            onPress={() => setEditSex(g)}
                            style={[
                              styles.optionSmall,
                              editSex === g && {
                                borderColor: Palette.accent,
                                backgroundColor: Palette.accentMuted,
                              },
                            ]}
                          >
                            <Text style={{ color: Palette.textPrimary }}>
                              {g}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      <Text
                        style={[styles.inputLabel, { marginTop: Spacing.sm }]}
                      >
                        Goal
                      </Text>
                      <View style={styles.optionRowSmall}>
                        {["Cutting", "Bulking", "Maintaining"].map((g) => (
                          <Pressable
                            key={g}
                            onPress={() => setEditGoal(g)}
                            style={[
                              styles.optionSmall,
                              editGoal === g && {
                                borderColor: Palette.accent,
                                backgroundColor: Palette.accentMuted,
                              },
                            ]}
                          >
                            <Text style={{ color: Palette.textPrimary }}>
                              {g}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      <View style={styles.rowRight}>
                        <Pressable
                          style={[
                            styles.btn,
                            { backgroundColor: Palette.accent },
                          ]}
                          onPress={async () => {
                            setSavingBio(true);
                            const updates: any = {};
                            if (editHeight)
                              updates.height = parseInt(String(editHeight));
                            if (editSex) updates.sex = editSex;
                            if (editGoal) updates.goal = editGoal;
                            const res = await updateBioProfile(updates);
                            setSavingBio(false);
                            if (res.success) {
                              const r = await getCurrentUserProfile();
                              if (r.success) {
                                setBioProfile(r.bioProfile ?? null);
                              }
                              setBioEditing(false);
                            }
                          }}
                        >
                          <Text style={styles.btnText}>
                            {savingBio ? "Saving..." : "Save"}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.btn,
                            { backgroundColor: Palette.bgElevated },
                          ]}
                          onPress={() => {
                            setBioEditing(false);
                            setEditHeight(bioProfile.height ?? "");
                            setEditSex(bioProfile.sex ?? "");
                            setEditGoal(bioProfile.goal ?? "");
                          }}
                        >
                          <Text style={styles.btnTextSecondary}>Cancel</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.bioRow}>
                        <Text style={styles.bioItem}>
                          Age: {bioProfile.age}
                        </Text>
                        <Text style={styles.bioItem}>
                          Weight: {bioProfile.weight} {bioProfile.weight_unit}
                        </Text>
                        <Text style={styles.bioItem}>
                          Height: {bioProfile.height} {bioProfile.height_unit}
                        </Text>
                        <Text style={styles.bioItem}>
                          Sex: {bioProfile.sex}
                        </Text>
                        <Text style={styles.bioItem}>
                          Goal: {bioProfile.goal}
                        </Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Pressable
                          style={styles.ghostBtn}
                          onPress={() => {
                            setBioEditing(true);
                            setEditHeight(bioProfile.height ?? "");
                            setEditSex(bioProfile.sex ?? "");
                            setEditGoal(bioProfile.goal ?? "");
                          }}
                        >
                          <Text style={styles.ghostText}>Edit</Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </>
              ) : (
                <Text style={styles.value}>No bio profile found.</Text>
              )}
            </View>

            {/* Fitness Information Card */}
            <View style={styles.card}>
              <Text style={styles.label}>Fitness Information</Text>
              {bioProfile ? (
                <>
                  <View style={styles.bioRow}>
                    <Text style={styles.bioItem}>
                      Activity Level: {bioProfile.activity_level ?? "—"}
                    </Text>
                    <Text style={styles.bioItem}>
                      Workout Style: {bioProfile.workout_style ?? "—"}
                    </Text>
                    <Text style={styles.bioItem}>
                      Workouts/week: {bioProfile.workouts_per_week ?? "—"}
                    </Text>
                    <Text style={styles.bioItem}>
                      Calorie Goal: {bioProfile.calorie_goal ?? "—"}
                    </Text>
                    <Text style={styles.bioItem}>
                      Goal: {bioProfile.goal ?? "—"}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Pressable
                      style={styles.ghostBtn}
                      onPress={() => {
                        // initialize modal fields from current bioProfile
                        setFGoal(bioProfile.goal ?? "");
                        setFActivityLevel(bioProfile.activity_level ?? "");
                        setFWorkoutStyle(bioProfile.workout_style ?? "");
                        setFWorkoutsPerWeek(
                          bioProfile.workouts_per_week
                            ? String(bioProfile.workouts_per_week)
                            : "",
                        );
                        setFDailyCalorie(
                          bioProfile.calorie_goal
                            ? String(bioProfile.calorie_goal)
                            : "",
                        );
                        setFAutoFilled(false);
                        setShowFitnessModal(true);
                      }}
                    >
                      <Text style={styles.ghostText}>Edit</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Text style={styles.value}>No fitness information.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Change Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                placeholderTextColor={Palette.textMuted}
                secureTextEntry
              />
              <View style={{ marginTop: 12 }}>
                <Pressable
                  style={[styles.btn, { backgroundColor: Palette.accent }]}
                  onPress={async () => {
                    if (!newPassword) return;
                    setChangingPassword(true);
                    const res = await changeUserPassword(newPassword);
                    setChangingPassword(false);
                    if (res.success) setNewPassword("");
                  }}
                >
                  <Text style={styles.btnText}>
                    {changingPassword ? "Changing..." : "Change Password"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 36 }} />
        {/* Fitness Edit Modal */}
        <Modal visible={showFitnessModal} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <Text style={styles.modalTitle}>Edit Fitness Information</Text>

              <Text style={styles.inputLabel}>Goal</Text>
              <View style={styles.optionRowSmall}>
                {[
                  { value: "cutting", label: "Cut" },
                  { value: "bulking", label: "Bulk" },
                  { value: "maintaining", label: "Maintain" },
                ].map((o) => (
                  <Pressable
                    key={o.value}
                    onPress={() => setFGoal(o.value)}
                    style={[
                      styles.optionSmall,
                      fGoal === o.value && {
                        borderColor: Palette.accent,
                        backgroundColor: Palette.accentMuted,
                      },
                    ]}
                  >
                    <Text style={{ color: Palette.textPrimary }}>
                      {o.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>
                Activity Level
              </Text>
              <View style={styles.optionRowSmall}>
                {[
                  { value: "sedentary", label: "Sedentary" },
                  { value: "light", label: "Light" },
                  { value: "moderate", label: "Moderate" },
                  { value: "active", label: "Active" },
                ].map((o) => (
                  <Pressable
                    key={o.value}
                    onPress={() => setFActivityLevel(o.value as any)}
                    style={[
                      styles.optionSmall,
                      fActivityLevel === o.value && {
                        borderColor: Palette.accent,
                        backgroundColor: Palette.accentMuted,
                      },
                    ]}
                  >
                    <Text style={{ color: Palette.textPrimary }}>
                      {o.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>
                Workout Style
              </Text>
              <View style={styles.optionRowSmall}>
                {[
                  { value: "strength", label: "Strength" },
                  { value: "cardio", label: "Cardio" },
                  { value: "mix", label: "Mix" },
                ].map((o) => (
                  <Pressable
                    key={o.value}
                    onPress={() => setFWorkoutStyle(o.value as any)}
                    style={[
                      styles.optionSmall,
                      fWorkoutStyle === o.value && {
                        borderColor: Palette.accent,
                        backgroundColor: Palette.accentMuted,
                      },
                    ]}
                  >
                    <Text style={{ color: Palette.textPrimary }}>
                      {o.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>
                Goal Workouts per week
              </Text>
              <TextInput
                style={styles.input}
                value={fWorkoutsPerWeek}
                onChangeText={(t) =>
                  setFWorkoutsPerWeek(t.replace(/[^0-9]/g, ""))
                }
                keyboardType="numeric"
                placeholder="e.g. 3"
                placeholderTextColor={Palette.textMuted}
              />

              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>
                Daily Calorie Goal
              </Text>
              <TextInput
                style={styles.input}
                value={fDailyCalorie}
                onChangeText={(v) => {
                  setFDailyCalorie(v);
                  setFAutoFilled(false);
                }}
                keyboardType="numeric"
                placeholder="e.g. 2200"
                placeholderTextColor={Palette.textMuted}
              />

              <View style={styles.rowRight}>
                <Pressable
                  style={[styles.btn, { backgroundColor: Palette.accent }]}
                  onPress={async () => {
                    // save updates
                    setSavingBio(true);
                    const updates: any = {
                      goal: fGoal || null,
                      activity_level: fActivityLevel || null,
                      workout_style: fWorkoutStyle || null,
                      workouts_per_week: fWorkoutsPerWeek
                        ? parseInt(fWorkoutsPerWeek)
                        : null,
                      calorie_goal: fDailyCalorie
                        ? parseInt(fDailyCalorie)
                        : null,
                    };
                    const res = await updateBioProfile(updates);
                    setSavingBio(false);
                    if (res.success) {
                      const r = await getCurrentUserProfile();
                      if (r.success) {
                        setBioProfile(r.bioProfile ?? null);
                      }
                      setShowFitnessModal(false);
                    }
                  }}
                >
                  <Text style={styles.btnText}>
                    {savingBio ? "Saving..." : "Save"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, { backgroundColor: Palette.bgElevated }]}
                  onPress={() => setShowFitnessModal(false)}
                >
                  <Text style={styles.btnTextSecondary}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Palette.bg,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Palette.textPrimary,
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  label: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: "600",
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    color: Palette.textPrimary,
  },
  input: {
    backgroundColor: Palette.bgInput,
    color: Palette.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    marginTop: Spacing.sm,
  },
  rowRight: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: Spacing.md,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radii.md,
    alignItems: "center",
  },
  btnText: {
    color: Palette.white,
    fontWeight: "700",
  },
  btnTextSecondary: {
    color: Palette.textPrimary,
    fontWeight: "700",
  },
  ghostBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: "center",
  },
  ghostText: {
    color: Palette.accent,
    fontWeight: "700",
  },
  bioRow: {
    marginTop: Spacing.sm,
    gap: 6,
  },
  bioItem: {
    color: Palette.textPrimary,
    fontSize: 14,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginBottom: 6,
  },
  optionRowSmall: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  optionSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 640,
    backgroundColor: Palette.bgElevated,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Palette.textPrimary,
    marginBottom: Spacing.sm,
  },
});
