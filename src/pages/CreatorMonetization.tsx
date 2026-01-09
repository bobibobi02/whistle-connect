import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, TrendingUp, Eye, MousePointer, CreditCard, AlertCircle, CheckCircle, Clock, BarChart3 } from "lucide-react";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useCreatorMonetization, useCreatorEarnings, usePayoutHistory, useToggleMonetization, useRequestPayout } from "@/hooks/useAds";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

const CreatorMonetization = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: monetization, isLoading: monetizationLoading } = useCreatorMonetization();
  const { data: earnings, isLoading: earningsLoading } = useCreatorEarnings();
  const { data: payouts, isLoading: payoutsLoading } = usePayoutHistory();
  const toggleMonetization = useToggleMonetization();
  const requestPayout = useRequestPayout();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setIsMobileNavOpen(true)} />
        <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
        <main className="container max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Please sign in to access monetization settings</p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </div>
        </main>
      </div>
    );
  }

  const isEnabled = monetization?.enabled ?? false;
  const eligibilityStatus = monetization?.eligibility_status ?? "pending";
  const totalEarnings = (monetization?.total_earnings_cents ?? 0) / 100;
  const pendingPayout = (monetization?.pending_payout_cents ?? 0) / 100;
  const creatorShare = monetization?.creator_share_percent ?? 55;
  const minPayout = (monetization?.min_payout_cents ?? 10000) / 100; // $100 default

  // Calculate this month and last month earnings
  const thisMonthEarnings = earnings?.find(e => {
    const now = new Date();
    const start = new Date(e.period_start);
    return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
  });
  const lastMonthEarnings = earnings?.find(e => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const start = new Date(e.period_start);
    return start.getMonth() === lastMonth.getMonth() && start.getFullYear() === lastMonth.getFullYear();
  });

  const thisMonthCents = thisMonthEarnings?.estimated_cents ?? 0;
  const lastMonthCents = lastMonthEarnings?.finalized_cents ?? 0;
  const thisMonthImpressions = thisMonthEarnings?.impressions ?? 0;
  const thisMonthClicks = thisMonthEarnings?.clicks ?? 0;

  // Calculate RPM (Revenue per 1000 impressions)
  const rpm = thisMonthImpressions > 0 
    ? ((thisMonthCents / 100) / thisMonthImpressions * 1000).toFixed(2)
    : "0.00";

  const handleToggleMonetization = () => {
    toggleMonetization.mutate(!isEnabled, {
      onSuccess: () => {
        toast.success(isEnabled ? "Monetization disabled" : "Monetization enabled");
      },
      onError: () => {
        toast.error("Failed to update monetization settings");
      }
    });
  };

  const handleRequestPayout = () => {
    if (pendingPayout < minPayout) {
      toast.error(`Minimum payout is $${minPayout}`);
      return;
    }
    
    requestPayout.mutate(Math.floor(pendingPayout * 100), {
      onSuccess: () => {
        toast.success("Payout requested successfully");
        setPayoutDialogOpen(false);
      },
      onError: () => {
        toast.error("Failed to request payout");
      }
    });
  };

  const getEligibilityBadge = (status: string) => {
    switch (status) {
      case "eligible":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" /> Eligible</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" /> Pending Review</Badge>;
      case "ineligible":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><AlertCircle className="h-3 w-3 mr-1" /> Not Eligible</Badge>;
      case "suspended":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500">Completed</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/10 text-blue-500">Processing</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLoading = monetizationLoading || earningsLoading || payoutsLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-4xl mx-auto px-4 py-6 pb-24">
        <Link to="/settings" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Settings</span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Creator Monetization</h1>
            <p className="text-muted-foreground">Earn money from ads displayed on your content</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading monetization data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Monetization Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Monetization Status</span>
                  {getEligibilityBadge(eligibilityStatus)}
                </CardTitle>
                <CardDescription>
                  Enable monetization to earn revenue from ads displayed alongside your content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="monetization-toggle" className="font-medium">
                      {isEnabled ? "Monetization Enabled" : "Monetization Disabled"}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {isEnabled 
                        ? "You're earning from ads on your content" 
                        : "Enable to start earning from your content"}
                    </p>
                  </div>
                  <Switch
                    id="monetization-toggle"
                    checked={isEnabled}
                    onCheckedChange={handleToggleMonetization}
                    disabled={toggleMonetization.isPending || eligibilityStatus === "suspended"}
                  />
                </div>

                {eligibilityStatus === "pending" && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Your account is under review. This typically takes 24-48 hours after meeting the requirements.
                    </p>
                  </div>
                )}

                {eligibilityStatus === "ineligible" && monetization?.eligibility_reason && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {monetization.eligibility_reason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>This Month (Est.)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(thisMonthCents / 100).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {lastMonthCents > 0 && (
                      <span className={thisMonthCents > lastMonthCents ? "text-green-500" : "text-red-500"}>
                        {thisMonthCents > lastMonthCents ? "↑" : "↓"} vs last month
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Last Month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(lastMonthCents / 100).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Finalized</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Available for Payout</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">${pendingPayout.toFixed(2)}</div>
                  <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="mt-2 w-full"
                        disabled={pendingPayout < minPayout}
                      >
                        Request Payout
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Payout</DialogTitle>
                        <DialogDescription>
                          You're about to request a payout of ${pendingPayout.toFixed(2)}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                          Payouts are processed within 3-5 business days. Funds will be sent to your configured payout method.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleRequestPayout} disabled={requestPayout.isPending}>
                          {requestPayout.isPending ? "Processing..." : "Confirm Payout"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  {pendingPayout < minPayout && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Min: ${minPayout}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  This Month's Analytics
                </CardTitle>
                <CardDescription>
                  Performance metrics for the current billing period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Impressions</span>
                    </div>
                    <div className="text-2xl font-bold">{thisMonthImpressions.toLocaleString()}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MousePointer className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Clicks</span>
                    </div>
                    <div className="text-2xl font-bold">{thisMonthClicks.toLocaleString()}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">RPM</span>
                    </div>
                    <div className="text-2xl font-bold">${rpm}</div>
                    <p className="text-xs text-muted-foreground">Per 1,000 impressions</p>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Your Revenue Share</span>
                    <span className="font-medium">{creatorShare}%</span>
                  </div>
                  <Progress value={creatorShare} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    You receive {creatorShare}% of ad revenue generated from your content
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payout History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payout History
                </CardTitle>
                <CardDescription>
                  Track your past and pending payouts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payouts && payouts.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.map((payout) => (
                          <TableRow key={payout.id}>
                            <TableCell>
                              {format(new Date(payout.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="font-medium">
                              ${(payout.amount_cents / 100).toFixed(2)} {payout.currency.toUpperCase()}
                            </TableCell>
                            <TableCell>
                              {getPayoutStatusBadge(payout.status)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {payout.provider || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No payouts yet</p>
                    <p className="text-sm">Request your first payout when you reach ${minPayout}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default CreatorMonetization;
