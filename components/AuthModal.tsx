import { useAuth } from "@/hooks/useAuth";
import React, { useState } from "react";
import {
    Alert,
    Button,
    Modal,
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
  const { signIn, signUp, user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleSubmit() {
    setErrorText(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await signUp(email, password);
        if (error) setErrorText(error.message || JSON.stringify(error));
        else {
          Alert.alert(
            "Account created",
            "Your account was created. Check email if confirmation required.",
          );
          onClose();
        }
      } else {
        const { data, error } = await signIn(email, password);
        if (error) setErrorText(error.message || JSON.stringify(error));
        else {
          Alert.alert("Signed in", "You are now signed in.");
          onClose();
        }
      }
    } catch (e: any) {
      setErrorText(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {mode === "login" ? "Sign in" : "Create account"}
          </Text>
          {user && <Text style={styles.info}>Signed in as {user.email}</Text>}
          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
          />
          <Button
            title={
              loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"
            }
            onPress={handleSubmit}
            disabled={loading}
          />
          <View style={styles.row}>
            <Button
              title={
                mode === "login" ? "Switch to Sign up" : "Switch to Sign in"
              }
              onPress={() => setMode(mode === "login" ? "signup" : "login")}
            />
            <Button title="Close" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "92%",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
  },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  error: { color: "red", marginBottom: 8 },
  info: { color: "#333", marginBottom: 8 },
});
