import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, FileText, MessageSquare, Clock, Lock, Flag, Eye, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useIsModerator } from "@/hooks/useUserRoles";
import { useModerationLogs, useModerationStats } from "@/hooks/useModerationLogs";
import { useReports, useUpdateReportStatus, Report } from "@/hooks/useReports";
import { formatDistanceToNow } from "date-fns";

const Moderation = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isModerator, isLoading: rolesLoading } = useIsModerator();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("reports");
  
  const { data: logs, isLoading: logsLoading } = useModerationLogs(100);
  const { data: stats } = useModerationStats();
  const { data: reports, isLoading: reportsLoading } = useReports();

  if (authLoading || rolesLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!isModerator) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setIsMobileNavOpen(true)} />
        <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
        <main className="container max-w-2xl mx-auto px-4 py-16 text-center">
          <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access the moderation dashboard.
            This area is restricted to administrators and moderators.
          </p>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </main>
      </div>
    );
  }

  const flaggedLogs = logs?.filter(l => !l.allowed) || [];
  const allowedLogs = logs?.filter(l => l.allowed) || [];
  const pendingReports = reports?.filter(r => r.status === 'pending') || [];

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-6xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to feed
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Moderation Dashboard</h1>
            <p className="text-muted-foreground">Review reports and AI moderation activity</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Reports</CardDescription>
              <CardTitle className="text-3xl text-orange-500">{pendingReports.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>AI Flagged</CardDescription>
              <CardTitle className="text-3xl text-destructive">{stats?.flagged || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Scans</CardDescription>
              <CardTitle className="text-3xl">{stats?.total || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Flag Rate</CardDescription>
              <CardTitle className="text-3xl">{stats?.flagRate || 0}%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="reports" className="gap-2">
              <Flag className="h-4 w-4" />
              User Reports ({reports?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Shield className="h-4 w-4" />
              AI Moderation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>User Reports</CardTitle>
                <CardDescription>Content reported by community members</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="pending">
                  <TabsList className="mb-4">
                    <TabsTrigger value="pending">Pending ({pendingReports.length})</TabsTrigger>
                    <TabsTrigger value="all">All ({reports?.length || 0})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="pending">
                    <ReportsList reports={pendingReports} loading={reportsLoading} />
                  </TabsContent>
                  <TabsContent value="all">
                    <ReportsList reports={reports || []} loading={reportsLoading} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Posts Scanned</p>
                      <p className="text-2xl font-bold">{stats?.posts || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Comments Scanned</p>
                      <p className="text-2xl font-bold">{stats?.comments || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>AI Moderation Logs</CardTitle>
                <CardDescription>Automatic content moderation activity</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="flagged">
                  <TabsList className="mb-4">
                    <TabsTrigger value="flagged">Flagged ({flaggedLogs.length})</TabsTrigger>
                    <TabsTrigger value="all">All ({logs?.length || 0})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="flagged">
                    <ModerationLogsList logs={flaggedLogs} loading={logsLoading} />
                  </TabsContent>
                  <TabsContent value="all">
                    <ModerationLogsList logs={logs || []} loading={logsLoading} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const ReportsList = ({ reports, loading }: { reports: Report[]; loading: boolean }) => {
  const updateStatus = useUpdateReportStatus();

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading reports...</div>;
  }

  if (reports.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No reports found</div>;
  }

  const handleAction = (reportId: string, status: 'resolved' | 'dismissed') => {
    updateStatus.mutate({ reportId, status });
  };

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant={
                    report.status === 'pending' ? 'default' :
                    report.status === 'resolved' ? 'secondary' : 'outline'
                  }>
                    {report.status}
                  </Badge>
                  <Badge variant="outline">{report.content_type}</Badge>
                  <Badge variant="destructive">{report.reason}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="bg-muted/50 rounded p-2 mb-2">
                  <p className="text-sm font-medium mb-1">Reported content:</p>
                  <p className="text-sm text-foreground line-clamp-3">
                    {report.post?.title || report.comment?.content || 'Content unavailable'}
                  </p>
                  {report.post_id && (
                    <Link 
                      to={`/post/${report.post_id}`}
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      View {report.content_type} →
                    </Link>
                  )}
                </div>
                
                {report.details && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Additional details: {report.details}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Reported by: {report.reporter?.display_name || report.reporter?.username || 'Unknown'}
                </p>
              </div>

              {report.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(report.id, 'resolved')}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAction(report.id, 'dismissed')}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

const ModerationLogsList = ({ logs, loading }: { logs: any[]; loading: boolean }) => {
  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading logs...</div>;
  }

  if (logs.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No moderation logs found</div>;
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={log.allowed ? "secondary" : "destructive"}>
                    {log.allowed ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Allowed</>
                    ) : (
                      <><AlertTriangle className="h-3 w-3 mr-1" /> Flagged</>
                    )}
                  </Badge>
                  <Badge variant="outline">{log.content_type}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground line-clamp-2 mb-1">
                  {log.content_text}
                </p>
                {log.reason && (
                  <p className="text-xs text-destructive mt-1">
                    Reason: {log.reason}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  By: {log.profile?.display_name || log.profile?.username || 'Unknown user'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default Moderation;
