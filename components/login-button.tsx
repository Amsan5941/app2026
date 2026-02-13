import { useAuth } from "@/hooks/useAuth";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AuthModal from "./AuthModal";

export default function LoginButton() {
  const { user, signOut } = useAuth();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <AuthModal visible={visible} onClose={() => setVisible(false)} />
      <TouchableOpacity
        style={styles.button}
        onPress={() => (user ? signOut() : setVisible(true))}
      >
        <Text style={styles.text}>{user ? "Sign out" : "Log in"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingRight: 12 },
  button: { paddingHorizontal: 12, paddingVertical: 6 },
  text: { color: "#007AFF", fontWeight: "600" },
});
