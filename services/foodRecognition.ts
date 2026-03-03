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
  console.log(
    `[FoodRecognition] Platform: ${Platform.OS}, API Base URL: ${API_BASE_URL}`,
  );
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
  edited?: boolean;
  original_calories?: number | null;
  original_protein?: number | null;
  original_carbs?: number | null;
  original_fat?: number | null;
  source?: string | null;
  barcode?: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  count: number;
  next_cursor: string | null;
  has_more: boolean;
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
  timeoutMs: number = 5000,
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
  saveLog: boolean = true,
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

  if (__DEV__)
    console.log(
      "[FoodRecognition] Uploading image to:",
      `${API_BASE_URL}/recognize/image`,
    );

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/recognize/image`,
      {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      },
      30000,
    ); // image uploads get a longer timeout

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Recognition failed: ${errBody}`);
    }

    return await response.json();
  } catch (error: any) {
    // Provide more helpful error messages
    if (
      error.message.includes("Network request failed") ||
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        "Cannot connect to backend server. Make sure:\n" +
          "1. Backend is running (npm run dev in backend folder)\n" +
          "2. Your phone is on the same WiFi network as your computer\n" +
          `3. Server URL is correct: ${API_BASE_URL}`,
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
  saveLog: boolean = true,
): Promise<AIRecognitionResult> {
  const authId = await getAuthUserId();

  const formData = new FormData();
  formData.append("description", description);
  if (authId) formData.append("auth_id", authId);
  if (mealType) formData.append("meal_type", mealType);
  formData.append("save_log", String(saveLog));

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/recognize/text`,
      {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      },
      15000,
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Text recognition failed: ${errBody}`);
    }

    return await response.json();
  } catch (error: any) {
    if (
      error.message.includes("Network request failed") ||
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        "Cannot connect to backend server. Make sure:\n" +
          "1. Backend is running (npm run dev in backend folder)\n" +
          "2. Your phone is on the same WiFi network as your computer\n" +
          `3. Server URL is correct: ${API_BASE_URL}`,
      );
    }
    throw error;
  }
}

// ── Food Logs ──────────────────────────────────────────────

/**
 * Get food logs for the current user with cursor-based pagination.
 * Uses auth_id so backend resolves the internal user_id (bypasses RLS).
 */
export async function getFoodLogs(
  targetDate?: string,
  limit: number = 20,
  cursor?: string | null,
): Promise<PaginatedResponse<FoodLog>> {
  const authId = await getAuthUserId();
  if (!authId)
    return { data: [], count: 0, next_cursor: null, has_more: false };

  let url = `${API_BASE_URL}/food-logs/${authId}?limit=${limit}`;
  if (targetDate) url += `&target_date=${targetDate}`;
  if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

  const response = await fetchWithTimeout(url);
  if (!response.ok)
    return { data: [], count: 0, next_cursor: null, has_more: false };

  const result = await response.json();
  return {
    data: result.data ?? [],
    count: result.count ?? 0,
    next_cursor: result.next_cursor ?? null,
    has_more: result.has_more ?? false,
  };
}

/**
 * Get daily nutrition summary for the current user.
 * Uses auth_id so backend resolves the internal user_id (bypasses RLS).
 */
export async function getDailySummary(
  targetDate: string,
): Promise<DailySummary | null> {
  const authId = await getAuthUserId();
  if (!authId) return null;

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/food-logs/summary/${authId}?target_date=${targetDate}`,
  );

  if (!response.ok) return null;

  const data = await response.json();
  return data.data ?? null;
}

/**
 * Delete a food log entry.
 */
export async function deleteFoodLog(foodLogId: string): Promise<boolean> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/food-logs/${foodLogId}`,
    {
      method: "DELETE",
    },
  );
  return response.ok;
}

/**
 * Get a single food log with all its items.
 */
export async function getFoodLogDetail(
  foodLogId: string,
): Promise<FoodLog | null> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/food-logs/detail/${foodLogId}`,
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.data ?? null;
}

// ── Barcode ────────────────────────────────────────────────

export type BarcodeProduct = {
  barcode: string;
  product_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string | null;
  image_url: string | null;
  brand: string | null;
  found: boolean;
};

/**
 * Look up a product by barcode using Open Food Facts via the backend.
 */
export async function lookupBarcode(
  barcode: string,
): Promise<BarcodeProduct | null> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/barcode/${barcode}`,
      undefined,
      10000,
    );
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error("Barcode lookup failed");
    }
    return await response.json();
  } catch (error: any) {
    console.error("[Barcode] Lookup failed:", error.message);
    return null;
  }
}

/**
 * Save a barcode-scanned food as a food log.
 */
export async function logBarcodeFood(params: {
  barcode: string;
  product_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size?: string | null;
  meal_type: MealType;
}): Promise<boolean> {
  const authId = await getAuthUserId();
  if (!authId) return false;

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/barcode/log`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          user_id: authId,
          ...params,
        }),
      },
      10000,
    );
    return response.ok;
  } catch {
    return false;
  }
}

// ── Edit Food Log ──────────────────────────────────────────

export type FoodLogUpdateParams = {
  total_calories?: number;
  total_protein?: number;
  total_carbs?: number;
  total_fat?: number;
  serving_size?: string;
  notes?: string;
};

/**
 * Update an existing food log's nutrition values.
 */
export async function updateFoodLog(
  foodLogId: string,
  updates: FoodLogUpdateParams,
): Promise<FoodLog | null> {
  const authId = await getAuthUserId();
  if (!authId) return null;

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/food-logs/${foodLogId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ user_id: authId, ...updates }),
      },
      10000,
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.data ?? null;
  } catch {
    return null;
  }
}

// ── Macro Targets ──────────────────────────────────────────

export type MacroTargets = {
  calorie_goal: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
};

/**
 * Get macro targets for the current user from the backend.
 */
export async function getMacroTargets(): Promise<MacroTargets | null> {
  const authId = await getAuthUserId();
  if (!authId) return null;

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/profile/${authId}`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.macro_targets ?? null;
  } catch {
    return null;
  }
}

/**
 * Update macro targets for the current user.
 */
export async function updateMacroTargets(
  targets: Partial<MacroTargets>,
): Promise<boolean> {
  const authId = await getAuthUserId();
  if (!authId) return false;

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/profile/${authId}/macros`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(targets),
      },
      10000,
    );
    return response.ok;
  } catch {
    return false;
  }
}
