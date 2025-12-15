import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Community {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  created_by: string;
  member_count: number | null;
  created_at: string;
  updated_at: string;
}

export const useCommunities = () => {
  return useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("*")
        .order("member_count", { ascending: false });

      if (error) throw error;
      return data as Community[];
    },
  });
};

export const useCommunity = (name: string) => {
  return useQuery({
    queryKey: ["community", name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("*")
        .eq("name", name)
        .maybeSingle();

      if (error) throw error;
      return data as Community | null;
    },
    enabled: !!name,
  });
};

export const useCreateCommunity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      name,
      displayName,
      description,
      icon,
      userId,
    }: {
      name: string;
      displayName: string;
      description: string;
      icon: string;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from("communities")
        .insert({
          name: name.toLowerCase().replace(/\s+/g, "-"),
          display_name: displayName,
          description,
          icon,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      toast({
        title: "Community created!",
        description: "Your new community is ready.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating community",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
