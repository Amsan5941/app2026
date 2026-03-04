/**
 * useLoadingGuard — detects infinite / stuck loading states.
 *
 * Drop it into any screen that has a `loading` boolean:
 *
 *   const { timedOut } = useLoadingGuard("HomeScreen", loading);
 *
 * After `timeoutMs` (default 12 s) of continuous `loading === true` the hook
 * sets `timedOut` to true so you can render an error / retry UI, and it logs
 * a warning via the instrumentation logger.
 */
import { log } from "@/utils/log";
import { useEffect, useRef, useState } from "react";

export function useLoadingGuard(
  name: string,
  loading: boolean,
  { timeoutMs = 12_000 }: { timeoutMs?: number } = {},
) {
  const [timedOut, setTimedOut] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) {
      timer.current = setTimeout(() => {
        log.warn("LoadingGuard", `${name} exceeded ${timeoutMs} ms`);
        setTimedOut(true);
      }, timeoutMs);
    } else {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setTimedOut(false);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [loading, name, timeoutMs]);

  return { timedOut };
}
