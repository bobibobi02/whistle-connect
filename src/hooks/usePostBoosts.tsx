import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Debug: Log Supabase URL once on module load
console.log("[WhistleConnect] SUPABASE_URL =", import.meta.env.VITE_SUPABASE_URL);

// Interface for old post_boosts table (used by BoostModal, etc.)
export interface PostBoost {
  id: string;
  post_id: string;
  from_user_id: string | null;
  amount_cents: number;
  currency: string;
  message: string | null;
  is_public: boolean;
  status: string;
  created_at: string;
}

export interface BoostTotals {
  post_id: string;
  boost_count: number;
  total_amount_cents: number;
  currency: string;
}

// Interface for paid boosts from post_boosts table
export interface PaidBoost {
  id: string;
  post_id: string;
  from_user_id: string | null;
  amount_cents: number;
  currency: string;
  is_public: boolean;
  created_at: string;
}

export interface PaidBoostWithProfile extends PaidBoost {
  profile?: {
    display_name: string | null;
    username: string | null;
  } | null;
  amount_total?: number; // Alias for backward compat with BoostsSection
}

// Legacy interface for backward compatibility
export interface BoostWithProfile extends PostBoost {
  profile?: {
    display_name: string | null;
    username: string | null;
  } | null;
}

export const usePostBoostTotals = (postId: string) => {
  return useQuery({
    queryKey: ["post-boost-totals", postId],
    queryFn: async () => {
      console.log("[Boost] Fetching totals for post:", postId);
      const { data, error } = await supabase.from("post_boost_totals").select("*").eq("post_id", postId).maybeSingle();

      if (error) {
        console.error("[Boost] Error fetching totals:", error);
        throw error;
      }
      console.log("[Boost] Totals result:", data);
      return data as BoostTotals | null;
    },
    enabled: !!postId,
  });
};

// Fetch all successful boosts from post_boosts table
// NOTE: In this app DB, successful Stripe payments are stored as status='succeeded' (older code used 'paid').
// We include both to be safe.
export const usePaidBoosts = (postId: string) => {
  return useQuery({
    queryKey: ["paid-boosts", postId],
    queryFn: async () => {
      console.log("[Boost] Fetching successful boosts from 'post_boosts' table for post:", postId);

      // Query the post_boosts table with correct column names
      const { data, error } = await supabase
        .from("post_boosts")
        .select("id, post_id, from_user_id, amount_cents, currency, is_public, created_at")
        .eq("post_id", postId)
        .in("status", ["succeeded", "paid"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Boost] Error fetching successful boosts:", error);
        // Don't throw - return empty array so UI doesn't break
        return [] as PaidBoostWithProfile[];
      }

      console.log("[Boost] Raw successful boosts data:", data);

      if (!data || data.length === 0) {
        return [] as PaidBoostWithProfile[];
      }

      // Fetch profiles for boosts with user IDs (optional - don't break if fails)
      const userIds = data.map((b) => b.from_user_id).filter((id): id is string => id !== null && id !== undefined);

      let profilesMap: Record<string, { display_name: string | null; username: string | null }> = {};

      if (userIds.length > 0) {
        try {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("user_id, display_name, username")
            .in("user_id", userIds);

          if (!profilesError && profiles) {
            profilesMap = profiles.reduce(
              (acc, p) => {
                acc[p.user_id] = { display_name: p.display_name, username: p.username };
                return acc;
              },
              {} as typeof profilesMap,
            );
          }
        } catch (e) {
          console.warn("[Boost] Could not fetch profiles (RLS/guest), showing as Anonymous");
        }
      }

      const boostsWithProfiles: PaidBoostWithProfile[] = data.map((boost) => ({
        id: boost.id,
        post_id: boost.post_id,
        from_user_id: boost.from_user_id,
        amount_cents: boost.amount_cents,
        amount_total: boost.amount_cents, // Alias for BoostsSection compatibility
        currency: boost.currency || "eur",
        is_public: boost.is_public ?? true,
        created_at: boost.created_at,
        profile: boost.from_user_id ? profilesMap[boost.from_user_id] || null : null,
      }));

      console.log("[Boost] Successful boosts with profiles:", boostsWithProfiles);
      return boostsWithProfiles;
    },
    enabled: !!postId,
  });
};

// Legacy: Fetch succeeded boosts from old post_boosts table (kept for backward compatibility)
export const useSucceededBoosts = (postId: string) => {
  return useQuery({
    queryKey: ["succeeded-boosts", postId],
    queryFn: async () => {
      console.log("[Boost] Fetching succeeded boosts from 'post_boosts' table for post:", postId);
      const { data, error } = await supabase
        .from("post_boosts")
        .select(
          `
          id,
          post_id,
          from_user_id,
          amount_cents,
          currency,
          is_public,
          created_at,
          status
        `,
        )
        .eq("post_id", postId)
        .eq("status", "succeeded")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Boost] Error fetching succeeded boosts:", error);
        return [] as BoostWithProfile[];
      }

      // Fetch profiles for boosts with user IDs
      const userIds = data.map((b) => b.from_user_id).filter((id): id is string => id !== null);

      let profilesMap: Record<string, { display_name: string | null; username: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, username")
          .in("user_id", userIds);

        if (profiles) {
          profilesMap = profiles.reduce(
            (acc, p) => {
              acc[p.user_id] = { display_name: p.display_name, username: p.username };
              return acc;
            },
            {} as typeof profilesMap,
          );
        }
      }

      const boostsWithProfiles: BoostWithProfile[] = data.map((boost) => ({
        ...boost,
        message: null, // Not selected
        profile: boost.from_user_id ? profilesMap[boost.from_user_id] || null : null,
      }));

      console.log("[Boost] Succeeded boosts result:", boostsWithProfiles);
      return boostsWithProfiles;
    },
    enabled: !!postId,
  });
};

export const usePostBoosts = (postId: string) => {
  return useQuery({
    queryKey: ["post-boosts", postId],
    queryFn: async () => {
      console.log("[Boost] Fetching public boosts for post:", postId);
      const { data, error } = await supabase
        .from("post_boosts")
        .select("*")
        .eq("post_id", postId)
        .eq("status", "succeeded")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Boost] Error fetching boosts:", error);
        throw error;
      }
      console.log("[Boost] Public boosts result:", data);
      return data as PostBoost[];
    },
    enabled: !!postId,
  });
};

export const useVerifyBoostPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boostId: string) => {
      console.log("[Boost] Verifying payment for boost:", boostId);
      const { data, error } = await supabase.functions.invoke("verify-boost-payment", {
        body: { boost_id: boostId },
      });

      if (error) {
        console.error("[Boost] Verification error:", error);
        throw error;
      }
      console.log("[Boost] Verification result:", data);
      return data;
    },
    onSuccess: (data, boostId) => {
      if (data.status === "succeeded") {
        console.log("[Boost] Payment verified, invalidating queries");
        // Invalidate all boost-related queries and comments (boost comments are created on webhook)
        queryClient.invalidateQueries({ queryKey: ["post-boosts"] });
        queryClient.invalidateQueries({ queryKey: ["post-boost-totals"] });
        queryClient.invalidateQueries({ queryKey: ["comments"] });
        toast.success("Boost confirmed! Thank you for your support.");
      }
    },
    onError: (error: Error) => {
      console.error("[Boost] Verification failed:", error);
    },
  });
};

export const useCreateBoostCheckout = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      amountCents,
      message,
      isPublic,
    }: {
      postId: string;
      amountCents: number;
      message?: string;
      isPublic?: boolean;
    }) => {
      if (!user) {
        throw new Error("You must be logged in to boost a post");
      }

      console.log("[Boost] Creating checkout:", { postId, amountCents, message, isPublic });

      const { data, error } = await supabase.functions.invoke("create-boost-checkout", {
        body: {
          post_id: postId,
          amount_cents: amountCents,
          message: message || null,
          is_public: isPublic ?? false,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Store boost ID in session for verification on return
      const boostId = data.boost_id;
      if (boostId) {
        sessionStorage.setItem("pending_boost_id", boostId);
        console.log("[Boost] Stored pending boost ID:", boostId);
      }

      return data.url as string;
    },
    onSuccess: (url) => {
      window.open(url, "_blank");
    },
    onError: (error: Error) => {
      console.error("[Boost] Checkout error:", error);
      toast.error(error.message);
    },
  });
};
