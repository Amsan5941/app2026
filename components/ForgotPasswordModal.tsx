import { Palette, Radii, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { isValidEmail } from "@/utils/signupValidation";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type ModalState = "idle" | "loading" | "success" | "error";

export default function ForgotPasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<ModalState>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);

  function handleClose() {
    setEmail("");
    setState("idle");
    setErrorText(null);
    setCooldown(false);
    onClose();
  }

  async function handleSubmit() {
    setErrorText(null);
    if (!email.trim()) {
      setErrorText("Please enter your email address");
      return;
    }
    if (!isValidEmail(email)) {
      setErrorText("Please enter a valid email address (must include @)");
      return;
    }
    setState("loading");
    const { error } = await resetPassword(email.trim());
    if (error) {
      setState("error");
      setErrorText(error.message || "Something went wrong. Please try again.");
      return;
    }
    setState("success");
    setCooldown(true);
    // Re-enable after 60s to match Supabase rate limit
    setTimeout(() => setCooldown(false), 60_000);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>

            <View style={styles.header}>
              <Text style={styles.headerEmoji}>🔑</Text>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>
                {state === "success"
                  ? "Check your email for a reset link. If you don't receive it within a few minutes, you can request another."
                  : "Enter your email and we'll send you a reset link."}
              </Text>
            </View>

            {errorText ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorText}</Text>
              </View>
            ) : null}

            {state !== "success" ? (
              <>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  placeholder="you@example.com"
                  placeholderTextColor={Palette.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    (state === "loading" || cooldown) && { opacity: 0.6 },
                  ]}
                  onPress={handleSubmit}
                  disabled={state === "loading" || cooldown}
                >
                  <Text style={styles.primaryBtnText}>
                    {state === "loading" ? "Sending..." : cooldown ? "Email Sent" : "Send Reset Link"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
                onPress={handleClose}
              >
                <Text style={styles.primaryBtnText}>Done</Text>
              </Pressable>
            )}

            <Pressable style={styles.backBtn} onPress={handleClose}>
              <Text style={styles.backBtnText}>← Back to Sign In</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Palette.overlay,
    justifyContent: "center",
    alignItems: "center",
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
    lineHeight: 20,
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
    marginBottom: Spacing.lg,
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
  backBtn: {
    alignItems: "center",
    marginTop: Spacing.xl,
    paddingVertical: 8,
  },
  backBtnText: {
    color: Palette.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
});
