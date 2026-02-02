import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface RateLimitConfig {
  /** Max actions allowed in the time window */
  maxActions: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Action name for the toast message */
  actionName?: string;
  /** Whether to show toast on rate limit */
  showToast?: boolean;
}

interface RateLimitState {
  /** Number of actions taken in current window */
  count: number;
  /** Timestamp when the window started */
  windowStart: number;
}

const defaultConfig: RateLimitConfig = {
  maxActions: 5,
  windowMs: 60000, // 1 minute
  actionName: "action",
  showToast: true,
};

/**
 * Client-side rate limiting hook for anti-abuse protection.
 * This is a soft limit - it shows a friendly message and prevents spam,
 * but the real enforcement happens server-side.
 */
export const useRateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const { maxActions, windowMs, actionName, showToast } = { ...defaultConfig, ...config };
  const { toast } = useToast();
  const { user } = useAuth();
  
  const stateRef = useRef<RateLimitState>({
    count: 0,
    windowStart: Date.now(),
  });

  const [isLimited, setIsLimited] = useState(false);

  const checkLimit = useCallback((): boolean => {
    const now = Date.now();
    const state = stateRef.current;

    // Reset window if expired
    if (now - state.windowStart > windowMs) {
      state.count = 0;
      state.windowStart = now;
      setIsLimited(false);
    }

    // Check if we're at the limit
    if (state.count >= maxActions) {
      const remainingMs = windowMs - (now - state.windowStart);
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      
      if (showToast) {
        toast({
          title: "Please slow down",
          description: `You're doing that too quickly. Try again in ${remainingSeconds} seconds.`,
        });
      }
      
      setIsLimited(true);
      return false;
    }

    // Increment counter
    state.count++;
    return true;
  }, [maxActions, windowMs, showToast, toast]);

  const resetLimit = useCallback(() => {
    stateRef.current = {
      count: 0,
      windowStart: Date.now(),
    };
    setIsLimited(false);
  }, []);

  /**
   * Wraps an async function with rate limiting.
   * Returns undefined if rate limited, otherwise returns the function result.
   */
  const withRateLimit = useCallback(
    <T extends (...args: any[]) => Promise<any>>(fn: T) => {
      return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
        if (!checkLimit()) {
          return undefined;
        }
        return fn(...args);
      };
    },
    [checkLimit]
  );

  return {
    checkLimit,
    isLimited,
    resetLimit,
    withRateLimit,
  };
};

// Pre-configured rate limits for common actions
export const usePostRateLimit = () => useRateLimit({
  maxActions: 5,
  windowMs: 60000, // 5 posts per minute
  actionName: "post",
});

export const useCommentRateLimit = () => useRateLimit({
  maxActions: 10,
  windowMs: 60000, // 10 comments per minute
  actionName: "comment",
});

export const useReportRateLimit = () => useRateLimit({
  maxActions: 5,
  windowMs: 300000, // 5 reports per 5 minutes
  actionName: "report",
});

export const useMessageRateLimit = () => useRateLimit({
  maxActions: 20,
  windowMs: 60000, // 20 messages per minute
  actionName: "message",
});
