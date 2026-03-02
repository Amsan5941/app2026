import { Palette, Radii, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import {
    isValidEmail,
    isValidPassword
} from "@/utils/signupValidation";
import React, { useState } from "react";
import {
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

export default function AuthModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Validation helpers (imported from @/utils/signupValidation)

  async function handleSubmit() {
    setErrorText(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!firstname.trim() || !lastname.trim()) {
          setErrorText("Please enter your first and last name");
          return;
        }
        if (!email.trim() || !password.trim()) {
          setErrorText("Please enter email and password");
          return;
        }
        if (!isValidEmail(email)) {
          setErrorText("Please enter a valid email address (must include @)");
          return;
        }
        if (!isValidPassword(password)) {
          setErrorText(
            "Password must be at least 8 characters and include at least one special character",
          );
          return;
        }

        const { error } = await signUp(email, password, firstname, lastname);
        if (error) {
          setErrorText(error.message || JSON.stringify(error));
        } else {
          Alert.alert(
            "Welcome aboard! 💪",
            "Please check your email to verify your account, then sign in to start crushing your fitness goals!",
          );
          resetForm();
          onClose();
        }
      } else {
        if (!email.trim() || !password.trim()) {
          setErrorText("Please enter email and password");
          return;
        }
        if (!isValidEmail(email)) {
          setErrorText("Please enter a valid email address (must include @)");
          return;
        }
        if (!isValidPassword(password)) {
          setErrorText(
            "Password must be at least 8 characters and include at least one special character",
          );
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          setErrorText(error.message || JSON.stringify(error));
        } else {
          resetForm();
          onClose();
        }
      }
    } catch (e: any) {
      setErrorText(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEmail("");
    setPassword("");
    setFirstname("");
    setLastname("");
    setErrorText(null);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              {/* Close button */}
              <Pressable
                style={styles.closeBtn}
                onPress={() => {
                  resetForm();
                  onClose();
                }}
                hitSlop={12}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerEmoji}>
                  {mode === "login" ? "👋" : "🚀"}
                </Text>
                <Text style={styles.title}>
                  {mode === "login" ? "Welcome Back" : "Join the Grind"}
                </Text>
                <Text style={styles.subtitle}>
                  {mode === "login"
                    ? "Sign in to continue your journey"
                    : "Create your account to get started"}
                </Text>
              </View>

              {errorText ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {errorText}</Text>
                </View>
              ) : null}

              {/* Account Form (login + signup) */}
              <View style={styles.formSection}>
                  {mode === "signup" && (
                    <View style={styles.nameRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>First Name</Text>
                        <TextInput
                          placeholder="John"
                          placeholderTextColor={Palette.textMuted}
                          value={firstname}
                          onChangeText={setFirstname}
                          style={styles.input}
                          autoCapitalize="words"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Last Name</Text>
                        <TextInput
                          placeholder="Doe"
                          placeholderTextColor={Palette.textMuted}
                          value={lastname}
                          onChangeText={setLastname}
                          style={styles.input}
                          autoCapitalize="words"
                        />
                      </View>
                    </View>
                  )}
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    placeholder="you@example.com"
                    placeholderTextColor={Palette.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={Palette.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    secureTextEntry
                  />
                  {/* Password requirement hint shown when user has typed something invalid */}
                  {password.length > 0 && !isValidPassword(password) ? (
                    <Text style={styles.passwordReq}>
                      Password must be at least 8 characters and include at
                      least one special character.
                    </Text>
                  ) : null}
              </View>

              {/* Primary action button */}
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                  loading && { opacity: 0.6 },
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.primaryBtnText}>
                  {loading
                    ? "Please wait..."
                    : mode === "login"
                      ? "Sign In"
                      : "Create Account 🎉"}
                </Text>
              </Pressable>

              {/* Secondary actions */}
              <View style={styles.footerActions}>
                <Pressable
                  style={styles.switchBtn}
                  onPress={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    resetForm();
                  }}
                >
                  <Text style={styles.switchBtnText}>
                    {mode === "login"
                      ? "Don't have an account? Sign Up"
                      : "Already have an account? Sign In"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Palette.overlay,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: Palette.bgElevated,
    borderRadius: Radii.xl,
    padding: Spacing["3xl"],
    borderWidth: 1,
    borderColor: Palette.border,
  },
  closeBtn: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.bgCard,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  closeBtnText: {
    color: Palette.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Palette.textPrimary,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: "center",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    gap: 4,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.border,
  },
  stepDotActive: {
    backgroundColor: Palette.accent,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Palette.border,
  },
  stepLineActive: {
    backgroundColor: Palette.accent,
  },
  errorBox: {
    backgroundColor: Palette.errorMuted,
    borderRadius: Radii.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: Palette.error,
    fontSize: 13,
    fontWeight: "500",
  },
  passwordReq: {
    color: Palette.textSecondary,
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  formSection: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Palette.bgInput,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.md,
    padding: 14,
    fontSize: 16,
    color: Palette.textPrimary,
  },
  nameRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  heightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  heightInput: {
    flex: 1,
  },
  heightUnit: {
    fontSize: 14,
    fontWeight: "600",
    color: Palette.textSecondary,
  },
  optionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgInput,
    alignItems: "center",
    gap: 4,
  },
  optionButtonSelected: {
    backgroundColor: Palette.accentMuted,
    borderColor: Palette.accent,
  },
  optionIcon: {
    fontSize: 18,
  },
  optionText: {
    color: Palette.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: Palette.accent,
    fontWeight: "700",
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.bgCard,
    borderWidth: 1,
    borderColor: Palette.border,
    marginLeft: Spacing.sm,
  },
  infoBtnText: {
    fontSize: 16,
  },
  infoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    width: "86%",
    maxWidth: 440,
    backgroundColor: Palette.bgElevated,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Palette.textPrimary,
    marginBottom: Spacing.sm,
  },
  infoText: {
    color: Palette.textSecondary,
    fontSize: 14,
  },
  infoClose: {
    marginTop: Spacing.md,
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    backgroundColor: Palette.accent,
  },
  infoCloseText: {
    color: Palette.white,
    fontWeight: "700",
  },
  primaryBtn: {
    backgroundColor: Palette.accent,
    borderRadius: Radii.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  primaryBtnText: {
    color: Palette.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  footerActions: {
    alignItems: "center",
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  backBtn: {
    paddingVertical: 8,
  },
  backBtnText: {
    color: Palette.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  switchBtn: {
    paddingVertical: 8,
  },
  switchBtnText: {
    color: Palette.accent,
    fontSize: 14,
    fontWeight: "600",
  },
});
