import { createClient, SupabaseClient } from "@supabase/supabase-js";

// expo-constants is a TurboModule.  On certain iPad / iPadOS combinations
// accessing it at module-load time can throw before the bridge is ready.
let _Constants: typeof import("expo-constants").default | null = null;
function getConstants() {
  if (!_Constants) {
    try {
      _Constants = require("expo-constants").default;
    } catch {
      // If expo-constants fails we fall back to process.env only.
    }
  }
  return _Constants;
}

function getEnvVar(key: string): string | undefined {
  // 1) process.env for web/build-time
  if (typeof process !== "undefined" && (process as any).env?.[key]) {
    return (process as any).env[key];
  }

  try {
    // 2) Expo config extra (EAS/app.config.js)
    const Constants = getConstants();
    const expoExtra =
      (Constants as any)?.expoConfig?.extra ?? (Constants as any)?.manifest?.extra;
    if (expoExtra && expoExtra[key]) return expoExtra[key];

    // 3) Expo Constants.env (fallbacks for older setups)
    if (
      (Constants as any)?.manifest &&
      (Constants as any).manifest.extra &&
      (Constants as any).manifest.extra[key]
    ) {
      return (Constants as any).manifest.extra[key];
    }
  } catch {
    // Native module access failed — fall through to undefined.
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

let _supabase: SupabaseClient;
try {
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (e) {
  console.error("[Supabase] createClient failed:", e);
  // Create a dummy client so imports don't explode. Every call will fail
  // gracefully later — the user simply won't see data until config is fixed.
  _supabase = createClient(
    "https://placeholder.supabase.co",
    "placeholder",
  );
}

export const supabase = _supabase;
