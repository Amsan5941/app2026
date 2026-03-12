/**
 * Startup Crash Prevention Tests
 *
 * Verifies that the fixes for Apple Review Guideline 2.1(a) crash-on-launch
 * are in place. The crashes occurred on iPad Air 11-inch (M3), iPadOS 26.3,
 * caused by unguarded native TurboModule calls at module-load time.
 *
 * These tests validate:
 * 1. Sentry init is wrapped in try-catch (won't crash if native module throws)
 * 2. PostHog init failure doesn't propagate
 * 3. Notification init is fully defensive
 * 4. iPad tablet support is enabled in app.json
 * 5. No native module calls happen at module-load time in _layout
 * 6. react-native-reanimated is NOT imported as a bare side-effect
 * 7. expo-constants is lazily loaded in supabase.ts
 * 8. expo-haptics calls are guarded with try-catch
 * 9. Sentry / PostHog use lazy require() instead of top-level import
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

// ─── 1. app.json: supportsTablet must be true ──────────────────────────────
describe("app.json iPad support", () => {
  const raw = fs.readFileSync(path.join(ROOT, "app.json"), "utf-8");
  const config = JSON.parse(raw);

  it("has supportsTablet set to true", () => {
    expect(config.expo.ios.supportsTablet).toBe(true);
  });

  it("has a valid bundleIdentifier", () => {
    expect(config.expo.ios.bundleIdentifier).toBeTruthy();
  });
});

// ─── 2. Sentry service: lazy require + init is wrapped in try-catch ────────
describe("Sentry service safety", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "services", "sentry.ts"),
    "utf-8",
  );

  it("does NOT have a top-level import of @sentry/react-native", () => {
    // A top-level import triggers TurboModule registration at module-load time
    expect(src).not.toMatch(
      /^import\s.*from\s+["']@sentry\/react-native["']/m,
    );
  });

  it("uses lazy require() for @sentry/react-native", () => {
    expect(src).toMatch(/require\(["']@sentry\/react-native["']\)/);
  });

  it("wraps Sentry.init() in a try-catch block", () => {
    const initFnMatch = src.match(
      /export function initSentry\(\)[\s\S]*?^}/m,
    );
    expect(initFnMatch).toBeTruthy();
    const initBody = initFnMatch![0];
    expect(initBody).toMatch(/try\s*\{/);
    expect(initBody).toMatch(/catch/);
    expect(initBody).toContain("Sentry.init");
  });

  it("does not call Sentry.init at module level", () => {
    const lines = src.split("\n");
    const moduleLevel = lines.filter(
      (line) =>
        line.match(/Sentry\.init\(/) &&
        !line.trim().startsWith("//") &&
        !line.trim().startsWith("*"),
    );
    // Should appear exactly once (inside the function)
    expect(moduleLevel.length).toBe(1);
  });
});

// ─── 3. Root layout: no module-level native calls ──────────────────────────
describe("Root layout startup safety", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "app", "_layout.tsx"),
    "utf-8",
  );

  it("does NOT have a bare side-effect import of react-native-reanimated", () => {
    // A bare `import "react-native-reanimated"` triggers TurboModule setup
    // at module-evaluation time.  It should be a guarded require() instead.
    expect(src).not.toMatch(
      /^import\s+["']react-native-reanimated["']\s*;/m,
    );
  });

  it("uses a guarded require() for react-native-reanimated", () => {
    expect(src).toMatch(/require\(["']react-native-reanimated["']\)/);
    // The require must be inside a try block
    const reqIdx = src.indexOf('require("react-native-reanimated")');
    const precedingChunk = src.slice(Math.max(0, reqIdx - 200), reqIdx);
    expect(precedingChunk).toMatch(/try\s*\{/);
  });

  it("wraps ErrorUtils.setGlobalHandler in a try-catch", () => {
    // Find the ErrorUtils block and verify it's inside a try-catch
    const euIdx = src.indexOf("ErrorUtils.setGlobalHandler");
    expect(euIdx).toBeGreaterThan(-1);
    const precedingChunk = src.slice(Math.max(0, euIdx - 300), euIdx);
    expect(precedingChunk).toMatch(/try\s*\{/);
  });

  it("does NOT call initSentry() at module level", () => {
    const lines = src.split("\n");
    const moduleScope: string[] = [];
    let insideFunction = false;
    let braceDepth = 0;

    for (const line of lines) {
      if (
        line.match(
          /^(export )?(default )?(function |const |class |async function )/,
        )
      ) {
        insideFunction = true;
      }
      if (insideFunction) {
        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;
        if (braceDepth <= 0) {
          insideFunction = false;
          braceDepth = 0;
        }
      }
      if (!insideFunction) {
        moduleScope.push(line);
      }
    }

    const moduleScopeCode = moduleScope.join("\n");
    expect(moduleScopeCode).not.toMatch(/initSentry\(\)/);
    expect(moduleScopeCode).not.toMatch(/initPostHog\(\)/);
  });

  it("has a global error handler (ErrorUtils)", () => {
    expect(src).toContain("ErrorUtils.setGlobalHandler");
  });
});

// ─── 4. Notification service: defensive init ───────────────────────────────
describe("Notification service safety", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "services", "notifications.native.ts"),
    "utf-8",
  );

  it("wraps configureNotifications in try-catch", () => {
    // The initNotifications function should have try-catch around configure
    const initFn = src.match(
      /export async function initNotifications[\s\S]*?^}/m,
    );
    expect(initFn).toBeTruthy();
    const initBody = initFn![0];
    expect(initBody).toMatch(/try\s*\{[\s\S]*?configureNotifications/);
  });

  it("wraps registerForPushNotifications in try-catch", () => {
    const initFn = src.match(
      /export async function initNotifications[\s\S]*?^}/m,
    );
    expect(initFn).toBeTruthy();
    const initBody = initFn![0];
    expect(initBody).toMatch(
      /try\s*\{[\s\S]*?registerForPushNotifications/,
    );
  });

  it("wraps scheduleAllReminders in try-catch", () => {
    const initFn = src.match(
      /export async function initNotifications[\s\S]*?^}/m,
    );
    expect(initFn).toBeTruthy();
    const initBody = initFn![0];
    expect(initBody).toMatch(/try\s*\{[\s\S]*?scheduleAllReminders/);
  });
});

// ─── 5. Tab layout: iPad-responsive ────────────────────────────────────────
describe("Tab layout iPad responsiveness", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "app", "(tabs)", "_layout.tsx"),
    "utf-8",
  );

  it("uses useWindowDimensions for responsive layout", () => {
    expect(src).toContain("useWindowDimensions");
  });

  it("detects tablet form factor", () => {
    expect(src).toMatch(/isTablet|TABLET/i);
  });
});

// ─── 6. PostHog analytics: lazy require ────────────────────────────────────
describe("PostHog analytics safety", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "services", "analytics.ts"),
    "utf-8",
  );

  it("does NOT have a top-level import of posthog-react-native", () => {
    expect(src).not.toMatch(
      /^import\s.*from\s+["']posthog-react-native["']/m,
    );
  });

  it("uses lazy require() for posthog-react-native", () => {
    expect(src).toMatch(/require\(["']posthog-react-native["']\)/);
  });
});

// ─── 7. Supabase: guarded expo-constants access ───────────────────────────
describe("Supabase constants safety", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "constants", "supabase.ts"),
    "utf-8",
  );

  it("does NOT have a top-level import of expo-constants", () => {
    expect(src).not.toMatch(
      /^import\s.*from\s+["']expo-constants["']/m,
    );
  });

  it("uses lazy require() for expo-constants", () => {
    expect(src).toMatch(/require\(["']expo-constants["']\)/);
  });
});

// ─── 8. Haptic tab: guarded haptic calls ──────────────────────────────────
describe("Haptic tab safety", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "components", "haptic-tab.tsx"),
    "utf-8",
  );

  it("wraps Haptics.impactAsync in try-catch", () => {
    expect(src).toMatch(/try\s*\{[\s\S]*?Haptics\.impactAsync/);
  });
});
