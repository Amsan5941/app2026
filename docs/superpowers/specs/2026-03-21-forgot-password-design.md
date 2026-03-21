# Forgot Password Feature — Design Spec

**Date:** 2026-03-21
**Project:** ForgeFit (app2026)
**Status:** Approved

---

## Overview

Add a forgot password workflow to the existing auth flow. Users who cannot remember their password can request a reset email from the login screen. Tapping the link in that email opens the app and lets them set a new password.

---

## User Flow

1. User opens `AuthModal` in login mode and taps **"Forgot password?"** below the Sign In button.
2. `ForgotPasswordModal` opens — user enters their email and taps **"Send Reset Link"**.
3. `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'app2026://reset-password' })` is called.
4. Modal shows a success state: *"Check your email for a reset link"* (regardless of whether the email exists — prevents enumeration).
5. User taps the link in their email → iOS/Android deep links into the app at `app2026://reset-password` with a recovery token in the URL hash.
6. `app/reset-password.tsx` screen renders — user enters and confirms a new password, then taps **"Update Password"**.
7. `supabase.auth.updateUser({ password })` is called. On success the user is navigated to `/(tabs)`.

---

## Components & Files

### Create

**`components/ForgotPasswordModal.tsx`**
- Modal card matching the existing `AuthModal` visual style (same card, overlay, close button).
- States: `idle` → `loading` → `success` | `error`.
- Validates email format with existing `isValidEmail` from `utils/signupValidation` before calling Supabase.
- On success: shows a confirmation message; user closes the modal.
- On error: shows an inline error message.

**`app/reset-password.tsx`**
- Expo Router screen, accessible only via deep link (`app2026://reset-password`).
- On mount, reads the recovery token from the URL. The Supabase client automatically handles the token from the URL hash and establishes a temporary session.
- UI: new password field + confirm password field + "Update Password" button.
- Validates password with existing `isValidPassword` from `utils/signupValidation`.
- Validates that both fields match before submitting.
- Calls `supabase.auth.updateUser({ password })`.
- On success: navigates to `/(tabs)`.
- On error (expired/invalid token): shows error with a prompt to request a new reset email.
- If the screen is reached without a valid recovery session: redirects to `/(tabs)`.

### Modify

**`components/AuthModal.tsx`**
- Add a **"Forgot password?"** `Pressable` link in the login mode view, below the Sign In primary button.
- Tapping it closes/hides `AuthModal` and opens `ForgotPasswordModal`.
- No other changes to `AuthModal`.

**`hooks/useAuth.tsx`**
- Add `resetPassword(email: string): Promise<{ error: AuthError | null }>` method.
- Wraps `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'app2026://reset-password' })`.
- Exposes the method via `AuthContext`.

---

## Error Handling

| Scenario | Handling |
|---|---|
| Invalid email format | Inline error in `ForgotPasswordModal` before API call |
| Unknown email | Success message shown anyway (Supabase behavior, prevents enumeration) |
| Expired/invalid token on reset screen | Inline error + prompt to request a new email |
| Password too weak | Inline error using `isValidPassword` validator |
| Password fields don't match | Inline error before API call |
| No recovery session on reset screen | Redirect to `/(tabs)` |
| Network/API error | Inline error message |

---

## Constraints

- Reuses existing `isValidEmail` and `isValidPassword` validators.
- Matches existing `AuthModal` visual language (card style, colors, typography from `constants/theme`).
- No changes to `_layout.tsx` or navigation stack configuration.
- No new dependencies required.
- The `app2026://` URL scheme is already registered in `app.json`.
