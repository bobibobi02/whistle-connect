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
      const { data, error } = await supabase
        .from("post_boost_totals")
        .select("*")
        .eq("post_id", postId)
        .maybeSingle();

      if (error) throw error;
      return data as BoostTotals | null;
    },
    enabled: !!postId,
  });
};

export const usePostBoosts = (postId: string) => {
  return useQuery({
    queryKey: ["post-boosts", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_boosts")
        .select("*")
        .eq("post_id", postId)
        .eq("status", "succeeded")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PostBoost[];
    },
    enabled: !!postId,
  });
};

export const useCreateBoostCheckout = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

      return data.url as string;
    },
    onSuccess: (url) => {
      // Open Stripe checkout in new tab
      window.open(url, "_blank");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
