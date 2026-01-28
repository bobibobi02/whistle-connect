import { useState } from "react";
import { Link } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { useAnalyticsDashboard } from "@/hooks/useAnalyticsEvents";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  ArrowLeft,
  Loader2,
  Users,
  TrendingUp,
  MessageSquare,
  Flag,
  Sparkles,
  MousePointer,
  Eye,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function AdminAnalytics() {
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [days, setDays] = useState(30);

  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsDashboard(days);

  if (roleLoading || analyticsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setIsMobileNavOpen(true)} />
        <main className="container max-w-2xl mx-auto px-4 py-8 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </main>
        <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
      </div>
    );
  }

  const stats = [
    { label: "Total Events", value: analytics?.totalEvents || 0, icon: TrendingUp },
    { label: "Unique Users", value: analytics?.uniqueUsers || 0, icon: Users },
    { label: "Sessions", value: analytics?.uniqueSessions || 0, icon: Eye },
    { label: "Signups", value: analytics?.signups || 0, icon: Users },
    { label: "First Posts", value: analytics?.firstPosts || 0, icon: MessageSquare },
    { label: "Reports", value: analytics?.reportsCreated || 0, icon: Flag },
    { label: "Boost Clicks", value: analytics?.boostClicks || 0, icon: Sparkles },
    { label: "Ad Clicks", value: analytics?.adClicks || 0, icon: MousePointer },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <main className="container max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Track user engagement and platform metrics
            </p>
          </div>
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <TabsList>
              <TabsTrigger value="7">7 days</TabsTrigger>
              <TabsTrigger value="30">30 days</TabsTrigger>
              <TabsTrigger value="90">90 days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Daily Active Users */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Active Users</CardTitle>
              <CardDescription>Unique users per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.dailyMetrics || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="activeUsers"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.2)"
                      name="Active Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Events per Day */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Events</CardTitle>
              <CardDescription>Total events tracked per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.dailyMetrics || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="events" fill="hsl(var(--primary))" name="Events" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Breakdown */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Event Breakdown</CardTitle>
            <CardDescription>Count by event type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(analytics?.eventCounts || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([name, count]) => (
                  <div key={name} className="p-3 rounded-lg bg-muted/50">
                    <p className="text-lg font-semibold">{count}</p>
                    <p className="text-xs text-muted-foreground truncate">{name}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </main>
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
    </div>
  );
}
