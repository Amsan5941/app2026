import { supabase } from "@/constants/supabase";
import { clearQueryCache } from "@/services/db";
import { clearCachedUserId, resolveAndCacheUserId } from "@/services/userCache";
import { log } from "@/utils/log";
import type { AuthError, AuthSession, AuthUser } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";

/** Result returned by signUp / signIn. */
type AuthResult = {
  data: { user: AuthUser | null; session: AuthSession | null } | null;
  error: AuthError | { message: string } | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  /** True once the initial session check has completed (even if no user). */
  authReady: boolean;
  /** Cached internal user ID from the `users` table (null until resolved) */
  internalUserId: string | null;
  signUp: (
    email: string,
    password: string,
    firstname: string,
    lastname: string,
  ) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [internalUserId, setInternalUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    log.time("auth:hydration");

    async function init() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(currentSession);
        const authUser = currentSession?.user ?? null;
        setUser(authUser);
        if (authUser?.id) {
          try {
            const id = await resolveAndCacheUserId(authUser.id);
            if (mounted) setInternalUserId(id);
          } catch (e) {
            log.warn(
              "Auth",
              "Failed to resolve internal user ID during init: " + String(e),
            );
          }
        }
      } catch (e) {
        log.error("Auth", "getSession failed: " + String(e));
      } finally {
        if (mounted) {
          setAuthReady(true);
          log.timeEnd("auth:hydration");
        }
      }
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        log.info("Auth", `onAuthStateChange: ${_event}`);
        setSession(newSession);
        const authUser = newSession?.user ?? null;
        setUser(authUser);
        if (authUser?.id) {
          try {
            const id = await resolveAndCacheUserId(authUser.id);
            setInternalUserId(id);
          } catch (e) {
            log.warn(
              "Auth",
              "Failed to resolve internal user ID: " + String(e),
            );
          }
        } else {
          clearCachedUserId();
          setInternalUserId(null);
        }
      },
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  async function signUp(
    email: string,
    password: string,
    firstname: string,
    lastname: string,
  ): Promise<AuthResult> {
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
      return {
        data: null,
        error:
          error instanceof Error
            ? { message: error.message }
            : { message: String(error) },
      };
    }
  }

  async function signIn(email: string, password: string): Promise<AuthResult> {
    return await supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    clearCachedUserId();
    clearQueryCache();
    setInternalUserId(null);
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        authReady,
        internalUserId,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
