import { supabase } from "@/constants/supabase";

// ── Types ──────────────────────────────────────────────────────

export type ExerciseSet = {
  id?: string;
  exercise_id?: string;
  set_number: number;
  reps: number;
  weight: number | null;
  weight_unit: string;
  completed: boolean;
};

export type SessionExercise = {
  id?: string;
  session_id?: string;
  exercise_name: string;
  sort_order: number;
  sets: ExerciseSet[];
};

export type WorkoutSession = {
  id?: string;
  user_id?: string;
  name: string;
  notes?: string;
  duration_seconds?: number;
  workout_date: string; // YYYY-MM-DD
  created_at?: string;
  exercises?: SessionExercise[];
};

export type WorkoutHistoryItem = {
  id: string;
  name: string;
  workout_date: string;
  duration_seconds: number | null;
  created_at: string;
  exercise_count: number;
  total_sets: number;
};

// ── Helpers ────────────────────────────────────────────────────

function getTodayLocal(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Get the internal user_id (from users table) for the current auth user
 */
async function getUserId(): Promise<string> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Not authenticated");

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (userError || !userData) throw new Error("User profile not found");

  return userData.id;
}

// ── CRUD Operations ────────────────────────────────────────────

/**
 * Create a new workout session and return its ID
 */
export async function createWorkoutSession(
  name: string,
  notes?: string,
): Promise<{ success: boolean; sessionId?: string; error?: any }> {
  try {
    const userId = await getUserId();
    const today = getTodayLocal();

    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: userId,
        name,
        notes: notes || null,
        workout_date: today,
      })
      .select("id")
      .single();

    if (error) throw error;

    // Increment the user's workout counter on their bio_profile (best-effort)
    try {
      const { data: profileData, error: profErr } = await supabase
        .from("bio_profile")
        .select("id, workout_counter")
        .eq("user_id", userId)
        .single();

      if (!profErr && profileData) {
        const current = (profileData as any).workout_counter ?? 0;
        const newVal = Number(current) + 1;
        await supabase
          .from("bio_profile")
          .update({ workout_counter: newVal })
          .eq("id", (profileData as any).id);
      }
    } catch (e) {
      // non-fatal — log and continue
      console.warn("Failed to increment workout_counter:", e);
    }

    return { success: true, sessionId: data.id };
  } catch (error) {
    console.error("Error creating workout session:", error);
    return { success: false, error };
  }
}

/**
 * Add an exercise to a workout session
 */
export async function addExerciseToSession(
  sessionId: string,
  exerciseName: string,
  sortOrder: number,
): Promise<{ success: boolean; exerciseId?: string; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("session_exercises")
      .insert({
        session_id: sessionId,
        exercise_name: exerciseName,
        sort_order: sortOrder,
      })
      .select("id")
      .single();

    if (error) throw error;

    return { success: true, exerciseId: data.id };
  } catch (error) {
    console.error("Error adding exercise:", error);
    return { success: false, error };
  }
}

/**
 * Add a set to an exercise
 */
export async function addSetToExercise(
  exerciseId: string,
  setNumber: number,
  reps: number,
  weight: number | null,
  weightUnit: string = "lbs",
): Promise<{ success: boolean; setId?: string; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("exercise_sets")
      .insert({
        exercise_id: exerciseId,
        set_number: setNumber,
        reps,
        weight,
        weight_unit: weightUnit,
        completed: true,
      })
      .select("id")
      .single();

    if (error) throw error;

    return { success: true, setId: data.id };
  } catch (error) {
    console.error("Error adding set:", error);
    return { success: false, error };
  }
}

/**
 * Update a specific set
 */
export async function updateSet(
  setId: string,
  reps: number,
  weight: number | null,
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("exercise_sets")
      .update({ reps, weight })
      .eq("id", setId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error updating set:", error);
    return { success: false, error };
  }
}

/**
 * Update set number for a set
 */
export async function updateSetNumber(
  setId: string,
  setNumber: number,
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("exercise_sets")
      .update({ set_number: setNumber })
      .eq("id", setId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error updating set number:", error);
    return { success: false, error };
  }
}

/**
 * Delete a set
 */
export async function deleteSet(
  setId: string,
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("exercise_sets")
      .delete()
      .eq("id", setId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error deleting set:", error);
    return { success: false, error };
  }
}

/**
 * Delete an exercise and all its sets (cascade)
 */
export async function deleteExercise(
  exerciseId: string,
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("session_exercises")
      .delete()
      .eq("id", exerciseId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error deleting exercise:", error);
    return { success: false, error };
  }
}

/**
 * Delete a workout session and all its exercises/sets (cascade)
 */
export async function deleteWorkoutSession(
  sessionId: string,
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("workout_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error deleting workout session:", error);
    return { success: false, error };
  }
}

/**
 * Update workout session name or notes
 */
export async function updateWorkoutSession(
  sessionId: string,
  updates: { name?: string; notes?: string; duration_seconds?: number },
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("workout_sessions")
      .update(updates)
      .eq("id", sessionId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error updating workout session:", error);
    return { success: false, error };
  }
}

// ── Query Operations ───────────────────────────────────────────

/**
 * Get today's workout sessions with exercises and sets
 */
export async function getTodayWorkouts(): Promise<{
  success: boolean;
  data?: WorkoutSession[];
  error?: any;
}> {
  try {
    const userId = await getUserId();
    const today = getTodayLocal();

    const { data: sessions, error: sessError } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("workout_date", today)
      .order("created_at", { ascending: true });

    if (sessError) throw sessError;
    if (!sessions || sessions.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch exercises for all sessions
    const sessionIds = sessions.map((s) => s.id);
    const { data: exercises, error: exError } = await supabase
      .from("session_exercises")
      .select("*")
      .in("session_id", sessionIds)
      .order("sort_order", { ascending: true });

    if (exError) throw exError;

    // Fetch sets for all exercises
    const exerciseIds = (exercises || []).map((e) => e.id);
    let sets: any[] = [];
    if (exerciseIds.length > 0) {
      const { data: setsData, error: setsError } = await supabase
        .from("exercise_sets")
        .select("*")
        .in("exercise_id", exerciseIds)
        .order("set_number", { ascending: true });

      if (setsError) throw setsError;
      sets = setsData || [];
    }

    // Assemble the nested structure
    const result: WorkoutSession[] = sessions.map((session) => {
      const sessionExercises = (exercises || [])
        .filter((e) => e.session_id === session.id)
        .map((ex) => ({
          ...ex,
          sets: sets.filter((s) => s.exercise_id === ex.id),
        }));

      return {
        ...session,
        exercises: sessionExercises,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching today's workouts:", error);
    return { success: false, error };
  }
}

/**
 * Get a single workout session with full details
 */
export async function getWorkoutSession(
  sessionId: string,
): Promise<{ success: boolean; data?: WorkoutSession; error?: any }> {
  try {
    const { data: session, error: sessError } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessError) throw sessError;

    const { data: exercises, error: exError } = await supabase
      .from("session_exercises")
      .select("*")
      .eq("session_id", sessionId)
      .order("sort_order", { ascending: true });

    if (exError) throw exError;

    const exerciseIds = (exercises || []).map((e) => e.id);
    let sets: any[] = [];
    if (exerciseIds.length > 0) {
      const { data: setsData, error: setsError } = await supabase
        .from("exercise_sets")
        .select("*")
        .in("exercise_id", exerciseIds)
        .order("set_number", { ascending: true });

      if (setsError) throw setsError;
      sets = setsData || [];
    }

    const sessionExercises = (exercises || []).map((ex) => ({
      ...ex,
      sets: sets.filter((s) => s.exercise_id === ex.id),
    }));

    return {
      success: true,
      data: { ...session, exercises: sessionExercises },
    };
  } catch (error) {
    console.error("Error fetching workout session:", error);
    return { success: false, error };
  }
}

/**
 * Get workout history (list of past sessions) for the current user
 */
export async function getWorkoutHistory(
  limit: number = 30,
): Promise<{ success: boolean; data?: WorkoutHistoryItem[]; error?: any }> {
  try {
    const userId = await getUserId();

    const { data: sessions, error: sessError } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("workout_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (sessError) throw sessError;
    if (!sessions || sessions.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch exercise counts
    const sessionIds = sessions.map((s) => s.id);
    const { data: exercises, error: exError } = await supabase
      .from("session_exercises")
      .select("id, session_id")
      .in("session_id", sessionIds);

    if (exError) throw exError;

    // Fetch set counts
    const exerciseIds = (exercises || []).map((e) => e.id);
    let sets: any[] = [];
    if (exerciseIds.length > 0) {
      const { data: setsData, error: setsError } = await supabase
        .from("exercise_sets")
        .select("id, exercise_id")
        .in("exercise_id", exerciseIds);

      if (setsError) throw setsError;
      sets = setsData || [];
    }

    const result: WorkoutHistoryItem[] = sessions.map((session) => {
      const sessionExercises = (exercises || []).filter(
        (e) => e.session_id === session.id,
      );
      const sessionExerciseIds = sessionExercises.map((e) => e.id);
      const sessionSets = sets.filter((s) =>
        sessionExerciseIds.includes(s.exercise_id),
      );

      return {
        id: session.id,
        name: session.name,
        workout_date: session.workout_date,
        duration_seconds: session.duration_seconds,
        created_at: session.created_at,
        exercise_count: sessionExercises.length,
        total_sets: sessionSets.length,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching workout history:", error);
    return { success: false, error };
  }
}

/**
 * Get unique workout names for the current user (for autocomplete/history)
 */
export async function getWorkoutNames(): Promise<{
  success: boolean;
  data?: string[];
  error?: any;
}> {
  try {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from("workout_sessions")
      .select("name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Deduplicate
    const unique = [...new Set((data || []).map((d) => d.name))];
    return { success: true, data: unique };
  } catch (error) {
    console.error("Error fetching workout names:", error);
    return { success: false, error };
  }
}

/**
 * Get unique exercise names for the current user (for autocomplete)
 */
export async function getExerciseNames(): Promise<{
  success: boolean;
  data?: string[];
  error?: any;
}> {
  try {
    const userId = await getUserId();

    // Need to join through workout_sessions to filter by user
    const { data: sessions, error: sessError } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", userId);

    if (sessError) throw sessError;
    if (!sessions || sessions.length === 0) {
      return { success: true, data: [] };
    }

    const sessionIds = sessions.map((s) => s.id);
    const { data, error } = await supabase
      .from("session_exercises")
      .select("exercise_name")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const unique = [...new Set((data || []).map((d) => d.exercise_name))];
    return { success: true, data: unique };
  } catch (error) {
    console.error("Error fetching exercise names:", error);
    return { success: false, error };
  }
}

/**
 * Get weekly workout stats
 */
export async function getWeeklyWorkoutStats(): Promise<{
  success: boolean;
  workoutCount?: number;
  totalSets?: number;
  totalDuration?: number;
  error?: any;
}> {
  try {
    const userId = await getUserId();

    // Get start of week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;

    const { data: sessions, error: sessError } = await supabase
      .from("workout_sessions")
      .select("id, duration_seconds")
      .eq("user_id", userId)
      .gte("workout_date", weekStart);

    if (sessError) throw sessError;

    const workoutCount = (sessions || []).length;
    const totalDuration = (sessions || []).reduce(
      (sum, s) => sum + (s.duration_seconds || 0),
      0,
    );

    // Count total sets
    let totalSets = 0;
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.id);
      const { data: exercises } = await supabase
        .from("session_exercises")
        .select("id")
        .in("session_id", sessionIds);

      if (exercises && exercises.length > 0) {
        const exerciseIds = exercises.map((e) => e.id);
        const { count } = await supabase
          .from("exercise_sets")
          .select("id", { count: "exact", head: true })
          .in("exercise_id", exerciseIds);

        totalSets = count || 0;
      }
    }

    return { success: true, workoutCount, totalSets, totalDuration };
  } catch (error) {
    console.error("Error fetching weekly stats:", error);
    return { success: false, error };
  }
}
