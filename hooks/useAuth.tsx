import { supabase } from "@/constants/supabase";
import React, { createContext, useContext, useEffect, useState } from "react";

type User = any;

type BioData = {
  age: number;
  weight: number;
  goal_weight?: number | null;
  height: number;
  sex: string;
  goal: string;
  activity_level?: string;
  workout_style?: string;
  workouts_per_week?: number | null;
  calorie_goal?: number | null;
};

type AuthContextValue = {
  user: User | null;
  session: any | null;
  signUp: (
    email: string,
    password: string,
    firstname: string,
    lastname: string,
    bioData: BioData,
  ) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(currentSession);
        setUser((currentSession as any)?.user ?? null);
      } catch (e) {
        // ignore
      }
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser((newSession as any)?.user ?? null);
      },
    );

    return () => {
      mounted = false;
      try {
        (listener as any)?.subscription?.unsubscribe();
      } catch (e) {}
    };
  }, []);

  async function signUp(
    email: string,
    password: string,
    firstname: string,
    lastname: string,
    bioData: BioData,
  ) {
    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
        },
      });

      console.log("Auth signup response:", { authData, authError });

      if (authError) {
        console.error("Auth error:", authError);
        return { data: authData, error: authError };
      }

      const authUserId = authData.user?.id;

      if (!authUserId) {
        console.error("No user ID in auth data:", authData);
        return {
          data: authData,
          error: {
            message:
              "No user ID returned from signup. User may need email confirmation.",
          },
        };
      }

      console.log("Created auth user with ID:", authUserId);

      // Step 2: Wait a bit for trigger to create users entry, then update it
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update the users table entry (created by trigger) with actual names
      const { data: updateResult, error: updateError } = await supabase
        .from("users")
        .update({
          firstname,
          lastname,
        })
        .eq("auth_id", authUserId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating user profile:", updateError);
        // If update fails, try inserting (fallback)
        const { data: userData, error: insertError } = await supabase
          .from("users")
          .insert([
            {
              auth_id: authUserId,
              firstname,
              lastname,
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting user profile:", insertError);
          return { data: authData, error: insertError };
        }

        // Use the newly inserted user
        const userId = userData.id;

        // Step 3: Create bio_profile
        const { error: bioError } = await supabase.from("bio_profile").insert([
          {
            user_id: userId,
            age: bioData.age,
            weight: bioData.weight,
            goal_weight: (bioData as any).goal_weight ?? null,
            weight_unit: "lbs",
            height: bioData.height,
            height_unit: "inches",
            sex: bioData.sex,
            goal: bioData.goal,
            activity_level: (bioData as any).activity_level ?? null,
            workout_style: (bioData as any).workout_style ?? null,
            workouts_per_week: (bioData as any).workouts_per_week ?? null,
            calorie_goal: (bioData as any).calorie_goal ?? null,
          },
        ]);

        if (bioError) {
          console.error("Error creating bio profile:", bioError);
          return { data: authData, error: bioError };
        }

        // Debug: read back the inserted bio_profile and log it
        try {
          const { data: insertedProfile, error: fetchErr } = await supabase
            .from("bio_profile")
            .select("*")
            .eq("user_id", userId)
            .single();
          if (fetchErr)
            console.warn("Could not fetch bio_profile after insert:", fetchErr);
          else
            console.log(
              "Inserted bio_profile (fallback path):",
              insertedProfile,
            );
        } catch (e) {
          console.warn("Error fetching bio_profile after insert:", e);
        }

        return { data: authData, error: null };
      }

      // Update succeeded, use that user data
      const userId = updateResult.id;

      // Step 3: Create bio_profile
      const { error: bioError } = await supabase.from("bio_profile").insert([
        {
          user_id: userId,
          age: bioData.age,
          weight: bioData.weight,
          goal_weight: (bioData as any).goal_weight ?? null,
          weight_unit: "lbs",
          height: bioData.height,
          height_unit: "inches",
          sex: bioData.sex,
          goal: bioData.goal,
          activity_level: (bioData as any).activity_level ?? null,
          workout_style: (bioData as any).workout_style ?? null,
          workouts_per_week: (bioData as any).workouts_per_week ?? null,
          calorie_goal: (bioData as any).calorie_goal ?? null,
        },
      ]);

      if (bioError) {
        console.error("Error creating bio profile:", bioError);
        return { data: authData, error: bioError };
      }

      // Debug: read back the inserted bio_profile and log it
      try {
        const { data: insertedProfile, error: fetchErr } = await supabase
          .from("bio_profile")
          .select("*")
          .eq("user_id", userId)
          .single();
        if (fetchErr)
          console.warn("Could not fetch bio_profile after insert:", fetchErr);
        else
          console.log("Inserted bio_profile (primary path):", insertedProfile);
      } catch (e) {
        console.warn("Error fetching bio_profile after insert:", e);
      }

      return { data: authData, error: null };
    } catch (error) {
      console.error("Signup error:", error);
      return { data: null, error };
    }
  }

  async function signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
