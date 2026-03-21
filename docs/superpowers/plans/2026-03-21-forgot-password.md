# Forgot Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a forgot password workflow so users can request a password reset email from the login screen and set a new password via deep link.

**Architecture:** A new `ForgotPasswordModal` handles email collection and sends the reset email via Supabase. A new Expo Router screen `app/reset-password.tsx` handles the deep link token exchange and new password entry. `login-button.tsx` owns both modal visibility states to avoid modal stacking issues on iOS/Android.

**Tech Stack:** React Native, Expo Router, Supabase JS (`supabase.auth.resetPasswordForEmail`, `supabase.auth.updateUser`, `supabase.auth.onAuthStateChange`), TypeScript, Jest (unit tests for pure logic only — no component test infrastructure exists in this project).

---

## Pre-Implementation Precondition

Before starting Task 4 (reset-password screen), verify the Supabase dashboard password policy:
- Go to your Supabase project → Authentication → Auth Policies → Password strength
- Confirm minimum length is 8 and special characters are required
- If the policy differs from `isValidPassword` (8+ chars, 1 special char), align them before writing the screen

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `hooks/useAuth.tsx` | Add `resetPassword` method + type |
| Create | `components/ForgotPasswordModal.tsx` | Email input, send reset email, success/error states |
| Modify | `components/AuthModal.tsx` | Add optional `onForgotPassword?` prop + "Forgot password?" link |
| Modify | `components/login-button.tsx` | Own both modal visibility states |
| Create | `app/reset-password.tsx` | Handle deep link token, new password form |
| Modify | `app/_layout.tsx` | Register `reset-password` Stack.Screen |

---

## Task 1: Add `resetPassword` to `useAuth`

**Files:**
- Modify: `hooks/useAuth.tsx`

- [ ] **Step 1: Add `resetPassword` to the `AuthContextValue` type**

Open `hooks/useAuth.tsx`. The `AuthContextValue` type is defined at lines 32–48. Add this line after `signOut`:

```typescript
resetPassword: (email: string) => Promise<{ error: import("@supabase/supabase-js").AuthError | null }>;
```

The block should now look like:
```typescript
type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  authReady: boolean;
  internalUserId: string | null;
  signUp: (...) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: import("@supabase/supabase-js").AuthError | null }>;
};
```

- [ ] **Step 2: Implement the `resetPassword` function**

After the `signIn` function (around line 283), add:

```typescript
async function resetPassword(email: string): Promise<{ error: import("@supabase/supabase-js").AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "app2026://reset-password",
  });
  return { error };
}
```

- [ ] **Step 3: Expose it via the Provider value object**

Find the `AuthContext.Provider` value object (around line 295–305). Add `resetPassword` to it:

```typescript
<AuthContext.Provider
  value={{
    user,
    session,
    authReady,
    internalUserId,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }}
>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors related to `useAuth.tsx`.

- [ ] **Step 5: Commit**

```bash
git add hooks/useAuth.tsx
git commit -m "feat: add resetPassword method to useAuth"
```

---

## Task 2: Create `ForgotPasswordModal`

**Files:**
- Create: `components/ForgotPasswordModal.tsx`

- [ ] **Step 1: Create the component**

Create `components/ForgotPasswordModal.tsx` with this content:

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ForgotPasswordModal.tsx
git commit -m "feat: add ForgotPasswordModal component"
```

---

## Task 3: Wire "Forgot password?" into `AuthModal` and `login-button`

**Files:**
- Modify: `components/AuthModal.tsx`
- Modify: `components/login-button.tsx`

- [ ] **Step 1: Add `onForgotPassword` prop to `AuthModal`**

In `components/AuthModal.tsx`, update the component props (lines 24–30):

```typescript
export default function AuthModal({
  visible,
  onClose,
  onForgotPassword,
}: {
  visible: boolean;
  onClose: () => void;
  onForgotPassword?: () => void;
}) {
```

- [ ] **Step 2: Add the "Forgot password?" link in login mode**

In `AuthModal.tsx`, find the `footerActions` View (around line 530). Currently it contains just the `switchBtn`. Add the forgot password link **above** the sign-up switch link, but only when in login mode and `onForgotPassword` is provided:

```typescript
<View style={styles.footerActions}>
  {/* Back button for signup steps */}
  {mode === "signup" && signupStep !== "account" && (
    <Pressable
      style={styles.backBtn}
      onPress={() => {
        setErrorText(null);
        setSignupStep(signupStep === "bio" ? "account" : "bio");
      }}
    >
      <Text style={styles.backBtnText}>← Back</Text>
    </Pressable>
  )}

  {/* Forgot password — login mode only, only when handler provided */}
  {mode === "login" && onForgotPassword ? (
    <Pressable style={styles.switchBtn} onPress={onForgotPassword}>
      <Text style={styles.forgotPasswordText}>Forgot password?</Text>
    </Pressable>
  ) : null}

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
```

- [ ] **Step 3: Add `forgotPasswordText` style**

In the `StyleSheet.create` block at the bottom of `AuthModal.tsx`, add:

```typescript
forgotPasswordText: {
  color: Palette.textSecondary,
  fontSize: 14,
  fontWeight: "600",
},
```

- [ ] **Step 4: Update `login-button.tsx` to own both modal states**

Replace the entire content of `components/login-button.tsx` with:

```typescript
import { Palette, Radii, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AuthModal from "./AuthModal";
import ForgotPasswordModal from "./ForgotPasswordModal";

export default function LoginButton() {
  const { user, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  return (
    <View style={styles.container}>
      <AuthModal
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        onForgotPassword={() => {
          setShowAuth(false);
          setShowForgotPassword(true);
        }}
      />
      <ForgotPasswordModal
        visible={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
      <Pressable
        style={({ pressed }) => [
          user ? styles.signOutBtn : styles.loginBtn,
          pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
        ]}
        onPress={() => (user ? signOut() : setShowAuth(true))}
      >
        <Text style={user ? styles.signOutText : styles.loginText}>
          {user ? "Sign Out" : "Sign In"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingRight: Spacing.md },
  loginBtn: {
    backgroundColor: Palette.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.full,
  },
  loginText: {
    color: Palette.white,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  signOutBtn: {
    backgroundColor: Palette.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  signOutText: {
    color: Palette.textSecondary,
    fontWeight: "600",
    fontSize: 13,
  },
});
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 6: Manual smoke test — "Forgot password?" link appears**

Run the app (`npx expo start`), open the Sign In modal, and confirm:
- "Forgot password?" link appears below the Sign In button
- Tapping it closes the auth modal and opens the `ForgotPasswordModal`
- The forgot password modal shows email input + "Send Reset Link" button

- [ ] **Step 7: Commit**

```bash
git add components/AuthModal.tsx components/login-button.tsx
git commit -m "feat: wire forgot password link into auth modal and login button"
```

---

## Task 4: Create `reset-password` screen

> **Precondition:** Confirm the Supabase dashboard password policy matches `isValidPassword` (8+ chars + special char) before this task.

**Files:**
- Create: `app/reset-password.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Create `app/reset-password.tsx`**

```typescript
import { Palette, Radii, Spacing } from "@/constants/theme";
import { supabase } from "@/constants/supabase";
import { isValidPassword } from "@/utils/signupValidation";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type ScreenState = "waiting" | "form" | "loading" | "success" | "error" | "invalid";

export default function ResetPasswordScreen() {
  const [screenState, setScreenState] = useState<ScreenState>("waiting");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Wait for Supabase to exchange the recovery token from the deep link URL.
    // The client fires PASSWORD_RECOVERY when the token is valid.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setScreenState("form");
      }
    });

    // If PASSWORD_RECOVERY hasn't fired in 3 seconds, the screen was opened
    // without a valid token — redirect home.
    timeoutRef.current = setTimeout(() => {
      setScreenState("invalid");
      router.replace("/(tabs)");
    }, 3000);

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleUpdatePassword() {
    setErrorText(null);

    if (!password || !confirmPassword) {
      setErrorText("Please fill in both password fields");
      return;
    }
    if (password !== confirmPassword) {
      setErrorText("Passwords do not match");
      return;
    }
    if (!isValidPassword(password)) {
      setErrorText(
        "Password must be at least 8 characters and include at least one special character"
      );
      return;
    }

    setScreenState("loading");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setScreenState("error");
      setPassword("");
      setConfirmPassword("");
      setErrorText(error.message || "Failed to update password. Please request a new reset link.");
      return;
    }

    setScreenState("success");
    setTimeout(() => router.replace("/(tabs)"), 1500);
  }

  if (screenState === "waiting" || screenState === "invalid") {
    return (
      <View style={styles.centered}>
        <Text style={styles.waitingText}>Verifying reset link…</Text>
      </View>
    );
  }

  if (screenState === "success") {
    return (
      <View style={styles.centered}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successText}>Password updated! Redirecting…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>🔐</Text>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Choose a strong password for your account.
            </Text>
          </View>

          {errorText ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorText}</Text>
              {screenState === "error" ? (
                <Text style={styles.errorHint}>
                  The reset link may have expired. Return to sign in and request a new one.
                </Text>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor={Palette.textMuted}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
            autoFocus
          />

          <Text style={styles.inputLabel}>Confirm Password</Text>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor={Palette.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.input}
            secureTextEntry
          />

          {password.length > 0 && !isValidPassword(password) ? (
            <Text style={styles.passwordHint}>
              Must be at least 8 characters and include a special character.
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              screenState === "loading" && { opacity: 0.6 },
            ]}
            onPress={handleUpdatePassword}
            disabled={screenState === "loading"}
          >
            <Text style={styles.primaryBtnText}>
              {screenState === "loading" ? "Updating…" : "Update Password"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: Palette.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  waitingText: {
    color: Palette.textSecondary,
    fontSize: 16,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  successText: {
    color: Palette.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Palette.bg,
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
  errorHint: {
    color: Palette.textSecondary,
    fontSize: 12,
    marginTop: Spacing.xs,
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
  passwordHint: {
    color: Palette.textSecondary,
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  primaryBtn: {
    backgroundColor: Palette.accent,
    borderRadius: Radii.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  primaryBtnText: {
    color: Palette.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
```

- [ ] **Step 2: Register `reset-password` in `_layout.tsx`**

In `app/_layout.tsx`, find the `<Stack>` block (around line 151). Add a new `Stack.Screen` after the `modal` screen entry:

```typescript
<Stack.Screen
  name="reset-password"
  options={{ headerShown: false }}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/reset-password.tsx app/_layout.tsx
git commit -m "feat: add reset-password screen for deep link token handling"
```

---

## Task 5: End-to-end test

These are manual steps — no automated E2E infrastructure exists in this project.

- [ ] **Step 1: Test the "request reset" flow**

1. Open the app on a device or simulator
2. Tap "Sign In" → `AuthModal` opens
3. Confirm "Forgot password?" link appears below the Sign In button
4. Tap it → `AuthModal` closes, `ForgotPasswordModal` opens
5. Enter a valid email for a known account → tap "Send Reset Link"
6. Confirm the button changes to "Email Sent" and is disabled
7. Confirm success message appears: *"Check your email for a reset link…"*
8. Check the inbox — reset email should arrive within ~1 minute

- [ ] **Step 2: Test the "set new password" flow**

1. Tap the link in the reset email
2. Confirm the app opens to the `reset-password` screen (not a browser)
3. Confirm the form appears after a brief "Verifying reset link…" state
4. Enter a new password that passes the validator (8+ chars, 1 special char) in both fields
5. Tap "Update Password"
6. Confirm "✅ Password updated! Redirecting…" appears
7. Confirm the app redirects to the home tab
8. Sign out, then sign back in with the new password to verify it worked

- [ ] **Step 3: Test error paths**

1. **Invalid token**: Manually navigate to `app2026://reset-password` without a token (or wait >1hr for link to expire) — confirm redirect to home
2. **Password mismatch**: Enter different values in the two fields — confirm error message
3. **Weak password**: Enter "password" (no special char) — confirm error message
4. **Unknown email in forgot modal**: Enter a fake email — confirm success message still shown (no enumeration)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete forgot password workflow"
```
