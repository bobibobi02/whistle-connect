import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdPackage {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  duration_days: number;
  includes_sponsored_posts: number;
  includes_banners: number;
  includes_loop_sponsorship: boolean;
  includes_reporting: boolean;
  is_exclusive: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdPayment {
  id: string;
  advertiser_id: string;
  campaign_id: string | null;
  package_id: string | null;
  gross_amount_cents: number;
  platform_fee_cents: number;
  net_amount_cents: number;
  currency: string;
  payment_method: string | null;
  payment_reference: string | null;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface LoopSponsorship {
  id: string;
  community_id: string;
  advertiser_id: string;
  campaign_id: string | null;
  label_text: string;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
  start_at: string | null;
  end_at: string | null;
  status: string;
  created_at: string;
}

export function useAdPackages() {
  return useQuery({
    queryKey: ["ad-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_packages")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as AdPackage[];
    },
  });
}

export function useAdPayments(advertiserId?: string) {
  return useQuery({
    queryKey: ["ad-payments", advertiserId],
    queryFn: async () => {
      let query = supabase
        .from("ad_payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (advertiserId) {
        query = query.eq("advertiser_id", advertiserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AdPayment[];
    },
  });
}

export function useLoopSponsorships() {
  return useQuery({
    queryKey: ["loop-sponsorships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loop_sponsorships")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LoopSponsorship[];
    },
  });
}

export function useAdRevenueSummary() {
  return useQuery({
    queryKey: ["ad-revenue-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_revenue_summary")
        .select("*");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAdPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pkg: Partial<AdPackage>) => {
      const { error } = await supabase.from("ad_packages").insert(pkg as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Package created");
      queryClient.invalidateQueries({ queryKey: ["ad-packages"] });
    },
    onError: () => toast.error("Failed to create package"),
  });
}

export function useUpdateAdPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AdPackage> & { id: string }) => {
      const { error } = await supabase.from("ad_packages").update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Package updated");
      queryClient.invalidateQueries({ queryKey: ["ad-packages"] });
    },
    onError: () => toast.error("Failed to update package"),
  });
}

export function useCreateAdPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: {
      advertiser_id: string;
      campaign_id?: string;
      package_id?: string;
      gross_amount_cents: number;
      currency?: string;
      payment_method?: string;
      payment_reference?: string;
      notes?: string;
    }) => {
      const platformFee = Math.round(payment.gross_amount_cents * 0.30);
      const netAmount = payment.gross_amount_cents - platformFee;

      const { error } = await supabase.from("ad_payments").insert({
        ...payment,
        platform_fee_cents: platformFee,
        net_amount_cents: netAmount,
        currency: payment.currency || "EUR",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      queryClient.invalidateQueries({ queryKey: ["ad-payments"] });
    },
    onError: () => toast.error("Failed to record payment"),
  });
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === "paid") {
        updateData.paid_at = new Date().toISOString();
      }
      const { error } = await supabase.from("ad_payments").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment status updated");
      queryClient.invalidateQueries({ queryKey: ["ad-payments"] });
    },
    onError: () => toast.error("Failed to update payment"),
  });
}

export function useCreateLoopSponsorship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sponsorship: Partial<LoopSponsorship>) => {
      const { error } = await supabase.from("loop_sponsorships").insert(sponsorship as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Loop sponsorship created");
      queryClient.invalidateQueries({ queryKey: ["loop-sponsorships"] });
    },
    onError: () => toast.error("Failed to create sponsorship"),
  });
}

export function useUpdateLoopSponsorship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<LoopSponsorship> & { id: string }) => {
      const { error } = await supabase.from("loop_sponsorships").update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sponsorship updated");
      queryClient.invalidateQueries({ queryKey: ["loop-sponsorships"] });
    },
    onError: () => toast.error("Failed to update sponsorship"),
  });
}

// Helper for CSV export
export function exportToCSV(data: any[], filename: string) {
  if (!data.length) {
    toast.error("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => {
        const value = row[h];
        if (value === null || value === undefined) return "";
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Export downloaded");
}
