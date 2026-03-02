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
  // Pedometer is never available on web — return static defaults immediately
  // to avoid unnecessary async calls (isPedometerAvailable, permissions, etc.)
  if (IS_WEB) {
    const noopRefresh = useCallback(async () => {}, []);
    const noopPermission = useCallback(async () => false, []);
    return {
      todaySteps: 0,
      todayStepsFormatted: "0",
      goal: stepGoal,
      progress: 0,
      calories: 0,
      distanceMiles: 0,
      weeklySteps: [],
      isAvailable: false,
      hasPermission: false,
      isLoading: false,
      requestPermission: noopPermission,
      refresh: noopRefresh,
    };
  }

  const [todaySteps, setTodaySteps] = useState(0);
  const [weeklySteps, setWeeklySteps] = useState<WeeklySteps>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Track the step count at subscription start so we can add live updates
  const baseStepsRef = useRef(0);
  const liveStepsRef = useRef(0);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);

  const loadSteps = useCallback(async () => {
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
    try {
      const data = await getWeeklySteps(7);
      setWeeklySteps(data);
    } catch {
      // Keep existing data on error
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadSteps(), loadWeeklySteps()]);
    setIsLoading(false);
  }, [loadSteps, loadWeeklySteps]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await requestPedometerPermissions();
    setHasPermission(granted);
    if (granted) {
      await refresh();
      startLiveTracking();
    }
    return granted;
  }, [refresh]);

  const startLiveTracking = useCallback(() => {
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
    if (!hasPermission) return;

    const interval = setInterval(() => {
      loadSteps();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [hasPermission, loadSteps]);

  // Refresh when app comes to foreground
  useEffect(() => {
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
