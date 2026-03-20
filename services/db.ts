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
/** In-flight promises — prevents duplicate fetches when multiple callers miss simultaneously. */
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 10_000; // 10 seconds — short enough to stay fresh

/**
 * Return a cached value if it exists and hasn't expired, otherwise run the
 * fetcher, cache the result, and return it.
 *
 * Concurrent callers that miss the cache at the same time share one in-flight
 * request rather than each firing their own (cache stampede prevention).
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

  // If another caller is already fetching, wait for it instead of firing again
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) {
    log.info("Cache", `INFLIGHT ${key}`);
    return pending;
  }

  log.info("Cache", `MISS ${key}`);
  const promise = fetcher().then((data) => {
    cache.set(key, { data, expiry: Date.now() + ttlMs });
    inflight.delete(key);
    return data;
  }).catch((err) => {
    inflight.delete(key); // never cache failures
    throw err;
  });

  inflight.set(key, promise as Promise<unknown>);
  return promise;
}

/**
 * Clear the entire cache. Call on sign-out and auth state transitions.
 */
export function clearQueryCache(): void {
  cache.clear();
  inflight.clear();
  log.info("Cache", "cleared");
}

/**
 * Remove a specific cache entry (e.g., after a mutation).
 */
export function invalidateQuery(key: string): void {
  cache.delete(key);
  inflight.delete(key);
}
