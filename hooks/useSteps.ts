/**
 * useSteps Hook
 *
 * Provides real-time step tracking data for the app.
 *
 * Features:
 * - Reads today's steps from the device pedometer (Apple Health on iOS)
 * - Live updates as the user walks
 * - Weekly step history for charts
 * - Auto-refreshes on app foreground
 * - Handles permissions gracefully
 */

import {
    estimateCaloriesFromSteps,
    estimateDistanceFromSteps,
    formatSteps,
    getPedometerPermissions,
    getTodaySteps,
    getWeeklySteps,
    isPedometerAvailable,
    requestPedometerPermissions,
    subscribeToPedometer,
    type WeeklySteps,
} from "@/services/stepTracking";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

const DEFAULT_STEP_GOAL = 10000;
const REFRESH_INTERVAL_MS = 30_000; // Refresh every 30 seconds
const IS_WEB = Platform.OS === "web";

export type StepsState = {
  /** Today's total step count */
  todaySteps: number;
  /** Formatted string (e.g. "10,234") */
  todayStepsFormatted: string;
  /** Daily step goal */
  goal: number;
  /** Progress toward goal (0.0 - 1.0+) */
  progress: number;
  /** Estimated calories burned from steps */
  calories: number;
  /** Estimated distance in miles */
  distanceMiles: number;
  /** Last 7 days of step data */
  weeklySteps: WeeklySteps;
  /** Whether the pedometer is available */
  isAvailable: boolean;
  /** Whether permissions are granted */
  hasPermission: boolean;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Request pedometer permissions */
  requestPermission: () => Promise<boolean>;
  /** Manually refresh step data */
  refresh: () => Promise<void>;
};

export function useSteps(stepGoal: number = DEFAULT_STEP_GOAL): StepsState {
  // All hooks must be called unconditionally (Rules of Hooks).
  // IS_WEB guards are placed *inside* callbacks/effects, not around them.
  const [todaySteps, setTodaySteps] = useState(0);
  const [weeklySteps, setWeeklySteps] = useState<WeeklySteps>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(!IS_WEB); // web is instantly "done"

  // Track the step count at subscription start so we can add live updates
  const baseStepsRef = useRef(0);
  const liveStepsRef = useRef(0);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);

  const loadSteps = useCallback(async () => {
    if (IS_WEB) return;
    try {
      const steps = await getTodaySteps();
      baseStepsRef.current = steps;
      liveStepsRef.current = 0;
      setTodaySteps(steps);
    } catch {
      // Keep existing data on error
    }
  }, []);

  const loadWeeklySteps = useCallback(async () => {
    if (IS_WEB) return;
    try {
      const data = await getWeeklySteps(7);
      setWeeklySteps(data);
    } catch {
      // Keep existing data on error
    }
  }, []);

  const refresh = useCallback(async () => {
    if (IS_WEB) return;
    setIsLoading(true);
    await Promise.all([loadSteps(), loadWeeklySteps()]);
    setIsLoading(false);
  }, [loadSteps, loadWeeklySteps]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (IS_WEB) return false;
    const granted = await requestPedometerPermissions();
    setHasPermission(granted);
    if (granted) {
      await refresh();
      startLiveTracking();
    }
    return granted;
  }, [refresh]);

  const startLiveTracking = useCallback(() => {
    if (IS_WEB) return;
    // Clean up any existing subscription
    subscriptionRef.current?.remove();

    // Subscribe to live step updates
    subscriptionRef.current = subscribeToPedometer((newSteps) => {
      liveStepsRef.current = newSteps;
      setTodaySteps(baseStepsRef.current + newSteps);
    });
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (IS_WEB) return; // pedometer never available on web
    let mounted = true;

    async function init() {
      const available = await isPedometerAvailable();
      if (!mounted) return;
      setIsAvailable(available);

      if (!available) {
        setIsLoading(false);
        return;
      }

      // Check existing permissions first
      let permitted = await getPedometerPermissions();

      if (!permitted) {
        // Auto-request on first load
        permitted = await requestPedometerPermissions();
      }

      if (!mounted) return;
      setHasPermission(permitted);

      if (permitted) {
        await Promise.all([loadSteps(), loadWeeklySteps()]);
        if (mounted) {
          startLiveTracking();
        }
      }

      if (mounted) setIsLoading(false);
    }

    init();

    return () => {
      mounted = false;
      subscriptionRef.current?.remove();
    };
  }, [loadSteps, loadWeeklySteps, startLiveTracking]);

  // Periodic refresh to keep data fresh
  useEffect(() => {
    if (IS_WEB || !hasPermission) return;

    const interval = setInterval(() => {
      loadSteps();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [hasPermission, loadSteps]);

  // Refresh when app comes to foreground
  useEffect(() => {
    if (IS_WEB) return;
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active" && hasPermission) {
        refresh();
        startLiveTracking();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    return () => subscription.remove();
  }, [hasPermission, refresh, startLiveTracking]);

  return {
    todaySteps,
    todayStepsFormatted: formatSteps(todaySteps),
    goal: stepGoal,
    progress: stepGoal > 0 ? todaySteps / stepGoal : 0,
    calories: estimateCaloriesFromSteps(todaySteps),
    distanceMiles: estimateDistanceFromSteps(todaySteps),
    weeklySteps,
    isAvailable,
    hasPermission,
    isLoading,
    requestPermission,
    refresh,
  };
}
