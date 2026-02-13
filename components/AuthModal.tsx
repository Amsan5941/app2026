import { useAuth } from "@/hooks/useAuth";
import React, { useState } from "react";
import {
  Alert,
  Button,
  Modal,
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
  const [height, setHeight] = useState("");
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
          // Validate account info
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
          // Move to bio step
          setSignupStep("bio");
          setLoading(false);
        } else {
          // Bio step - validate and create account
          if (!age || !weight || !height || !sex || !goal) {
            setErrorText("Please fill in all bio information");
            setLoading(false);
            return;
          }
          
          const bioData = {
            age: parseInt(age),
            weight: parseFloat(weight),
            height: parseInt(height),
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
              "Account created",
              "Your account was created. Check email if confirmation required."
            );
            resetForm();
            onClose();
          }
        }
      } else {
        const { data, error } = await signIn(email, password);
        if (error) setErrorText(error.message || JSON.stringify(error));
        else {
          Alert.alert("Signed in", "You are now signed in.");
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
    setHeight("");
    setSex("");
    setGoal("");
    setSignupStep("account");
    setErrorText(null);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.card}>
            <Text style={styles.title}>
              {mode === "login"
                ? "Sign in"
                : signupStep === "account"
                  ? "Create account"
                  : "Your fitness profile"}
            </Text>
            {user && <Text style={styles.info}>Signed in as {user.email}</Text>}
            {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

            {/* Login or Signup Account Step */}
            {mode === "login" || signupStep === "account" ? (
              <>
                {mode === "signup" && (
                  <>
                    <TextInput
                      placeholder="First Name"
                      value={firstname}
                      onChangeText={setFirstname}
                      style={styles.input}
                      autoCapitalize="words"
                    />
                    <TextInput
                      placeholder="Last Name"
                      value={lastname}
                      onChangeText={setLastname}
                      style={styles.input}
                      autoCapitalize="words"
                    />
                  </>
                )}
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
              </>
            ) : null}

            {/* Signup Bio Step */}
            {mode === "signup" && signupStep === "bio" ? (
              <>
                <TextInput
                  placeholder="Age"
                  value={age}
                  onChangeText={setAge}
                  style={styles.input}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="Weight (lbs)"
                  value={weight}
                  onChangeText={setWeight}
                  style={styles.input}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  placeholder="Height (inches)"
                  value={height}
                  onChangeText={setHeight}
                  style={styles.input}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Sex</Text>
                <View style={styles.optionRow}>
                  {["male", "female", "other"].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButton,
                        sex === option && styles.optionButtonSelected,
                      ]}
                      onPress={() => setSex(option)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          sex === option && styles.optionTextSelected,
                        ]}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Goal</Text>
                <View style={styles.optionRow}>
                  {["cutting", "bulking", "maintaining"].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButton,
                        goal === option && styles.optionButtonSelected,
                      ]}
                      onPress={() => setGoal(option)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          goal === option && styles.optionTextSelected,
                        ]}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            <Button
              title={
                loading
                  ? "Please wait..."
                  : mode === "login"
                    ? "Sign in"
                    : signupStep === "account"
                      ? "Next"
                      : "Create account"
              }
              onPress={handleSubmit}
              disabled={loading}
            />

            <View style={styles.row}>
              {mode === "signup" && signupStep === "bio" && (
                <Button
                  title="Back"
                  onPress={() => {
                    setSignupStep("account");
                    setErrorText(null);
                  }}
                />
              )}
              <Button
                title={
                  mode === "login" ? "Switch to Sign up" : "Switch to Sign in"
                }
                onPress={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  resetForm();
                }}
              />
              <Button title="Close" onPress={() => { resetForm(); onClose(); }} />
            </View>
          </View>
        </ScrollView>
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  card: {
    width: "92%",
    maxWidth: 500,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
  },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  label: { 
    fontSize: 14, 
    fontWeight: "600", 
    marginTop: 8, 
    marginBottom: 8,
    color: "#333" 
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  optionButtonSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  optionText: {
    color: "#333",
    fontSize: 14,
  },
  optionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  row: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginTop: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  error: { color: "red", marginBottom: 8 },
  info: { color: "#333", marginBottom: 8 },
});
