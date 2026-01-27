import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface ThrottleOptions {
  cooldownMs?: number;
  showToast?: boolean;
}

/**
 * Hook for throttling write actions to prevent spam and double-submits.
 * Returns a wrapper function that enforces cooldown between actions.
 */
export const useThrottle = (options: ThrottleOptions = {}) => {
  const { cooldownMs = 2000, showToast = true } = options;
  const [isThrottled, setIsThrottled] = useState(false);
  const lastActionRef = useRef<number>(0);
  const { toast } = useToast();

  const throttle = useCallback(
    <T extends (...args: any[]) => any>(fn: T): ((...args: Parameters<T>) => ReturnType<T> | undefined) => {
      return (...args: Parameters<T>) => {
        const now = Date.now();
        const timeSinceLastAction = now - lastActionRef.current;

        if (timeSinceLastAction < cooldownMs) {
          if (showToast) {
            const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastAction) / 1000);
            toast({
              title: "Slow down",
              description: `Please wait ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} before trying again.`,
              variant: "default",
            });
          }
          return undefined;
        }

        lastActionRef.current = now;
        setIsThrottled(true);
        
        setTimeout(() => {
          setIsThrottled(false);
        }, cooldownMs);

        return fn(...args);
      };
    },
    [cooldownMs, showToast, toast]
  );

  return { throttle, isThrottled };
};

/**
 * Simple debounce hook for input fields / autosave
 */
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook for debouncing a callback function
 */
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { debouncedFn, cancel };
};
