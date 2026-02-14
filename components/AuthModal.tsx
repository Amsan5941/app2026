import { Palette, Radii, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
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
  TouchableOpacity,
  View,
} from "react-native";

type SignupStep = "account" | "bio";

export default function AuthModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { signIn, signUp, user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState<SignupStep>("account");
  
  // Account info
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  
  // Bio info
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [sex, setSex] = useState("");
  const [goal, setGoal] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleSubmit() {
    setErrorText(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        if (signupStep === "account") {
          if (!firstname.trim() || !lastname.trim()) {
            setErrorText("Please enter your first and last name");
            setLoading(false);
            return;
          }
          if (!email.trim() || !password.trim()) {
            setErrorText("Please enter email and password");
            setLoading(false);
            return;
          }
          setSignupStep("bio");
          setLoading(false);
        } else {
          if (!age || !weight || !heightFeet || !sex || !goal) {
            setErrorText("Please fill in all bio information");
            setLoading(false);
            return;
          }
          
          const totalInches = parseInt(heightFeet) * 12 + (heightInches ? parseInt(heightInches) : 0);
          
          const bioData = {
            age: parseInt(age),
            weight: parseFloat(weight),
            height: totalInches,
            sex,
            goal,
          };
          
          const { data, error } = await signUp(
            email,
            password,
            firstname,
            lastname,
            bioData
          );
          
          if (error) setErrorText(error.message || JSON.stringify(error));
          else {
            Alert.alert(
              "Welcome aboard! 💪",
              "Your account has been created. Let's start crushing your goals!"
            );
            resetForm();
            onClose();
          }
        }
      } else {
        const { data, error } = await signIn(email, password);
        if (error) setErrorText(error.message || JSON.stringify(error));
        else {
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
    setAge("");
    setWeight("");
    setHeightFeet("");
    setHeightInches("");
    setSex("");
    setGoal("");
    setSignupStep("account");
    setErrorText(null);
  }

  const stepNumber = mode === "signup" ? (signupStep === "account" ? 1 : 2) : 0;

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
                onPress={() => { resetForm(); onClose(); }}
                hitSlop={12}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerEmoji}>
                  {mode === "login" ? "👋" : signupStep === "account" ? "🚀" : "📊"}
                </Text>
                <Text style={styles.title}>
                  {mode === "login"
                    ? "Welcome Back"
                    : signupStep === "account"
                      ? "Join the Grind"
                      : "Your Fitness Profile"}
                </Text>
                <Text style={styles.subtitle}>
                  {mode === "login"
                    ? "Sign in to continue your journey"
                    : signupStep === "account"
                      ? "Create your account to get started"
                      : "Help us personalize your experience"}
                </Text>
                {mode === "signup" && (
                  <View style={styles.stepIndicator}>
                    <View style={[styles.stepDot, stepNumber >= 1 && styles.stepDotActive]} />
                    <View style={[styles.stepLine, stepNumber >= 2 && styles.stepLineActive]} />
                    <View style={[styles.stepDot, stepNumber >= 2 && styles.stepDotActive]} />
                  </View>
                )}
              </View>

              {errorText ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️  {errorText}</Text>
                </View>
              ) : null}

              {/* Login or Signup Account Step */}
              {mode === "login" || signupStep === "account" ? (
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
                </View>
              ) : null}

              {/* Signup Bio Step */}
              {mode === "signup" && signupStep === "bio" ? (
                <View style={styles.formSection}>
                  <View style={styles.nameRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Age</Text>
                      <TextInput
                        placeholder="25"
                        placeholderTextColor={Palette.textMuted}
                        value={age}
                        onChangeText={setAge}
                        style={styles.input}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Weight (lbs)</Text>
                      <TextInput
                        placeholder="175"
                        placeholderTextColor={Palette.textMuted}
                        value={weight}
                        onChangeText={setWeight}
                        style={styles.input}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  
                  <Text style={styles.inputLabel}>Height</Text>
                  <View style={styles.heightRow}>
                    <TextInput
                      placeholder="5"
                      placeholderTextColor={Palette.textMuted}
                      value={heightFeet}
                      onChangeText={setHeightFeet}
                      style={[styles.input, styles.heightInput]}
                      keyboardType="numeric"
                    />
                    <Text style={styles.heightUnit}>ft</Text>
                    <TextInput
                      placeholder="10"
                      placeholderTextColor={Palette.textMuted}
                      value={heightInches}
                      onChangeText={setHeightInches}
                      style={[styles.input, styles.heightInput]}
                      keyboardType="numeric"
                    />
                    <Text style={styles.heightUnit}>in</Text>
                  </View>

                  <Text style={styles.inputLabel}>Sex</Text>
                  <View style={styles.optionRow}>
                    {[
                      { value: "male", label: "Male", icon: "♂️" },
                      { value: "female", label: "Female", icon: "♀️" },
                      { value: "other", label: "Other", icon: "⚧️" },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionButton,
                          sex === option.value && styles.optionButtonSelected,
                        ]}
                        onPress={() => setSex(option.value)}
                      >
                        <Text style={styles.optionIcon}>{option.icon}</Text>
                        <Text
                          style={[
                            styles.optionText,
                            sex === option.value && styles.optionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Goal</Text>
                  <View style={styles.optionRow}>
                    {[
                      { value: "cutting", label: "Cut", icon: "🔥" },
                      { value: "bulking", label: "Bulk", icon: "💪" },
                      { value: "maintaining", label: "Maintain", icon: "⚖️" },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionButton,
                          goal === option.value && styles.optionButtonSelected,
                        ]}
                        onPress={() => setGoal(option.value)}
                      >
                        <Text style={styles.optionIcon}>{option.icon}</Text>
                        <Text
                          style={[
                            styles.optionText,
                            goal === option.value && styles.optionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

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
                      : signupStep === "account"
                        ? "Continue →"
                        : "Create Account 🎉"}
                </Text>
              </Pressable>

              {/* Secondary actions */}
              <View style={styles.footerActions}>
                {mode === "signup" && signupStep === "bio" && (
                  <Pressable
                    style={styles.backBtn}
                    onPress={() => { setSignupStep("account"); setErrorText(null); }}
                  >
                    <Text style={styles.backBtnText}>← Back</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.switchBtn}
                  onPress={() => { setMode(mode === "login" ? "signup" : "login"); resetForm(); }}
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
