import { supabase } from "@/constants/supabase";
import {
  clearCachedUserId,
  resolveAndCacheUserId,
} from "@/services/userCache";
import React, { createContext, useContext, useEffect, useState } from "react";

type User = any;

type AuthContextValue = {
  user: User | null;
  session: any | null;
  /** Cached internal user ID from the `users` table (null until resolved) */
  internalUserId: string | null;
  signUp: (
    email: string,
    password: string,
    firstname: string,
    lastname: string,
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
  const [internalUserId, setInternalUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(currentSession);
        const authUser = (currentSession as any)?.user ?? null;
        setUser(authUser);
        if (authUser?.id) {
          try {
            const id = await resolveAndCacheUserId(authUser.id);
            if (mounted) setInternalUserId(id);
          } catch (e) {
            console.warn("Failed to resolve internal user ID:", e);
          }
        }
      } catch (e) {
        // ignore
      }
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        const authUser = (newSession as any)?.user ?? null;
        setUser(authUser);
        if (authUser?.id) {
          try {
            const id = await resolveAndCacheUserId(authUser.id);
            setInternalUserId(id);
          } catch (e) {
            console.warn("Failed to resolve internal user ID:", e);
          }
        } else {
          clearCachedUserId();
          setInternalUserId(null);
        }
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
  ) {
    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: undefined },
      });

      if (authError) return { data: authData, error: authError };

      const authUserId = authData.user?.id;
      if (!authUserId) {
        return {
          data: authData,
          error: { message: "No user ID returned from signup." },
        };
      }

      // Step 2: Upsert the users row.
      // This is safe regardless of whether a DB trigger has already created the
      // row — upsert will update if the row exists or insert if it doesn't,
      // eliminating the old 1-second setTimeout race condition.
      const { error: upsertError } = await supabase
        .from("users")
        .upsert(
          { auth_id: authUserId, firstname, lastname },
          { onConflict: "auth_id" },
        );

      if (upsertError) {
        // Non-fatal: the auth user was created. They can still log in and
        // their name can be set later via the profile screen.
        console.warn("Could not upsert user profile row:", upsertError.message);
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
    clearCachedUserId();
    setInternalUserId(null);
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, internalUserId, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
