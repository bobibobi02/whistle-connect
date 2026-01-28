import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SupportTicket {
  id: string;
  user_id: string | null;
  email: string | null;
  category: string;
  subject: string;
  description: string;
  screenshot_url: string | null;
  route: string | null;
  app_version: string | null;
  browser_info: Record<string, any> | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useSupportTickets = (status?: string) => {
  return useQuery({
    queryKey: ["support-tickets", status],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SupportTicket[];
    },
  });
};

export const useMyTickets = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!user?.id,
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      category,
      subject,
      description,
      email,
      screenshot_url,
    }: {
      category: string;
      subject: string;
      description: string;
      email?: string;
      screenshot_url?: string;
    }) => {
      const browserInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      };

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user?.id || null,
        email: email || user?.email || null,
        category,
        subject,
        description,
        screenshot_url,
        route: window.location.pathname,
        app_version: "1.0.0",
        browser_info: browserInfo,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
  });
};

export const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      priority,
      notes,
      assigned_to,
    }: {
      id: string;
      status?: string;
      priority?: string;
      notes?: string;
      assigned_to?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: Partial<SupportTicket> = {};
      if (status) updates.status = status;
      if (priority) updates.priority = priority;
      if (notes !== undefined) updates.notes = notes;
      if (assigned_to !== undefined) updates.assigned_to = assigned_to;
      
      if (status === "resolved") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
};
