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
// Change this to your deployed backend URL in production
const API_BASE_URL = __DEV__
  ? "http://localhost:8000/api/v1"
  : "https://your-backend.railway.app/api/v1";

// Debug log to verify correct URL is loaded
if (__DEV__ && Platform.OS === "web") {
  console.log("[FoodRecognition] API Base URL:", API_BASE_URL);
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
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

  const response = await fetch(`${API_BASE_URL}/recognize/image`, {
    method: "POST",
    body: formData,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Recognition failed: ${errBody}`);
  }

  return await response.json();
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

  const response = await fetch(`${API_BASE_URL}/recognize/text`, {
    method: "POST",
    body: formData,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Text recognition failed: ${errBody}`);
  }

  return await response.json();
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

  const response = await fetch(url);
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

  const response = await fetch(
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
  const response = await fetch(`${API_BASE_URL}/food-logs/${foodLogId}`, {
    method: "DELETE",
  });
  return response.ok;
}

/**
 * Get a single food log with all its items.
 */
export async function getFoodLogDetail(foodLogId: string): Promise<FoodLog | null> {
  const response = await fetch(`${API_BASE_URL}/food-logs/detail/${foodLogId}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.data ?? null;
}
