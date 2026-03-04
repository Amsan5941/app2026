/**
 * services/db.ts — Thin in-memory TTL cache for Supabase reads.
 *
 * Keyed by `userId + queryKey`. Prevents identical queries from running
 * multiple times across tabs that focus within a short window.
 *
 * Usage:
 *   const data = await cachedQuery("bioProfile", () => getCurrentUserBioProfile());
 *
 * Cache is automatically cleared on sign-out via `clearQueryCache()`.
 */

import { log } from "@/utils/log";

type CacheEntry<T> = {
  data: T;
  expiry: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 10_000; // 10 seconds — short enough to stay fresh

/**
 * Return a cached value if it exists and hasn't expired, otherwise run the
 * fetcher, cache the result, and return it.
 *
 * Rejected promises are NEVER cached.
 */
export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiry) {
    log.info("Cache", `HIT ${key}`);
    return entry.data;
  }

  log.info("Cache", `MISS ${key}`);
  const data = await fetcher(); // let errors propagate — never cache failures
  cache.set(key, { data, expiry: Date.now() + ttlMs });
  return data;
}

/**
 * Clear the entire cache. Call on sign-out and auth state transitions.
 */
export function clearQueryCache(): void {
  cache.clear();
  log.info("Cache", "cleared");
}

/**
 * Remove a specific cache entry (e.g., after a mutation).
 */
export function invalidateQuery(key: string): void {
  cache.delete(key);
}
