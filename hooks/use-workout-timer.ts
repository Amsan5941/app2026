import { useEffect, useRef, useState } from "react";

interface TimerState {
  isRunning: boolean;
  elapsedSeconds: number;
}

export function useWorkoutTimer() {
  const [state, setState] = useState<TimerState>({
    isRunning: false,
    elapsedSeconds: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start the timer
  const start = () => {
    setState((prev) => ({ ...prev, isRunning: true }));
  };

  // Stop the timer
  const stop = () => {
    setState((prev) => ({ ...prev, isRunning: false }));
  };

  // Reset the timer
  const reset = () => {
    setState({ isRunning: false, elapsedSeconds: 0 });
  };

  // Effect to handle interval
  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
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
    isRunning: state.isRunning,
    elapsedSeconds: state.elapsedSeconds,
    start,
    stop,
    reset,
  };
}
