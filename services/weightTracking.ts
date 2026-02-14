import { supabase } from "@/constants/supabase";

export type WeightEntry = {
  id: string;
  user_id: string;
  weight: number;
  weight_unit: string;
  recorded_date: string;
  notes: string | null;
  created_at: string;
};

/**
 * Check if user has logged weight today
 */
export async function hasLoggedWeightToday(): Promise<boolean> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return false;
    }

    // Get user_id from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();
    
    if (userError || !userData) {
      return false;
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { data, error } = await supabase
      .from("body_weight")
      .select("id")
      .eq("user_id", userData.id)
      .eq("recorded_date", today);

    // If no data returned, user hasn't logged weight today
    if (!data || data.length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking weight log:", error);
    return false;
  }
}

/**
 * Log today's weight
 */
export async function logWeight(
  weight: number,
  weightUnit: "lbs" | "kg",
  notes?: string
) {
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

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Insert or update today's weight
    const { error: insertError } = await supabase
      .from("body_weight")
      .upsert(
        {
          user_id: userData.id,
          weight,
          weight_unit: weightUnit,
          recorded_date: today,
          notes: notes || null,
        },
        {
          onConflict: "user_id,recorded_date",
        }
      );

    if (insertError) throw insertError;

    return { success: true };
  } catch (error) {
    console.error("Error logging weight:", error);
    return { success: false, error };
  }
}

/**
 * Get weight history for current user
 */
export async function getWeightHistory(limit: number = 30) {
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

    const { data, error } = await supabase
      .from("body_weight")
      .select("*")
      .eq("user_id", userData.id)
      .order("recorded_date", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: data as WeightEntry[] };
  } catch (error) {
    console.error("Error fetching weight history:", error);
    return { success: false, error };
  }
}

/**
 * Get latest weight entry
 */
export async function getLatestWeight() {
  try {
    const result = await getWeightHistory(1);
    if (result.success && result.data && result.data.length > 0) {
      return { success: true, data: result.data[0] };
    }
    return { success: false, data: null };
  } catch (error) {
    console.error("Error fetching latest weight:", error);
    return { success: false, error };
  }
}
