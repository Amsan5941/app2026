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

    // Update bio profile
    const { error: updateError } = await supabase
      .from("bio_profile")
      .update(updates)
      .eq("user_id", userId);

    if (updateError) throw updateError;

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
