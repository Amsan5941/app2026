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

    return { success: true, user, profile };
  } catch (error) {
    console.error("Get current user error:", error);
    return { success: false, error };
  }
}

export async function updateUserProfile(
  firstname: string,
  lastname: string
) {
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
