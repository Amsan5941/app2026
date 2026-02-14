import { supabase } from "@/constants/supabase";

// NOTE: signUp, login, and logout are handled by hooks/useAuth.tsx
// This file contains additional utility functions for user profile management

export async function getCurrentUserProfile() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;

    if (!user) return { success: false, user: null, profile: null };

    // Fetch their profile from users table
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    if (profileError) throw profileError;

    // Fetch bio_profile (fitness data) if present
    let bioProfile = null;
    const { data: bioData, error: bioError } = await supabase
      .from("bio_profile")
      .select("*")
      .eq("user_id", profile.id)
      .single();

    if (!bioError) bioProfile = bioData;

    return { success: true, user, profile, bioProfile };
  } catch (error) {
    console.error("Get current user error:", error);
    return { success: false, error };
  }
}

export async function updateUserProfile(firstname: string, lastname: string) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) throw new Error("No user logged in");

    const { error } = await supabase
      .from("users")
      .update({ firstname, lastname })
      .eq("auth_id", user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Update profile error:", error);
    return { success: false, error };
  }
}

export async function changeUserPassword(newPassword: string) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Change password error:", error);
    return { success: false, error };
  }
}

export async function updateBioProfile(updates: {
  age?: number;
  weight?: number;
  height?: number;
  sex?: string;
  goal?: string;
}) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) return { success: false, error: new Error("No user logged in") };

    // find users entry to get user id
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (profileError) throw profileError;

    const { error } = await supabase
      .from("bio_profile")
      .update(updates)
      .eq("user_id", profile.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Update bio profile error:", error);
    return { success: false, error };
  }
}
