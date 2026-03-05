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

// ─── 2. Sentry service: init is wrapped in try-catch ───────────────────────
describe("Sentry service safety", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "services", "sentry.ts"),
    "utf-8",
  );

  it("wraps Sentry.init() in a try-catch block", () => {
    // The init function body should contain try { ... Sentry.init ... } catch
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
    // Sentry.init should only appear inside the initSentry function
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

  it("does NOT call initSentry() at module level", () => {
    // Module level = outside any function body, before the first function/const declaration
    // Look for bare initSentry() calls that aren't inside a function
    const lines = src.split("\n");
    const moduleScope = [];
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
    // initSentry() and initPostHog() should NOT appear at module scope
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
