/**
 * Lightweight instrumentation logger.
 *
 * Toggle via the `__DEV__` global (true in Expo dev builds, false in production).
 * All output goes to console.warn so it shows in LogBox / Metro without noise.
 *
 * Usage:
 *   import { log } from "@/utils/log";
 *   log.info("HomeScreen", "loadAllData took 320 ms");
 *   log.warn("Auth", "session was null during fetch");
 *   log.error("WorkoutScreen", err);
 *   log.time("explore:loadData");          // starts a timer
 *   log.timeEnd("explore:loadData");       // logs elapsed ms
 */

const ENABLED =
  typeof __DEV__ !== "undefined"
    ? __DEV__
    : process.env.NODE_ENV !== "production";

const timers = new Map<string, number>();

function fmt(tag: string, msg: string) {
  return `[ForgeFit][${tag}] ${msg}`;
}

export const log = {
  info(tag: string, msg: string, ...args: unknown[]) {
    if (!ENABLED) return;
    console.log(fmt(tag, msg), ...args);
  },

  warn(tag: string, msg: string, ...args: unknown[]) {
    if (!ENABLED) return;
    console.warn(fmt(tag, msg), ...args);
  },

  error(tag: string, msg: string | Error, ...args: unknown[]) {
    // Always log errors, even in production
    const message = msg instanceof Error ? msg.message : msg;
    console.error(fmt(tag, message), ...args);
  },

  /** Start a named timer. */
  time(label: string) {
    if (!ENABLED) return;
    timers.set(label, Date.now());
  },

  /** End a named timer and log elapsed ms. Returns elapsed ms or -1. */
  timeEnd(label: string): number {
    if (!ENABLED) return -1;
    const start = timers.get(label);
    if (start == null) return -1;
    timers.delete(label);
    const elapsed = Date.now() - start;
    console.log(fmt("Timer", `${label} — ${elapsed} ms`));
    return elapsed;
  },
};
