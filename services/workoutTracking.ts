import { supabase } from "@/constants/supabase";
import { getUserId } from "@/services/userCache";

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

// getUserId() imported from userCache (shared, fast, cached)

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
 * Get today's workout sessions with exercises and sets.
 * Uses a single embedded-select query instead of 3 sequential round-trips.
 */
export async function getTodayWorkouts(): Promise<{
  success: boolean;
  data?: WorkoutSession[];
  error?: any;
}> {
  try {
    const userId = await getUserId();
    const today = getTodayLocal();

    // Single query: sessions → exercises → sets via foreign-key joins
    const { data: sessions, error } = await supabase
      .from("workout_sessions")
      .select(`
        *,
        session_exercises (
          *,
          exercise_sets (*)
        )
      `)
      .eq("user_id", userId)
      .eq("workout_date", today)
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!sessions || sessions.length === 0) {
      return { success: true, data: [] };
    }

    // Normalise nested shape to match the WorkoutSession type
    const result: WorkoutSession[] = sessions.map((session: any) => {
      const exercises = (session.session_exercises || [])
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((ex: any) => ({
          ...ex,
          sets: (ex.exercise_sets || []).sort(
            (a: any, b: any) => (a.set_number ?? 0) - (b.set_number ?? 0),
          ),
        }));

      return { ...session, exercises, session_exercises: undefined };
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
    const { data: session, error } = await supabase
      .from("workout_sessions")
      .select(`
        *,
        session_exercises (
          *,
          exercise_sets (*)
        )
      `)
      .eq("id", sessionId)
      .single();

    if (error) throw error;

    const exercises = ((session as any).session_exercises || [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((ex: any) => ({
        ...ex,
        sets: (ex.exercise_sets || []).sort(
          (a: any, b: any) => (a.set_number ?? 0) - (b.set_number ?? 0),
        ),
      }));

    return {
      success: true,
      data: { ...session, exercises, session_exercises: undefined } as any,
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

    // Single query: sessions with nested exercise → set counts
    const { data: sessions, error } = await supabase
      .from("workout_sessions")
      .select(`
        *,
        session_exercises (
          id,
          exercise_sets ( id )
        )
      `)
      .eq("user_id", userId)
      .order("workout_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!sessions || sessions.length === 0) {
      return { success: true, data: [] };
    }

    const result: WorkoutHistoryItem[] = sessions.map((session: any) => {
      const exercises = session.session_exercises || [];
      const totalSets = exercises.reduce(
        (sum: number, ex: any) => sum + (ex.exercise_sets?.length || 0),
        0,
      );

      return {
        id: session.id,
        name: session.name,
        workout_date: session.workout_date,
        duration_seconds: session.duration_seconds,
        created_at: session.created_at,
        exercise_count: exercises.length,
        total_sets: totalSets,
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

    // Single query: join through workout_sessions via embedded select
    const { data: sessions, error } = await supabase
      .from("workout_sessions")
      .select("session_exercises ( exercise_name )")
      .eq("user_id", userId);

    if (error) throw error;

    const names = (sessions || []).flatMap(
      (s: any) => (s.session_exercises || []).map((e: any) => e.exercise_name),
    );
    const unique = [...new Set(names)];
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

    // Single query: sessions with nested exercise → set IDs
    const { data: sessions, error } = await supabase
      .from("workout_sessions")
      .select(`
        id,
        duration_seconds,
        session_exercises (
          id,
          exercise_sets ( id )
        )
      `)
      .eq("user_id", userId)
      .gte("workout_date", weekStart);

    if (error) throw error;

    const workoutCount = (sessions || []).length;
    const totalDuration = (sessions || []).reduce(
      (sum: number, s: any) => sum + (s.duration_seconds || 0),
      0,
    );
    const totalSets = (sessions || []).reduce(
      (sum: number, s: any) =>
        sum +
        (s.session_exercises || []).reduce(
          (eSum: number, ex: any) => eSum + (ex.exercise_sets?.length || 0),
          0,
        ),
      0,
    );

    return { success: true, workoutCount, totalSets, totalDuration };
  } catch (error) {
    console.error("Error fetching weekly stats:", error);
    return { success: false, error };
  }
}
