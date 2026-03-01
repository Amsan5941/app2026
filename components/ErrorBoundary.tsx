/**
 * ErrorBoundary — catches unhandled JS exceptions in the React tree
 * and shows a friendly fallback screen instead of a white crash.
 */

import { DarkPalette, Radii, Spacing } from "@/constants/theme";
import React, { Component, ErrorInfo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console (and optionally to a crash-reporting service)
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            An unexpected error occurred. You can try again, and if the problem
            persists, please restart the app.
          </Text>
          {__DEV__ && this.state.error && (
            <View style={styles.debugBox}>
              <Text style={styles.debugTitle}>Debug info</Text>
              <Text style={styles.debugText} numberOfLines={8}>
                {this.state.error.toString()}
              </Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={this.handleRetry}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const P = DarkPalette;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["3xl"],
  },
  icon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: P.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: P.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  debugBox: {
    backgroundColor: P.bgCard,
    borderRadius: Radii.md,
    padding: Spacing.md,
    width: "100%",
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: P.errorMuted,
  },
  debugTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: P.error,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },
  debugText: {
    fontSize: 12,
    color: P.textMuted,
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: P.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["3xl"],
    borderRadius: Radii.md,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: P.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
