import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Flag, MessageSquare, FileText, Clock, CheckCircle, XCircle, Trash2, Eye, Ban, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useIsModerator } from "@/hooks/useUserRoles";
import { useReports, useUpdateReportStatus, useDeleteReportedContent, Report } from "@/hooks/useReports";
import { useRemovedContent, useApprovePost, useApproveComment } from "@/hooks/useModQueue";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

const ModQueue = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isModerator, isLoading: rolesLoading } = useIsModerator();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("reports");
  const [reportFilter, setReportFilter] = useState<string>("pending");

  const { data: reports, isLoading: reportsLoading } = useReports(reportFilter === "all" ? undefined : reportFilter);
  const { data: removedContent, isLoading: removedLoading } = useRemovedContent();

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
            You don't have permission to access the mod queue.
          </p>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </main>
      </div>
    );
  }

  const pendingReports = reports?.filter(r => r.status === 'pending') || [];

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-6xl mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to feed
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Mod Queue</h1>
            <p className="text-muted-foreground">Review and manage flagged content</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Reports</CardDescription>
              <CardTitle className="text-3xl text-orange-500">{pendingReports.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Removed Posts</CardDescription>
              <CardTitle className="text-3xl text-destructive">{removedContent?.posts?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Removed Comments</CardDescription>
              <CardTitle className="text-3xl text-destructive">{removedContent?.comments?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="reports" className="gap-2">
              <Flag className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="removed" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Removed Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Reports</CardTitle>
                  <CardDescription>Content reported by community members</CardDescription>
                </div>
                <Select value={reportFilter} onValueChange={setReportFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <ReportsList reports={reports || []} loading={reportsLoading} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="removed">
            <RemovedContentSection 
              removedContent={removedContent} 
              loading={removedLoading} 
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const ReportsList = ({ reports, loading }: { reports: Report[]; loading: boolean }) => {
  const updateStatus = useUpdateReportStatus();
  const deleteContent = useDeleteReportedContent();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading reports...</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No reports to review</p>
      </div>
    );
  }

  const handleAction = (reportId: string, status: 'resolved' | 'dismissed') => {
    updateStatus.mutate({ reportId, status });
  };

  const handleDelete = () => {
    if (!selectedReport) return;
    deleteContent.mutate({
      contentType: selectedReport.content_type,
      postId: selectedReport.post_id,
      commentId: selectedReport.comment_id,
      reportId: selectedReport.id
    });
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <ScrollArea className="h-[500px]">
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
                    <Badge variant="outline" className="gap-1">
                      {report.content_type === 'post' ? <FileText className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                      {report.content_type}
                    </Badge>
                    <Badge variant="destructive">{report.reason}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="bg-muted/50 rounded p-3 mb-2">
                    <p className="text-sm font-medium mb-1">Reported content:</p>
                    <p className="text-sm text-foreground line-clamp-3">
                      {report.post?.title || report.comment?.content || 'Content unavailable'}
                    </p>
                    {report.post_id && (
                      <Link
                        to={`/post/${report.post_id}`}
                        className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View {report.content_type}
                      </Link>
                    )}
                  </div>

                  {report.details && (
                    <p className="text-xs text-muted-foreground mb-2 italic">
                      "{report.details}"
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Reported by: {report.reporter?.display_name || report.reporter?.username || 'Unknown'}
                  </p>
                </div>

                {report.status === 'pending' && (
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedReport(report);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={deleteContent.isPending || (!report.post && !report.comment)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedReport?.content_type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the reported content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const RemovedContentSection = ({ 
  removedContent, 
  loading 
}: { 
  removedContent: { posts: any[]; comments: any[] } | undefined; 
  loading: boolean;
}) => {
  const approvePost = useApprovePost();
  const approveComment = useApproveComment();

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  const posts = removedContent?.posts || [];
  const comments = removedContent?.comments || [];

  if (posts.length === 0 && comments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No removed content</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {posts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Removed Posts ({posts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{post.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {post.content || 'No content'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>r/{post.community}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(post.removed_at), { addSuffix: true })}</span>
                        </div>
                        {post.removal_reason && (
                          <p className="text-xs text-destructive mt-1">
                            Reason: {post.removal_reason}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approvePost.mutate({ postId: post.id, communityName: post.community })}
                          disabled={approvePost.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                        <Link to={`/post/${post.id}`}>
                          <Button size="sm" variant="ghost" className="w-full">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Removed Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm line-clamp-3 mb-2">{comment.content}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDistanceToNow(new Date(comment.removed_at), { addSuffix: true })}</span>
                        </div>
                        {comment.removal_reason && (
                          <p className="text-xs text-destructive mt-1">
                            Reason: {comment.removal_reason}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveComment.mutate({ commentId: comment.id, communityName: '' })}
                        disabled={approveComment.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ModQueue;
