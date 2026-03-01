/**
 * Food Recognition Service
 *
 * Connects the Expo frontend to the FastAPI backend for:
 * - Image-based food recognition (camera/gallery photos → AI nutrition analysis)
 * - Text-based food recognition (meal descriptions → AI nutrition estimate)
 * - Food log CRUD (create, read, daily summary, delete)
 */

import { supabase } from "@/constants/supabase";
import { Platform } from "react-native";

// ── Configuration ──────────────────────────────────────────
// Get the appropriate API URL based on platform.
// In production EXPO_PUBLIC_BACKEND_URL **must** be set (e.g. in your .env or
// EAS build secrets). In dev mode we fall back to localhost-style URLs.
function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

  // In development, web always uses localhost (the env var is typically a
  // LAN IP for physical mobile devices which browsers can't reliably reach).
  if (__DEV__ && Platform.OS === "web") {
    return "http://localhost:8000/api/v1";
  }

  // If the env variable is set, always use it (works for both prod & dev)
  if (envUrl) {
    return envUrl;
  }

  // Production without a configured URL → fail loudly instead of silently
  if (!__DEV__) {
    console.error(
      "[FoodRecognition] EXPO_PUBLIC_BACKEND_URL is not set! " +
        "Add it to your .env or EAS build secrets so production API calls work.",
    );
    // Return an obviously-broken URL so requests fail fast with a clear message
    return "https://BACKEND_URL_NOT_CONFIGURED";
  }

  // Development mode - platform-specific localhost URLs
  if (Platform.OS === "android") {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    return "http://10.0.2.2:8000/api/v1";
  }
  // iOS simulator / default
  return "http://localhost:8000/api/v1";

  // NOTE: For physical devices in dev, set EXPO_PUBLIC_BACKEND_URL in .env
  // with your computer's local IP (e.g. http://192.168.1.100:8000/api/v1).
  // The device must be on the same WiFi network as your computer.
}

const API_BASE_URL = getApiBaseUrl();

// Debug log to verify correct URL is loaded
if (__DEV__) {
  console.log(`[FoodRecognition] Platform: ${Platform.OS}, API Base URL: ${API_BASE_URL}`);
}

// ── Types ──────────────────────────────────────────────────

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type AIFoodItem = {
  food_name: string;
  serving_size: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
};

export type AIRecognitionResult = {
  food_items: AIFoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  ai_confidence: number;
  source: "openai" | "custom_model" | "hybrid" | "manual";
  raw_response?: string;
};

export type FoodLog = {
  id: string;
  user_id: string;
  image_url: string | null;
  total_calories: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fat: number | null;
  ai_confidence: number | null;
  logged_date: string;
  meal_type: string | null;
  notes: string | null;
  created_at: string;
  food_items?: AIFoodItem[];
};

export type DailySummary = {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  meal_count: number;
  meals_by_type: Record<
    string,
    {
      count: number;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }
  >;
};

// ── Helper: get auth user id ───────────────────────────────

async function getAuthUserId(): Promise<string | null> {
  try {
    // getSession() reads from local storage — no network round-trip
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Fetch wrapper with a default timeout so requests never hang forever. */
function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

// ── Food Recognition ───────────────────────────────────────

/**
 * Send a food photo to the backend for AI analysis.
 * Returns detected food items with calories/macros.
 */
export async function recognizeFoodImage(
  imageUri: string,
  mealType?: MealType,
  saveLog: boolean = true
): Promise<AIRecognitionResult> {
  const authId = await getAuthUserId();

  const formData = new FormData();

  // Create file object from URI
  const filename = imageUri.split("/").pop() || "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  if (Platform.OS === "web") {
    // On web, fetch the image URI as a blob and append it properly
    const blobResponse = await fetch(imageUri);
    const blob = await blobResponse.blob();
    formData.append("image", blob, filename);
  } else {
    // On native (iOS/Android), React Native handles the {uri,name,type} convention
    formData.append("image", {
      uri: imageUri,
      name: filename,
      type,
    } as any);
  }

  if (authId) formData.append("auth_id", authId);
  if (mealType) formData.append("meal_type", mealType);
  formData.append("save_log", String(saveLog));

  if (__DEV__) console.log("[FoodRecognition] Uploading image to:", `${API_BASE_URL}/recognize/image`);

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/recognize/image`, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    }, 30000); // image uploads get a longer timeout

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Recognition failed: ${errBody}`);
    }

    return await response.json();
  } catch (error: any) {
    // Provide more helpful error messages
    if (error.message.includes("Network request failed") || error.message.includes("Failed to fetch")) {
      throw new Error(
        "Cannot connect to backend server. Make sure:\n" +
        "1. Backend is running (npm run dev in backend folder)\n" +
        "2. Your phone is on the same WiFi network as your computer\n" +
        `3. Server URL is correct: ${API_BASE_URL}`
      );
    }
    throw error;
  }
}

/**
 * Send a text description of food to the backend for AI analysis.
 */
export async function recognizeFoodText(
  description: string,
  mealType?: MealType,
  saveLog: boolean = true
): Promise<AIRecognitionResult> {
  const authId = await getAuthUserId();

  const formData = new FormData();
  formData.append("description", description);
  if (authId) formData.append("auth_id", authId);
  if (mealType) formData.append("meal_type", mealType);
  formData.append("save_log", String(saveLog));

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/recognize/text`, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    }, 15000);

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Text recognition failed: ${errBody}`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.message.includes("Network request failed") || error.message.includes("Failed to fetch")) {
      throw new Error(
        "Cannot connect to backend server. Make sure:\n" +
        "1. Backend is running (npm run dev in backend folder)\n" +
        "2. Your phone is on the same WiFi network as your computer\n" +
        `3. Server URL is correct: ${API_BASE_URL}`
      );
    }
    throw error;
  }
}

// ── Food Logs ──────────────────────────────────────────────

/**
 * Get food logs for the current user, optionally filtered by date.
 * Uses auth_id so backend resolves the internal user_id (bypasses RLS).
 */
export async function getFoodLogs(
  targetDate?: string,
  limit: number = 50
): Promise<FoodLog[]> {
  const authId = await getAuthUserId();
  if (!authId) return [];

  let url = `${API_BASE_URL}/food-logs/${authId}?limit=${limit}`;
  if (targetDate) url += `&target_date=${targetDate}`;

  const response = await fetchWithTimeout(url);
  if (!response.ok) return [];

  const data = await response.json();
  return data.data ?? [];
}

/**
 * Get daily nutrition summary for the current user.
 * Uses auth_id so backend resolves the internal user_id (bypasses RLS).
 */
export async function getDailySummary(
  targetDate: string
): Promise<DailySummary | null> {
  const authId = await getAuthUserId();
  if (!authId) return null;

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/food-logs/summary/${authId}?target_date=${targetDate}`
  );

  if (!response.ok) return null;

  const data = await response.json();
  return data.data ?? null;
}

/**
 * Delete a food log entry.
 */
export async function deleteFoodLog(foodLogId: string): Promise<boolean> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/food-logs/${foodLogId}`, {
    method: "DELETE",
  });
  return response.ok;
}

/**
 * Get a single food log with all its items.
 */
export async function getFoodLogDetail(foodLogId: string): Promise<FoodLog | null> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/food-logs/detail/${foodLogId}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.data ?? null;
}
