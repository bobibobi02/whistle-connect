import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CommunityRule {
  id: string;
  community_id: string;
  rule_number: number;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useCommunityRules = (communityId: string | undefined) => {
  return useQuery({
    queryKey: ["community-rules", communityId],
    queryFn: async () => {
      if (!communityId) return [];
      
      const { data, error } = await supabase
        .from("community_rules")
        .select("*")
        .eq("community_id", communityId)
        .order("rule_number", { ascending: true });
      
      if (error) throw error;
      return data as CommunityRule[];
    },
    enabled: !!communityId,
  });
};

export const useCreateCommunityRule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      communityId,
      title,
      description
    }: {
      communityId: string;
      title: string;
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Get the next rule number
      const { data: existingRules } = await supabase
        .from("community_rules")
        .select("rule_number")
        .eq("community_id", communityId)
        .order("rule_number", { ascending: false })
        .limit(1);
      
      const nextNumber = (existingRules?.[0]?.rule_number || 0) + 1;
      
      const { data, error } = await supabase
        .from("community_rules")
        .insert({
          community_id: communityId,
          rule_number: nextNumber,
          title,
          description,
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Log the action
      await supabase.from("community_mod_log").insert({
        community_id: communityId,
        mod_id: user.id,
        action: "create_rule",
        target_type: "rule",
        target_id: data.id,
        details: { title }
      });
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community-rules", variables.communityId] });
      toast({ title: "Rule created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating rule", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateCommunityRule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      ruleId,
      communityId,
      title,
      description
    }: {
      ruleId: string;
      communityId: string;
      title: string;
      description?: string;
    }) => {
      const { error } = await supabase
        .from("community_rules")
        .update({ title, description, updated_at: new Date().toISOString() })
        .eq("id", ruleId);
      
      if (error) throw error;
      
      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("community_mod_log").insert({
          community_id: communityId,
          mod_id: user.id,
          action: "update_rule",
          target_type: "rule",
          target_id: ruleId,
          details: { title }
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community-rules", variables.communityId] });
      toast({ title: "Rule updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating rule", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteCommunityRule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      ruleId,
      communityId
    }: {
      ruleId: string;
      communityId: string;
    }) => {
      const { error } = await supabase
        .from("community_rules")
        .delete()
        .eq("id", ruleId);
      
      if (error) throw error;
      
      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("community_mod_log").insert({
          community_id: communityId,
          mod_id: user.id,
          action: "delete_rule",
          target_type: "rule",
          target_id: ruleId
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community-rules", variables.communityId] });
      toast({ title: "Rule deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting rule", description: error.message, variant: "destructive" });
    },
  });
};
