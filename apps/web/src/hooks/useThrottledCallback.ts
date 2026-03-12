import { useRef, useCallback } from "react";

export function useThrottledCallback<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T {
  const lastCall = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    ((...args: unknown[]) => {
      const now = Date.now();
      const remaining = delay - (now - lastCall.current);

      if (remaining <= 0) {
        lastCall.current = now;
        fn(...args);
      } else if (!timer.current) {
        timer.current = setTimeout(() => {
          lastCall.current = Date.now();
          timer.current = null;
          fn(...args);
        }, remaining);
      }
    }) as T,
    [fn, delay]
  );
}
