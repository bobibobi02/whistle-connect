import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Megaphone, Building2, BarChart3, Target, Image, Plus, Edit, Trash2, Eye, Play, Pause, DollarSign } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

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
  bid_type: string;
  bid_value_cents: number;
  budget_cents: number;
  spent_cents: number;
  daily_cap_cents: number | null;
  start_at: string | null;
  end_at: string | null;
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

interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  advertiser_name: string | null;
  status: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  spent_cents: number | null;
  budget_cents: number | null;
}

const AdminAds = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("advertisers");
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

  const { data: performance, isLoading: performanceLoading } = useQuery({
    queryKey: ["admin-campaign-performance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaign_performance").select("*");
      if (error) throw error;
      return data as CampaignPerformance[];
    },
    enabled: isAdmin,
  });

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

  // Calculate totals
  const totalSpent = campaigns?.reduce((sum, c) => sum + c.spent_cents, 0) ?? 0;
  const totalBudget = campaigns?.reduce((sum, c) => sum + c.budget_cents, 0) ?? 0;
  const totalImpressions = performance?.reduce((sum, p) => sum + (p.impressions ?? 0), 0) ?? 0;
  const totalClicks = performance?.reduce((sum, p) => sum + (p.clicks ?? 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-6xl mx-auto px-4 py-6 pb-24">
        <Link to="/admin" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Admin</span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Megaphone className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Ad Management</h1>
            <p className="text-muted-foreground">Manage advertisers, campaigns, creatives, and view performance</p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(totalSpent / 100).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">of ${(totalBudget / 100).toLocaleString()} budget</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Impressions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Clicks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average CTR</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00"}%
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="advertisers" className="gap-2">
              <Building2 className="h-4 w-4" />
              Advertisers ({advertisers?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Target className="h-4 w-4" />
              Campaigns ({campaigns?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="creatives" className="gap-2">
              <Image className="h-4 w-4" />
              Creatives ({creatives?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="performance">
            <PerformanceTab 
              performance={performance ?? []} 
              isLoading={performanceLoading} 
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Advertisers Tab Component
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

// Campaigns Tab Component
function CampaignsTab({ campaigns, advertisers, isLoading, onRefresh }: { campaigns: Campaign[], advertisers: Advertiser[], isLoading: boolean, onRefresh: () => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    advertiser_id: "",
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
        objective: data.objective as "awareness" | "clicks" | "engagement",
        bid_type: data.bid_type as "cpm" | "cpc",
        bid_value_cents: data.bid_value_cents,
        budget_cents: data.budget_cents,
        daily_cap_cents: data.daily_cap_cents,
        status: "draft",
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
      case "completed": return <Badge className="bg-blue-500/10 text-blue-500">Completed</Badge>;
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
                  <TableHead>Advertiser</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{getAdvertiserName(campaign.advertiser_id)}</TableCell>
                    <TableCell>${(campaign.budget_cents / 100).toFixed(2)}</TableCell>
                    <TableCell>${(campaign.spent_cents / 100).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
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

// Creatives Tab Component
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

  const getCampaignName = (id: string) => campaigns.find(c => c.id === id)?.name ?? "Unknown";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Creatives</CardTitle>
            <CardDescription>Manage ad creatives and media</CardDescription>
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
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creatives.map((creative) => (
                  <TableRow key={creative.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{creative.headline}</TableCell>
                    <TableCell>{getCampaignName(creative.campaign_id)}</TableCell>
                    <TableCell><Badge variant="outline">{creative.type}</Badge></TableCell>
                    <TableCell>
                      <Badge className={creative.status === "active" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}>
                        {creative.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(creative.created_at), "MMM d, yyyy")}</TableCell>
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

// Performance Tab Component
function PerformanceTab({ performance, isLoading }: { performance: CampaignPerformance[], isLoading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Performance</CardTitle>
        <CardDescription>View detailed analytics for all campaigns</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : performance.length === 0 ? (
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
                  <TableHead>Advertiser</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Budget</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.map((p) => (
                  <TableRow key={p.campaign_id}>
                    <TableCell className="font-medium">{p.campaign_name}</TableCell>
                    <TableCell>{p.advertiser_name || "—"}</TableCell>
                    <TableCell>{(p.impressions ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{(p.clicks ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{(p.ctr ?? 0).toFixed(2)}%</TableCell>
                    <TableCell>${((p.spent_cents ?? 0) / 100).toFixed(2)}</TableCell>
                    <TableCell>${((p.budget_cents ?? 0) / 100).toFixed(2)}</TableCell>
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
