import { supabase } from "@/constants/supabase";

/**
 * Module-level cache for the internal user ID (from the `users` table).
 *
 * The AuthContext resolves this once after login / session restore so that
 * every service can call `getCachedUserId()` instead of doing two DB
 * round-trips (auth.getUser → users table) on every single operation.
 */

let cachedInternalUserId: string | null = null;

/**
 * Resolve the internal user ID from the `users` table for the given auth_id
 * and store it in the module-level cache. Returns the internal ID.
 */
export async function resolveAndCacheUserId(authId: string): Promise<string> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authId)
    .single();

  if (error || !data) {
    throw new Error("Could not resolve internal user ID");
  }

  cachedInternalUserId = data.id;
  return data.id;
}

/**
 * Return the cached internal user ID.
 * Returns `null` if no user is logged in or the cache hasn't been populated yet.
 */
export function getCachedUserId(): string | null {
  return cachedInternalUserId;
}

/**
 * Clear the cache (call on sign-out).
 */
export function clearCachedUserId(): void {
  cachedInternalUserId = null;
}
