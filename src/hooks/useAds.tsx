import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Types for ad system
export interface AdCreative {
  requestId: string | null;
  campaignId: string;
  creativeId: string;
  type: "image" | "video" | "text";
  headline: string;
  body: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  clickUrl: string;
  displayUrl: string | null;
  callToAction: string;
  advertiserName: string | null;
  advertiserIcon: string | null;
  placementKey: string;
}

export interface AdRequestContext {
  placementKey: string;
  loopId?: string;
  postId?: string;
  pageType?: string;
  keywords?: string[];
  isNsfw?: boolean;
  deviceType?: string;
  sessionId?: string;
}

export interface AdResponse {
  ad: AdCreative | null;
  reason: string;
}

// Generate or retrieve session ID for anonymous tracking
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("whistle_ad_session");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("whistle_ad_session", sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = (): string => {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
};

export function useAdRequest(context: AdRequestContext, enabled = true) {
  const { user } = useAuth();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return useQuery({
    queryKey: ["ad", context.placementKey, context.loopId, context.postId],
    queryFn: async (): Promise<AdResponse> => {
      // Guard against missing env vars
      if (!supabaseUrl) {
        if (import.meta.env.DEV) {
          console.warn("[Ads] VITE_SUPABASE_URL not configured");
        }
        return { ad: null, reason: "not_configured" };
      }

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/ad-request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            context: {
              ...context,
              sessionId: getSessionId(),
              deviceType: getDeviceType(),
            },
            userId: user?.id || null,
          }),
        });

        if (!response.ok) {
          // Return empty ad instead of throwing - ads are non-critical
          return { ad: null, reason: "request_failed" };
        }

        return response.json();
      } catch (error) {
        // Network errors should not break the page
        if (import.meta.env.DEV) {
          console.warn("[Ads] Ad request failed:", error);
        }
        return { ad: null, reason: "network_error" };
      }
    },
    enabled: enabled && !!supabaseUrl,
    staleTime: 30 * 1000, // Cache for 30 seconds
    gcTime: 60 * 1000,
    retry: false, // Don't retry failed ad requests
  });
}

export function useAdEvent() {
  const { user } = useAuth();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return useMutation({
    mutationFn: async ({
      requestId,
      campaignId,
      creativeId,
      placementKey,
      eventType,
      postId,
      community,
    }: {
      requestId: string | null;
      campaignId: string;
      creativeId: string;
      placementKey: string;
      eventType: "impression" | "click" | "hide" | "skip" | "complete";
      postId?: string;
      community?: string;
    }) => {
      // Guard against missing env vars
      if (!supabaseUrl) {
        if (import.meta.env.DEV) {
          console.warn("[Ads] VITE_SUPABASE_URL not configured for ad-event");
        }
        return { success: false };
      }

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/ad-event`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            requestId,
            campaignId,
            creativeId,
            placementKey,
            eventType,
            postId,
            community,
            userId: user?.id || null,
          }),
        });

        if (!response.ok) {
          // Don't throw - ad events are non-critical
          return { success: false };
        }

        return response.json();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("[Ads] Ad event tracking failed:", error);
        }
        return { success: false };
      }
    },
  });
}

export function useAdHide() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return useMutation({
    mutationFn: async ({
      campaignId,
      advertiserId,
    }: {
      campaignId?: string;
      advertiserId?: string;
    }) => {
      if (!user?.id) {
        // Not logged in - just pretend we hid it locally
        return { success: true, local: true };
      }

      // Guard against missing env vars
      if (!supabaseUrl) {
        return { success: false };
      }

      try {
        // Get the current session token for authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          // No session but user exists - maybe session expired
          return { success: false, reason: "no_session" };
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/ad-hide`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            campaignId,
            advertiserId,
          }),
        });

        if (!response.ok) {
          // Non-critical - just log in dev
          if (import.meta.env.DEV) {
            console.warn("[Ads] Failed to hide ad on server");
          }
          return { success: false };
        }

        return response.json();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("[Ads] Hide ad failed:", error);
        }
        return { success: false };
      }
    },
    onSuccess: () => {
      // Invalidate all ad queries to refresh ads
      queryClient.invalidateQueries({ queryKey: ["ad"] });
    },
  });
}

// Hook for getting placement configuration
// Uses .limit(1).maybeSingle() to avoid 406 errors when multiple rows exist or none
export function usePlacement(placementKey: string) {
  return useQuery({
    queryKey: ["placement", placementKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("placements")
        .select("*")
        .eq("key", placementKey)
        .eq("enabled", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // PGRST116 = no rows found, which is fine - return null
      if (error && error.code !== "PGRST116") {
        console.error("[Ads] Placement query error:", error);
        throw error;
      }
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Creator monetization hooks
export function useCreatorMonetization() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["creator-monetization", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Use .maybeSingle() to avoid 406 errors when no record exists
      const { data, error } = await supabase
        .from("creator_monetization")
        .select("*")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useCreatorEarnings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["creator-earnings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("creator_earnings")
        .select("*")
        .eq("user_id", user.id)
        .order("period_start", { ascending: false })
        .limit(12);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function usePayoutHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["payouts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useToggleMonetization() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Check if record exists - use .maybeSingle() to avoid 406
      const { data: existing } = await supabase
        .from("creator_monetization")
        .select("user_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("creator_monetization")
          .update({ enabled })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("creator_monetization")
          .insert({ user_id: user.id, enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-monetization"] });
    },
  });
}

export function useRequestPayout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amountCents: number) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase.from("payouts").insert({
        user_id: user.id,
        amount_cents: amountCents,
        currency: "USD",
        status: "pending",
      });

      if (error) throw error;

      // Update pending payout amount in monetization - use .maybeSingle()
      const { data: monetization } = await supabase
        .from("creator_monetization")
        .select("pending_payout_cents")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (monetization) {
        await supabase
          .from("creator_monetization")
          .update({
            pending_payout_cents: Math.max(0, (monetization as any).pending_payout_cents - amountCents),
          })
          .eq("user_id", user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-monetization"] });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
  });
}
