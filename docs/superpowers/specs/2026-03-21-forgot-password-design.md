# Forgot Password Feature — Design Spec

**Date:** 2026-03-21
**Project:** ForgeFit (app2026)

---

## Overview

Add a forgot password workflow to the existing auth flow. Users who cannot remember their password can request a reset email from the login screen. Tapping the link in that email opens the app and lets them set a new password.

---

## User Flow

1. User opens `AuthModal` in login mode and taps **"Forgot password?"** below the Sign In button.
2. `ForgotPasswordModal` opens — user enters their email and taps **"Send Reset Link"**.
3. `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'app2026://reset-password' })` is called.
4. Modal shows a success state: *"Check your email for a reset link. If you don't receive it within a few minutes, you can request another."* (shown regardless of whether the email exists — prevents enumeration).
5. User taps the link in their email → iOS/Android deep links into the app at `app2026://reset-password` with a recovery token in the URL hash.
6. Supabase client exchanges the recovery token and fires `onAuthStateChange` with event type `PASSWORD_RECOVERY`.
7. `app/reset-password.tsx` screen subscribes to `onAuthStateChange` locally on mount and waits for `PASSWORD_RECOVERY`. If this event does not arrive within ~3 seconds (e.g. screen navigated to without a valid token), the screen redirects to `/(tabs)`.
8. On `PASSWORD_RECOVERY` event, the new-password form is shown. User enters and confirms a new password, then taps **"Update Password"**.
9. `supabase.auth.updateUser({ password })` is called. On success the user is navigated to `/(tabs)`.

---

## Components & Files

### Create

**`components/ForgotPasswordModal.tsx`**
- Modal card matching the existing `AuthModal` visual style (same card, overlay, close button).
- States: `idle` → `loading` → `success` | `error`.
- Validates email format with existing `isValidEmail` from `utils/signupValidation` before calling Supabase.
- The "Send Reset Link" button is disabled for 60 seconds after a successful submission (client-side cooldown to match Supabase's server-side rate limit).
- On success: shows a confirmation message with hint about email delay; user closes the modal manually.
- On error: shows an inline error message.

**`app/reset-password.tsx`**
- Expo Router screen, accessible only via deep link (`app2026://reset-password`).
- On mount, subscribes to `supabase.auth.onAuthStateChange` locally. Waits for the `PASSWORD_RECOVERY` event (the Supabase client exchanges the recovery token from the URL hash and fires this automatically).
- If `PASSWORD_RECOVERY` is not received within ~3 seconds of mount, redirects to `/(tabs)` (handles the case where the screen is opened without a valid token).
- While waiting: shows a loading indicator.
- Once `PASSWORD_RECOVERY` fires: renders new password + confirm password fields + "Update Password" button.
- Validates password with existing `isValidPassword` from `utils/signupValidation`.
- Validates that both fields match before submitting.
- On error from `updateUser` (e.g. expired token): shows error message with a prompt to request a new reset email. Password fields are cleared so the user does not need to manually clear them before retrying.
- On success: navigates to `/(tabs)`.
- The `onAuthStateChange` subscription in `useAuth.tsx` (`_event` handler in the provider) already handles the `PASSWORD_RECOVERY` case — it sets session/user state normally. The reset screen does not need to suppress or conflict with that; it simply acts on the event locally to know when to show the form.

### Modify

**`components/AuthModal.tsx`**
- Add a **"Forgot password?"** `Pressable` link in the login mode view, below the Sign In primary button and above the "Don't have an account? Sign Up" link.
- The component accepts one new optional prop: `onForgotPassword?: () => void`.
- The "Forgot password?" link is only rendered when `onForgotPassword` is provided (conditional render). This prevents a runtime crash if the prop is omitted.
- Tapping the link calls `onForgotPassword()`.

**`components/login-button.tsx`**
- Owns both `AuthModal` and `ForgotPasswordModal` visibility state (`showAuth`, `showForgotPassword` booleans).
- When `onForgotPassword` is called: set `showAuth = false`, `showForgotPassword = true`.
- This avoids nested modals and iOS/Android modal stacking issues.

**`hooks/useAuth.tsx`**
- Add `resetPassword(email: string): Promise<{ error: AuthError | null }>` to:
  1. The `AuthContextValue` type (alongside `signUp`, `signIn`, `signOut`)
  2. The `AuthContext.Provider` value object
  3. The function implementation — wraps `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'app2026://reset-password' })`

**`app/_layout.tsx`**
- Add one `Stack.Screen` entry for `reset-password` with `headerShown: false` to ensure correct presentation and cold-start deep link behavior.

---

## Error Handling

| Scenario | Handling |
|---|---|
| Invalid email format | Inline error in `ForgotPasswordModal` before API call |
| Unknown email | Success message shown anyway (Supabase behavior — prevents enumeration) |
| Supabase rate limit (60s cooldown) | Client-side button disable for 60s after submission |
| Expired/invalid token on reset screen | Inline error + prompt to request a new reset email; fields cleared |
| No recovery session / opened without token | Redirect to `/(tabs)` after ~3s timeout waiting for `PASSWORD_RECOVERY` event |
| Password too weak | Inline error using `isValidPassword` validator |
| Password fields don't match | Inline error before API call |
| Network/API error | Inline error message |

---

## Pre-Implementation Precondition

Before building `reset-password.tsx`, verify the Supabase project's auth password policy in the dashboard (Authentication → Policies → Password strength). The `isValidPassword` validator requires 8+ characters and at least one special character. The Supabase dashboard policy **must** match this rule. If they differ, either:
- Update `isValidPassword` to match the Supabase policy, **or**
- Update the Supabase dashboard policy to match the validator

Document the confirmed policy setting before writing the reset screen. This is required — not optional.

## Constraints

- Reuses existing `isValidEmail` and `isValidPassword` validators, subject to the precondition above.
- Matches existing `AuthModal` visual language (card style, colors, typography from `constants/theme`).
- No new dependencies required.
- The `app2026://` URL scheme is already registered in `app.json`.
