import { Palette, Radii, Spacing } from "@/constants/theme";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const res = await getCurrentUserProfile();
      if (!mounted) return;
      if (res.success) {
        setProfile(res.profile ?? null);
        setBioProfile(res.bioProfile ?? null);
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
});
