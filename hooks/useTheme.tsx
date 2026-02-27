/**
 * App Theme Context
 *
 * Provides a reactive theme (light / dark / system) that persists across
 * sessions via AsyncStorage.
 *
 * Usage in any component:
 *   const { palette: P, isDark, themeMode, setThemeMode } = useTheme();
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { DarkPalette, LightPalette } from "@/constants/theme";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "@app_theme_mode";

type ThemeContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  palette: typeof DarkPalette;
};

const ThemeCtx = createContext<ThemeContextValue>({
  themeMode: "dark",
  setThemeMode: () => {},
  isDark: true,
  palette: DarkPalette,
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to "dark" so the app never flashes a mismatch on first launch
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const systemScheme = useColorScheme(); // "light" | "dark" | null

  // Load user's saved preference from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((val) => {
      if (val === "light" || val === "dark" || val === "system") {
        setThemeModeState(val);
      }
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === "system") return (systemScheme ?? "dark") === "dark";
    return themeMode === "dark";
  }, [themeMode, systemScheme]);

  const palette = isDark ? DarkPalette : LightPalette;

  const value = useMemo(
    () => ({ themeMode, setThemeMode, isDark, palette }),
    [themeMode, setThemeMode, isDark, palette],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
