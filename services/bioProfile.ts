import { supabase } from "@/constants/supabase";
import { getUserId } from "@/services/userCache";

export type BioProfile = {
  id: string;
  user_id: string;
  age: number | null;
  weight: number | null;
  weight_unit: string;
  height: number | null;
  height_unit: string;
  sex: string | null;
  goal: string | null;
  goal_weight: number | null;
  activity_level: string | null;
  workout_style: string | null;
  workouts_per_week: number | null;
  calorie_goal: number | null;
  workout_counter: number | null;
  created_at: string;
  updated_at: string;
};

export type BioProfileUpdate = {
  age?: number;
  weight?: number;
  weight_unit?: string;
  height?: number;
  height_unit?: string;
  sex?: string;
  goal?: string;
  goal_weight?: number | null;
  activity_level?: string | null;
  workout_style?: string | null;
  workouts_per_week?: number | null;
  calorie_goal?: number | null;
};

// getUserId() imported from userCache (shared, fast, cached)

/**
 * Get the bio profile for the current user
 */
export async function getCurrentUserBioProfile() {
  try {
    const userId = await getUserId();

    // Get bio profile
    const { data: bioProfile, error: bioError } = await supabase
      .from("bio_profile")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (bioError) throw bioError;

    return { success: true, profile: bioProfile as BioProfile };
  } catch (error) {
    console.error("Get bio profile error:", error);
    return { success: false, error };
  }
}

/**
 * Update the bio profile for the current user
 */
export async function updateBioProfile(updates: BioProfileUpdate) {
  try {
    const userId = await getUserId();

    // Use upsert so it works even if the row doesn't exist yet
    const { error: upsertError } = await supabase
      .from("bio_profile")
      .upsert(
        { user_id: userId, ...updates },
        { onConflict: "user_id" },
      );

    if (upsertError) throw upsertError;

    return { success: true };
  } catch (error) {
    console.error("Update bio profile error:", error);
    return { success: false, error };
  }
}

/**
 * Get bio profile by user ID (for admin purposes)
 */
export async function getBioProfileByUserId(userId: string) {
  try {
    const { data: bioProfile, error } = await supabase
      .from("bio_profile")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    return { success: true, profile: bioProfile as BioProfile };
  } catch (error) {
    console.error("Get bio profile by user ID error:", error);
    return { success: false, error };
  }
}

/**
 * Ensure a bio_profile row exists for the current user.
 *
 * The DB trigger creates one automatically on signup, but users who signed up
 * before the trigger was updated (or if the trigger failed) may be missing it.
 * This acts as a safety net — call it when loading the profile screen.
 */
export async function ensureBioProfile(): Promise<BioProfile | null> {
  try {
    const userId = await getUserId();

    // Try to fetch existing profile first
    const { data: existing, error: fetchError } = await supabase
      .from("bio_profile")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) return existing as BioProfile;

    // No profile exists — create an empty one
    const { data: created, error: insertError } = await supabase
      .from("bio_profile")
      .insert({ user_id: userId })
      .select("*")
      .single();

    if (insertError) {
      console.error("Failed to create bio_profile:", insertError);
      return null;
    }

    return created as BioProfile;
  } catch (error) {
    console.error("ensureBioProfile error:", error);
    return null;
  }
}
