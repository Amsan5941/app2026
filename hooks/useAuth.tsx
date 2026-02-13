import { supabase } from "@/constants/supabase";
import React, { createContext, useContext, useEffect, useState } from "react";

type User = any;

type AuthContextValue = {
  user: User | null;
  session: any | null;
  signUp: (email: string, password: string) => Promise<any>;
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

  async function signUp(email: string, password: string) {
    return await supabase.auth.signUp({ email, password });
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
