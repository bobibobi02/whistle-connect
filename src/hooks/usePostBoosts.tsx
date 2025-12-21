import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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

export const usePostBoostTotals = (postId: string) => {
  return useQuery({
    queryKey: ["post-boost-totals", postId],
    queryFn: async () => {
      console.log("[Boost] Fetching totals for post:", postId);
      const { data, error } = await supabase
        .from("post_boost_totals")
        .select("*")
        .eq("post_id", postId)
        .maybeSingle();

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
