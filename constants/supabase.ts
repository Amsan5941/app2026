import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

function getEnvVar(key: string): string | undefined {
  // 1) process.env for web/build-time
  if (typeof process !== "undefined" && (process as any).env?.[key]) {
    return (process as any).env[key];
  }

  // 2) Expo config extra (EAS/app.config.js)
  const expoExtra =
    (Constants as any).expoConfig?.extra ?? (Constants as any).manifest?.extra;
  if (expoExtra && expoExtra[key]) return expoExtra[key];

  // 3) Expo Constants.env (fallbacks for older setups)
  if (
    (Constants as any).manifest &&
    (Constants as any).manifest.extra &&
    (Constants as any).manifest.extra[key]
  ) {
    return (Constants as any).manifest.extra[key];
  }

  return undefined;
}

const supabaseUrl = getEnvVar("EXPO_PUBLIC_SUPABASE_URL") ?? "";
const supabaseAnonKey = getEnvVar("EXPO_PUBLIC_SUPABASE_ANON_KEY") ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Missing Supabase env vars: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Ensure .env is set and app.config.js exposes EXPO_PUBLIC_* via extra.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
