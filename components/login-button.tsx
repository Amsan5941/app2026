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
