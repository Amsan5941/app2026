import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";

interface TimerState {
  isRunning: boolean;
  elapsedSeconds: number;
  startedAtMs: number | null;
}

const WORKOUT_TIMER_STATE_KEY = "@workout_timer_state_v1";

export function useWorkoutTimer() {
  const [state, setState] = useState<TimerState>({
    isRunning: false,
    elapsedSeconds: 0,
    startedAtMs: null,
  });
  const [hydrated, setHydrated] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getCurrentElapsedSeconds = useMemo(
    () => () => {
      if (!state.startedAtMs) return state.elapsedSeconds;
      return Math.max(0, Math.floor((Date.now() - state.startedAtMs) / 1000));
    },
    [state.startedAtMs, state.elapsedSeconds],
  );

  // Start the timer
  const start = () => {
    setState((prev) => {
      if (prev.isRunning) return prev;
      const startedAtMs = Date.now() - prev.elapsedSeconds * 1000;
      return { ...prev, isRunning: true, startedAtMs };
    });
  };

  // Stop the timer
  const stop = () => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
      elapsedSeconds: prev.startedAtMs
        ? Math.max(0, Math.floor((Date.now() - prev.startedAtMs) / 1000))
        : prev.elapsedSeconds,
      startedAtMs: null,
    }));
  };

  // Reset the timer
  const reset = () => {
    setState({ isRunning: false, elapsedSeconds: 0, startedAtMs: null });
  };

  // Hydrate timer state on mount so running workouts continue after app restarts.
  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(WORKOUT_TIMER_STATE_KEY);
        if (!raw || !isMounted) {
          setHydrated(true);
          return;
        }

        const parsed = JSON.parse(raw) as Partial<TimerState>;
        const startedAtMs =
          typeof parsed.startedAtMs === "number" ? parsed.startedAtMs : null;
        const elapsedSeconds = Math.max(
          0,
          Number.isFinite(parsed.elapsedSeconds)
            ? Number(parsed.elapsedSeconds)
            : 0,
        );
        const isRunning = Boolean(parsed.isRunning && startedAtMs);

        setState({ isRunning, elapsedSeconds, startedAtMs });
      } catch {
        // Ignore malformed cache and continue with defaults.
      } finally {
        if (isMounted) {
          setHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  // Persist timer state changes.
  useEffect(() => {
    if (!hydrated) return;

    AsyncStorage.setItem(
      WORKOUT_TIMER_STATE_KEY,
      JSON.stringify({
        isRunning: state.isRunning,
        elapsedSeconds: state.elapsedSeconds,
        startedAtMs: state.startedAtMs,
      }),
    ).catch(() => {
      // Storage failures should not block workout tracking UI.
    });
  }, [hydrated, state]);

  // Effect to handle interval
  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (!prev.startedAtMs) {
            return { ...prev, isRunning: false };
          }

          return {
            ...prev,
            elapsedSeconds: Math.max(
              0,
              Math.floor((Date.now() - prev.startedAtMs) / 1000),
            ),
          };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning]);

  return {
    hydrated,
    isRunning: state.isRunning,
    elapsedSeconds: getCurrentElapsedSeconds(),
    getCurrentElapsedSeconds,
    start,
    stop,
    reset,
  };
}
