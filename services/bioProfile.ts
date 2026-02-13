import { supabase } from "@/constants/supabase";

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

/**
 * Get the bio profile for the current user
 */
export async function getCurrentUserBioProfile() {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("No user logged in");

    // Get user_id from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (userError) throw userError;

    // Get bio profile
    const { data: bioProfile, error: bioError } = await supabase
      .from("bio_profile")
      .select("*")
      .eq("user_id", userData.id)
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("No user logged in");

    // Get user_id from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (userError) throw userError;

    // Update bio profile
    const { error: updateError } = await supabase
      .from("bio_profile")
      .update(updates)
      .eq("user_id", userData.id);

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
