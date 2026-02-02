import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Megaphone, Building2, BarChart3, Target, Image, Plus, Edit, Trash2, Eye, Play, Pause, DollarSign, Package, CreditCard, Users, FileText, Download } from "lucide-react";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  useAdPackages,
  useAdPayments,
  useLoopSponsorships,
  useAdRevenueSummary,
  useCreateAdPackage,
  useUpdateAdPackage,
  useCreateAdPayment,
  useUpdatePaymentStatus,
  useCreateLoopSponsorship,
  useUpdateLoopSponsorship,
  exportToCSV,
  AdPackage,
  AdPayment,
  LoopSponsorship,
} from "@/hooks/useAdPackages";

// Types
interface Advertiser {
  id: string;
  name: string;
  company_name: string | null;
  billing_email: string;
  website_url: string | null;
  status: string;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  advertiser_id: string;
  status: string;
  objective: string;
  campaign_type?: string;
  bid_type: string;
  bid_value_cents: number;
  budget_cents: number;
  spent_cents: number;
  daily_cap_cents: number | null;
  start_at: string | null;
  end_at: string | null;
  payment_status?: string;
  created_at: string;
}

interface Creative {
  id: string;
  campaign_id: string;
  headline: string;
  body: string | null;
  type: string;
  image_url: string | null;
  video_url: string | null;
  click_url: string;
  display_url: string | null;
  call_to_action: string | null;
  advertiser_name: string | null;
  advertiser_icon: string | null;
  status: string;
  created_at: string;
}

interface Community {
  id: string;
  name: string;
  display_name: string;
}

const PLATFORM_FEE_PERCENT = 30;

const AdminAds = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useIsAdmin();

  // Fetch data
  const { data: advertisers, isLoading: advertisersLoading } = useQuery({
    queryKey: ["admin-advertisers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("advertisers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Advertiser[];
    },
    enabled: isAdmin,
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: isAdmin,
  });

  const { data: creatives, isLoading: creativesLoading } = useQuery({
    queryKey: ["admin-creatives"],
    queryFn: async () => {
      const { data, error } = await supabase.from("creatives").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Creative[];
    },
    enabled: isAdmin,
  });

  const { data: communities } = useQuery({
    queryKey: ["all-communities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("communities").select("id, name, display_name").order("name");
      if (error) throw error;
      return data as Community[];
    },
    enabled: isAdmin,
  });

  const { data: revenueSummary } = useAdRevenueSummary();
  const { data: packages } = useAdPackages();
  const { data: payments } = useAdPayments();
  const { data: sponsorships } = useLoopSponsorships();

  if (authLoading || rolesLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setIsMobileNavOpen(true)} />
        <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
        <main className="container max-w-2xl mx-auto px-4 py-16 text-center">
          <Megaphone className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access the ad management dashboard.
          </p>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </main>
      </div>
    );
  }

  // Calculate totals with platform fee
  const totalGross = campaigns?.reduce((sum, c) => sum + c.spent_cents, 0) ?? 0;
  const totalPlatformFee = Math.round(totalGross * (PLATFORM_FEE_PERCENT / 100));
  const totalNet = totalGross - totalPlatformFee;
  const totalImpressions = revenueSummary?.reduce((sum, p) => sum + Number(p.impressions || 0), 0) ?? 0;
  const totalClicks = revenueSummary?.reduce((sum, p) => sum + Number(p.clicks || 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-6xl mx-auto px-4 py-6 pb-24">
        <Link to="/admin" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Admin</span>
        </Link>

        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Ad Management</h1>
              <p className="text-muted-foreground">Manage advertisers, campaigns, packages & revenue</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to="/admin/media-kit">
              <FileText className="h-4 w-4 mr-2" />
              Media Kit
            </Link>
          </Button>
        </div>

        {/* Overview Stats with Platform Fee */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Gross Revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{(totalGross / 100).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="border-primary/50">
            <CardHeader className="pb-2">
              <CardDescription>Platform Fee (30%)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">€{(totalPlatformFee / 100).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Net to Creators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{(totalNet / 100).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Impressions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>CTR</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00"}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How to Sell Ads Early - Admin Only Note */}
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              How to Sell Ads Early
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>1. Create an advertiser</strong> — Add the business name and billing email.</p>
            <p><strong>2. Create a campaign</strong> — Select campaign type (sponsored_post, banner, or loop_sponsorship), set budget.</p>
            <p><strong>3. Add a creative</strong> — Upload image/video, write headline and CTA.</p>
            <p><strong>4. Set status to "active"</strong> — The ad will begin serving immediately.</p>
            <p><strong>5. Track manually</strong> — Use "Payments" tab to record payments. Platform fee is 30%.</p>
            <p className="pt-2 text-xs">Use the <strong>Media Kit</strong> page to share specs with potential advertisers.</p>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="advertisers" className="gap-2">
              <Building2 className="h-4 w-4" />
              Advertisers
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Target className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="creatives" className="gap-2">
              <Image className="h-4 w-4" />
              Creatives
            </TabsTrigger>
            <TabsTrigger value="packages" className="gap-2">
              <Package className="h-4 w-4" />
              Packages
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="sponsorships" className="gap-2">
              <Users className="h-4 w-4" />
              Loop Sponsors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab 
              revenueSummary={revenueSummary ?? []} 
              isLoading={!revenueSummary}
            />
          </TabsContent>

          <TabsContent value="advertisers">
            <AdvertisersTab 
              advertisers={advertisers ?? []} 
              isLoading={advertisersLoading} 
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["admin-advertisers"] })}
            />
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignsTab 
              campaigns={campaigns ?? []} 
              advertisers={advertisers ?? []}
              isLoading={campaignsLoading} 
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] })}
            />
          </TabsContent>

          <TabsContent value="creatives">
            <CreativesTab 
              creatives={creatives ?? []} 
              campaigns={campaigns ?? []}
              isLoading={creativesLoading} 
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["admin-creatives"] })}
            />
          </TabsContent>

          <TabsContent value="packages">
            <PackagesTab packages={packages ?? []} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTab 
              payments={payments ?? []} 
              advertisers={advertisers ?? []}
              campaigns={campaigns ?? []}
            />
          </TabsContent>

          <TabsContent value="sponsorships">
            <SponsorshipsTab 
              sponsorships={sponsorships ?? []}
              advertisers={advertisers ?? []}
              campaigns={campaigns ?? []}
              communities={communities ?? []}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Overview Tab with Export
function OverviewTab({ revenueSummary, isLoading }: { revenueSummary: any[], isLoading: boolean }) {
  const handleExport = () => {
    const exportData = revenueSummary.map(r => ({
      campaign: r.campaign_name,
      advertiser: r.advertiser_name,
      type: r.campaign_type,
      status: r.status,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.ctr,
      gross_revenue: (Number(r.gross_revenue_cents) / 100).toFixed(2),
      platform_fee_30pct: (Number(r.platform_fee_cents) / 100).toFixed(2),
      net_revenue: (Number(r.net_revenue_cents) / 100).toFixed(2),
    }));
    exportToCSV(exportData, "ad_performance_report");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Revenue breakdown by campaign with 30% platform fee</CardDescription>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={!revenueSummary.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : revenueSummary.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No performance data yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Fee (30%)</TableHead>
                  <TableHead>Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueSummary.map((r) => (
                  <TableRow key={r.campaign_id}>
                    <TableCell className="font-medium">{r.campaign_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.campaign_type || "sponsored_post"}</Badge></TableCell>
                    <TableCell>{Number(r.impressions || 0).toLocaleString()}</TableCell>
                    <TableCell>{Number(r.clicks || 0).toLocaleString()}</TableCell>
                    <TableCell>{Number(r.ctr || 0).toFixed(2)}%</TableCell>
                    <TableCell>€{(Number(r.gross_revenue_cents || 0) / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-primary font-medium">€{(Number(r.platform_fee_cents || 0) / 100).toFixed(2)}</TableCell>
                    <TableCell>€{(Number(r.net_revenue_cents || 0) / 100).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Advertisers Tab
function AdvertisersTab({ advertisers, isLoading, onRefresh }: { advertisers: Advertiser[], isLoading: boolean, onRefresh: () => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", company_name: "", billing_email: "", website_url: "" });

  const createAdvertiser = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("advertisers").insert({
        name: data.name,
        company_name: data.company_name || null,
        billing_email: data.billing_email,
        website_url: data.website_url || null,
        status: "active",
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Advertiser created");
      setDialogOpen(false);
      setFormData({ name: "", company_name: "", billing_email: "", website_url: "" });
      onRefresh();
    },
    onError: () => toast.error("Failed to create advertiser"),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500/10 text-green-500">Active</Badge>;
      case "paused": return <Badge className="bg-yellow-500/10 text-yellow-500">Paused</Badge>;
      case "pending": return <Badge className="bg-blue-500/10 text-blue-500">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Advertisers</CardTitle>
            <CardDescription>Manage advertiser accounts</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Advertiser</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Advertiser</DialogTitle>
                <DialogDescription>Add a new advertiser account</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" value={formData.company_name} onChange={(e) => setFormData(f => ({ ...f, company_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Billing Email *</Label>
                  <Input id="email" type="email" value={formData.billing_email} onChange={(e) => setFormData(f => ({ ...f, billing_email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input id="website" value={formData.website_url} onChange={(e) => setFormData(f => ({ ...f, website_url: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => createAdvertiser.mutate(formData)} disabled={!formData.name || !formData.billing_email || createAdvertiser.isPending}>
                  {createAdvertiser.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : advertisers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No advertisers yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advertisers.map((advertiser) => (
                  <TableRow key={advertiser.id}>
                    <TableCell className="font-medium">{advertiser.name}</TableCell>
                    <TableCell>{advertiser.company_name || "—"}</TableCell>
                    <TableCell>{advertiser.billing_email}</TableCell>
                    <TableCell>{getStatusBadge(advertiser.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(advertiser.created_at), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Campaigns Tab with campaign type
function CampaignsTab({ campaigns, advertisers, isLoading, onRefresh }: { campaigns: Campaign[], advertisers: Advertiser[], isLoading: boolean, onRefresh: () => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    advertiser_id: "",
    campaign_type: "sponsored_post",
    objective: "clicks",
    bid_type: "cpm",
    bid_value_cents: 100,
    budget_cents: 10000,
    daily_cap_cents: 1000,
  });

  const createCampaign = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("campaigns").insert({
        name: data.name,
        advertiser_id: data.advertiser_id,
        campaign_type: data.campaign_type,
        objective: data.objective as "awareness" | "clicks" | "engagement",
        bid_type: data.bid_type as "cpm" | "cpc",
        bid_value_cents: data.bid_value_cents,
        budget_cents: data.budget_cents,
        daily_cap_cents: data.daily_cap_cents,
        status: "draft",
        payment_status: "unpaid",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign created");
      setDialogOpen(false);
      onRefresh();
    },
    onError: () => toast.error("Failed to create campaign"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase.from("campaigns").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign updated");
      onRefresh();
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500/10 text-green-500">Active</Badge>;
      case "paused": return <Badge className="bg-yellow-500/10 text-yellow-500">Paused</Badge>;
      case "draft": return <Badge variant="outline">Draft</Badge>;
      case "pending": return <Badge className="bg-blue-500/10 text-blue-500">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAdvertiserName = (id: string) => advertisers.find(a => a.id === id)?.name ?? "Unknown";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>Manage advertising campaigns</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={advertisers.length === 0}><Plus className="h-4 w-4 mr-2" /> Create Campaign</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Campaign</DialogTitle>
                <DialogDescription>Set up a new advertising campaign</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Campaign Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Advertiser *</Label>
                  <Select value={formData.advertiser_id} onValueChange={(v) => setFormData(f => ({ ...f, advertiser_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select advertiser" /></SelectTrigger>
                    <SelectContent>
                      {advertisers.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <Select value={formData.campaign_type} onValueChange={(v) => setFormData(f => ({ ...f, campaign_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sponsored_post">Sponsored Post</SelectItem>
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="loop_sponsorship">Loop Sponsorship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Objective</Label>
                    <Select value={formData.objective} onValueChange={(v) => setFormData(f => ({ ...f, objective: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awareness">Awareness</SelectItem>
                        <SelectItem value="clicks">Clicks</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bid Type</Label>
                    <Select value={formData.bid_type} onValueChange={(v) => setFormData(f => ({ ...f, bid_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpm">CPM</SelectItem>
                        <SelectItem value="cpc">CPC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bid (cents)</Label>
                    <Input type="number" value={formData.bid_value_cents} onChange={(e) => setFormData(f => ({ ...f, bid_value_cents: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget (cents)</Label>
                    <Input type="number" value={formData.budget_cents} onChange={(e) => setFormData(f => ({ ...f, budget_cents: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => createCampaign.mutate(formData)} disabled={!formData.name || !formData.advertiser_id || createCampaign.isPending}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No campaigns yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Advertiser</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell><Badge variant="outline">{campaign.campaign_type || "sponsored_post"}</Badge></TableCell>
                    <TableCell>{getAdvertiserName(campaign.advertiser_id)}</TableCell>
                    <TableCell>€{(campaign.budget_cents / 100).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>
                      <Badge variant={campaign.payment_status === "paid" ? "default" : "secondary"}>
                        {campaign.payment_status || "unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {campaign.status === "active" ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateStatus.mutate({ id: campaign.id, status: "paused" })}>
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateStatus.mutate({ id: campaign.id, status: "active" })}>
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Creatives Tab
function CreativesTab({ creatives, campaigns, isLoading, onRefresh }: { creatives: Creative[], campaigns: Campaign[], isLoading: boolean, onRefresh: () => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    campaign_id: "",
    headline: "",
    body: "",
    type: "image",
    image_url: "",
    video_url: "",
    click_url: "",
    display_url: "",
    call_to_action: "Learn More",
    advertiser_name: "",
  });

  const createCreative = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("creatives").insert({
        campaign_id: data.campaign_id,
        headline: data.headline,
        body: data.body || null,
        type: data.type as "image" | "video" | "text",
        image_url: data.image_url || null,
        video_url: data.video_url || null,
        click_url: data.click_url,
        display_url: data.display_url || null,
        call_to_action: data.call_to_action || null,
        advertiser_name: data.advertiser_name || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Creative created");
      setDialogOpen(false);
      onRefresh();
    },
    onError: () => toast.error("Failed to create creative"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase.from("creatives").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Creative updated");
      onRefresh();
    },
  });

  const getCampaignName = (id: string) => campaigns.find(c => c.id === id)?.name ?? "Unknown";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Creatives</CardTitle>
            <CardDescription>Manage ad creatives and approvals</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={campaigns.length === 0}><Plus className="h-4 w-4 mr-2" /> Add Creative</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Creative</DialogTitle>
                <DialogDescription>Add a new ad creative</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Campaign *</Label>
                  <Select value={formData.campaign_id} onValueChange={(v) => setFormData(f => ({ ...f, campaign_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                    <SelectContent>
                      {campaigns.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="text">Text Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Headline *</Label>
                  <Input value={formData.headline} onChange={(e) => setFormData(f => ({ ...f, headline: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Body Text</Label>
                  <Textarea value={formData.body} onChange={(e) => setFormData(f => ({ ...f, body: e.target.value }))} />
                </div>
                {formData.type === "image" && (
                  <div className="space-y-2">
                    <Label>Image URL</Label>
                    <Input value={formData.image_url} onChange={(e) => setFormData(f => ({ ...f, image_url: e.target.value }))} />
                  </div>
                )}
                {formData.type === "video" && (
                  <div className="space-y-2">
                    <Label>Video URL</Label>
                    <Input value={formData.video_url} onChange={(e) => setFormData(f => ({ ...f, video_url: e.target.value }))} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Click URL *</Label>
                  <Input value={formData.click_url} onChange={(e) => setFormData(f => ({ ...f, click_url: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Display URL</Label>
                    <Input value={formData.display_url} placeholder="example.com" onChange={(e) => setFormData(f => ({ ...f, display_url: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA Button</Label>
                    <Input value={formData.call_to_action} onChange={(e) => setFormData(f => ({ ...f, call_to_action: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Advertiser Name</Label>
                  <Input value={formData.advertiser_name} onChange={(e) => setFormData(f => ({ ...f, advertiser_name: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => createCreative.mutate(formData)} disabled={!formData.campaign_id || !formData.headline || !formData.click_url || createCreative.isPending}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : creatives.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No creatives yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Headline</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creatives.map((creative) => (
                  <TableRow key={creative.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{creative.headline}</TableCell>
                    <TableCell>{getCampaignName(creative.campaign_id)}</TableCell>
                    <TableCell><Badge variant="outline">{creative.type}</Badge></TableCell>
                    <TableCell>
                      <Badge className={creative.status === "active" ? "bg-green-500/10 text-green-500" : creative.status === "pending" ? "bg-yellow-500/10 text-yellow-500" : ""}>
                        {creative.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {creative.status === "pending" && (
                          <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: creative.id, status: "active" })}>
                            Approve
                          </Button>
                        )}
                        {creative.status === "active" && (
                          <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: creative.id, status: "paused" })}>
                            Pause
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Packages Tab
function PackagesTab({ packages }: { packages: AdPackage[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_cents: 10000,
    currency: "EUR",
    duration_days: 7,
    includes_sponsored_posts: 1,
    includes_banners: 0,
    includes_loop_sponsorship: false,
    includes_reporting: true,
    is_exclusive: false,
  });

  const createPackage = useCreateAdPackage();
  const updatePackage = useUpdateAdPackage();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Advertising Packages</CardTitle>
            <CardDescription>Configure pricing presets for advertisers</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Package</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Package</DialogTitle>
                <DialogDescription>Define a new ad package</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Package Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price (cents)</Label>
                    <Input type="number" value={formData.price_cents} onChange={(e) => setFormData(f => ({ ...f, price_cents: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (days)</Label>
                    <Input type="number" value={formData.duration_days} onChange={(e) => setFormData(f => ({ ...f, duration_days: parseInt(e.target.value) || 7 }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sponsored Posts</Label>
                    <Input type="number" value={formData.includes_sponsored_posts} onChange={(e) => setFormData(f => ({ ...f, includes_sponsored_posts: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Banners</Label>
                    <Input type="number" value={formData.includes_banners} onChange={(e) => setFormData(f => ({ ...f, includes_banners: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.includes_loop_sponsorship} onCheckedChange={(c) => setFormData(f => ({ ...f, includes_loop_sponsorship: c }))} />
                    <Label>Loop Sponsorship</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.is_exclusive} onCheckedChange={(c) => setFormData(f => ({ ...f, is_exclusive: c }))} />
                    <Label>Exclusive</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => {
                    createPackage.mutate(formData);
                    setDialogOpen(false);
                  }} 
                  disabled={!formData.name || createPackage.isPending}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {packages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No packages yet</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {packages.map((pkg) => (
              <Card key={pkg.id} className={!pkg.is_active ? "opacity-50" : pkg.is_exclusive ? "border-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                    <div className="flex gap-1">
                      {pkg.is_exclusive && <Badge className="bg-primary">Exclusive</Badge>}
                      {!pkg.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    €{(pkg.price_cents / 100).toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground">/{pkg.duration_days}d</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {pkg.includes_sponsored_posts > 0 && <li>• {pkg.includes_sponsored_posts} Sponsored Posts</li>}
                    {pkg.includes_banners > 0 && <li>• {pkg.includes_banners} Banners</li>}
                    {pkg.includes_loop_sponsorship && <li>• Loop Sponsorship</li>}
                    {pkg.includes_reporting && <li>• Reporting</li>}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => updatePackage.mutate({ id: pkg.id, is_active: !pkg.is_active })}
                  >
                    {pkg.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Payments Tab
function PaymentsTab({ payments, advertisers, campaigns }: { payments: AdPayment[], advertisers: Advertiser[], campaigns: Campaign[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    advertiser_id: "",
    campaign_id: "",
    gross_amount_cents: 10000,
    currency: "EUR",
    payment_method: "manual",
    notes: "",
  });

  const createPayment = useCreateAdPayment();
  const updateStatus = useUpdatePaymentStatus();

  const getAdvertiserName = (id: string) => advertisers.find(a => a.id === id)?.name ?? "Unknown";
  const getCampaignName = (id: string) => campaigns.find(c => c.id === id)?.name;

  const totalGross = payments.reduce((sum, p) => sum + p.gross_amount_cents, 0);
  const totalFee = payments.reduce((sum, p) => sum + p.platform_fee_cents, 0);
  const totalNet = payments.reduce((sum, p) => sum + p.net_amount_cents, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ad Payments</CardTitle>
            <CardDescription>
              Track payments with 30% platform fee. 
              Totals: Gross €{(totalGross/100).toFixed(2)} | Fee €{(totalFee/100).toFixed(2)} | Net €{(totalNet/100).toFixed(2)}
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Record Payment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>Log an ad payment (30% platform fee auto-applied)</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Advertiser *</Label>
                  <Select value={formData.advertiser_id} onValueChange={(v) => setFormData(f => ({ ...f, advertiser_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select advertiser" /></SelectTrigger>
                    <SelectContent>
                      {advertisers.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Campaign</Label>
                  <Select value={formData.campaign_id} onValueChange={(v) => setFormData(f => ({ ...f, campaign_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select campaign (optional)" /></SelectTrigger>
                    <SelectContent>
                      {campaigns.filter(c => c.advertiser_id === formData.advertiser_id).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gross Amount (cents)</Label>
                  <Input type="number" value={formData.gross_amount_cents} onChange={(e) => setFormData(f => ({ ...f, gross_amount_cents: parseInt(e.target.value) || 0 }))} />
                  <p className="text-xs text-muted-foreground">
                    Platform fee (30%): €{((formData.gross_amount_cents * 0.30) / 100).toFixed(2)} | 
                    Net: €{((formData.gross_amount_cents * 0.70) / 100).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={formData.notes} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => {
                    createPayment.mutate(formData);
                    setDialogOpen(false);
                  }} 
                  disabled={!formData.advertiser_id || createPayment.isPending}
                >
                  Record
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No payments recorded</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Advertiser</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Fee (30%)</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>{getAdvertiserName(p.advertiser_id)}</TableCell>
                    <TableCell>{p.campaign_id ? getCampaignName(p.campaign_id) : "—"}</TableCell>
                    <TableCell>€{(p.gross_amount_cents / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-primary font-medium">€{(p.platform_fee_cents / 100).toFixed(2)}</TableCell>
                    <TableCell>€{(p.net_amount_cents / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "paid" ? "default" : p.status === "pending" ? "secondary" : "destructive"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.status === "pending" && (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: p.id, status: "paid" })}>
                          Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Sponsorships Tab
function SponsorshipsTab({ sponsorships, advertisers, campaigns, communities }: { 
  sponsorships: LoopSponsorship[], 
  advertisers: Advertiser[], 
  campaigns: Campaign[],
  communities: Community[]
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    community_id: "",
    advertiser_id: "",
    campaign_id: "",
    label_text: "Sponsored by",
    sponsor_name: "",
    sponsor_logo_url: "",
  });

  const createSponsorship = useCreateLoopSponsorship();
  const updateSponsorship = useUpdateLoopSponsorship();

  const getAdvertiserName = (id: string) => advertisers.find(a => a.id === id)?.name ?? "Unknown";
  const getCommunityName = (id: string) => communities.find(c => c.id === id)?.name ?? "Unknown";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Loop Sponsorships</CardTitle>
            <CardDescription>Assign sponsors to communities/loops</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Sponsorship</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Loop Sponsorship</DialogTitle>
                <DialogDescription>Assign a sponsor to a community</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Community *</Label>
                  <Select value={formData.community_id} onValueChange={(v) => setFormData(f => ({ ...f, community_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select community" /></SelectTrigger>
                    <SelectContent>
                      {communities.map(c => <SelectItem key={c.id} value={c.id}>w/{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Advertiser *</Label>
                  <Select value={formData.advertiser_id} onValueChange={(v) => setFormData(f => ({ ...f, advertiser_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select advertiser" /></SelectTrigger>
                    <SelectContent>
                      {advertisers.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Campaign (optional)</Label>
                  <Select value={formData.campaign_id} onValueChange={(v) => setFormData(f => ({ ...f, campaign_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                    <SelectContent>
                      {campaigns.filter(c => c.advertiser_id === formData.advertiser_id && c.campaign_type === "loop_sponsorship").map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sponsor Label</Label>
                  <Input value={formData.label_text} onChange={(e) => setFormData(f => ({ ...f, label_text: e.target.value }))} placeholder="Sponsored by" />
                </div>
                <div className="space-y-2">
                  <Label>Sponsor Name</Label>
                  <Input value={formData.sponsor_name} onChange={(e) => setFormData(f => ({ ...f, sponsor_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Sponsor Logo URL</Label>
                  <Input value={formData.sponsor_logo_url} onChange={(e) => setFormData(f => ({ ...f, sponsor_logo_url: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => {
                    createSponsorship.mutate(formData);
                    setDialogOpen(false);
                  }} 
                  disabled={!formData.community_id || !formData.advertiser_id || createSponsorship.isPending}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sponsorships.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No loop sponsorships yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Community</TableHead>
                  <TableHead>Advertiser</TableHead>
                  <TableHead>Sponsor Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsorships.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">w/{getCommunityName(s.community_id)}</TableCell>
                    <TableCell>{getAdvertiserName(s.advertiser_id)}</TableCell>
                    <TableCell>{s.sponsor_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {s.status !== "active" && (
                          <Button variant="ghost" size="sm" onClick={() => updateSponsorship.mutate({ id: s.id, status: "active" })}>
                            Activate
                          </Button>
                        )}
                        {s.status === "active" && (
                          <Button variant="ghost" size="sm" onClick={() => updateSponsorship.mutate({ id: s.id, status: "paused" })}>
                            Pause
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminAds;
