import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Inbox, Clock, CheckCircle, XCircle, AlertTriangle, Eye, MessageSquare, Lock, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useIsModerator } from "@/hooks/useUserRoles";
import {
  useSubmissions,
  useUpdateSubmission,
  useSubmissionResponses,
  useCreateResponse,
  useSubmissionStats,
  AnonymousSubmission,
  SUBMISSION_CATEGORIES,
} from "@/hooks/useAnonymousSubmissions";
import { formatDistanceToNow, format } from "date-fns";

const AdminSubmissions = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isModerator, isLoading: rolesLoading } = useIsModerator();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedSubmission, setSelectedSubmission] = useState<AnonymousSubmission | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: submissions, isLoading } = useSubmissions(statusFilter);
  const { data: stats } = useSubmissionStats();

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
            You don't have permission to view submissions.
          </p>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </main>
      </div>
    );
  }

  const filteredSubmissions = submissions?.filter(s =>
    s.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-6xl mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <Inbox className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Anonymous Submissions</h1>
            <p className="text-muted-foreground">Review and respond to whistleblower tips</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-3xl text-orange-500">{stats?.pending || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Reviewing</CardDescription>
              <CardTitle className="text-3xl text-blue-500">{stats?.reviewing || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Resolved</CardDescription>
              <CardTitle className="text-3xl text-green-500">{stats?.resolved || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Dismissed</CardDescription>
              <CardTitle className="text-3xl text-muted-foreground">{stats?.dismissed || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Urgent</CardDescription>
              <CardTitle className="text-3xl text-destructive">{stats?.urgent || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search submissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Submissions</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Submissions List */}
        <Card>
          <CardHeader>
            <CardTitle>Submissions ({filteredSubmissions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No submissions found</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filteredSubmissions.map((submission) => (
                    <SubmissionCard
                      key={submission.id}
                      submission={submission}
                      onClick={() => setSelectedSubmission(submission)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <SubmissionDetailDialog
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      </main>
    </div>
  );
};

const SubmissionCard = ({
  submission,
  onClick,
}: {
  submission: AnonymousSubmission;
  onClick: () => void;
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="default" className="bg-orange-500">Pending</Badge>;
      case 'reviewing': return <Badge variant="default" className="bg-blue-500">Reviewing</Badge>;
      case 'resolved': return <Badge variant="secondary">Resolved</Badge>;
      case 'dismissed': return <Badge variant="outline">Dismissed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge variant="destructive">Urgent</Badge>;
      case 'high': return <Badge variant="default" className="bg-orange-500">High</Badge>;
      case 'normal': return null;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return null;
    }
  };

  const categoryLabel = SUBMISSION_CATEGORIES.find(c => c.value === submission.category)?.label || submission.category;

  return (
    <div
      onClick={onClick}
      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {getStatusBadge(submission.status)}
            {getPriorityBadge(submission.priority)}
            <Badge variant="outline">{categoryLabel}</Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
            </span>
          </div>
          <h4 className="font-medium mb-1 line-clamp-1">{submission.subject}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2">{submission.content}</p>
          {submission.reviewer && (
            <p className="text-xs text-muted-foreground mt-2">
              Reviewed by: {submission.reviewer.display_name || submission.reviewer.username}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const SubmissionDetailDialog = ({
  submission,
  onClose,
}: {
  submission: AnonymousSubmission | null;
  onClose: () => void;
}) => {
  const [responseContent, setResponseContent] = useState("");
  const [isInternal, setIsInternal] = useState(true);
  const updateSubmission = useUpdateSubmission();
  const createResponse = useCreateResponse();
  const { data: responses } = useSubmissionResponses(submission?.id || "");

  if (!submission) return null;

  const categoryLabel = SUBMISSION_CATEGORIES.find(c => c.value === submission.category)?.label || submission.category;

  const handleStatusChange = (status: string) => {
    updateSubmission.mutate({ submissionId: submission.id, status });
  };

  const handlePriorityChange = (priority: string) => {
    updateSubmission.mutate({ submissionId: submission.id, priority });
  };

  const handleAddResponse = () => {
    if (!responseContent.trim()) return;
    createResponse.mutate({
      submissionId: submission.id,
      content: responseContent,
      isInternal,
    });
    setResponseContent("");
  };

  return (
    <Dialog open={!!submission} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{submission.subject}</DialogTitle>
          <DialogDescription>
            Submitted {format(new Date(submission.created_at), 'PPpp')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Select
              value={submission.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={submission.priority}
              onValueChange={handlePriorityChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Badge variant="outline">{categoryLabel}</Badge>
          </div>

          <Separator />

          {/* Content */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Submission Content</Label>
            <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
              {submission.content}
            </div>
          </div>

          {submission.file_urls && submission.file_urls.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Attachments</Label>
              <div className="flex flex-wrap gap-2">
                {submission.file_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <Badge variant="outline">Attachment {i + 1}</Badge>
                  </a>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Responses */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Responses ({responses?.length || 0})
            </Label>

            {responses && responses.length > 0 && (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {responses.map((response) => (
                    <div
                      key={response.id}
                      className={`p-3 rounded-lg text-sm ${
                        response.is_internal ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {response.responder?.display_name || response.responder?.username || 'Unknown'}
                        </span>
                        {response.is_internal && (
                          <Badge variant="outline" className="text-xs">Internal</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(response.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{response.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Add Response */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add a response or internal note..."
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
                rows={3}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded"
                  />
                  Internal note (not visible to submitter)
                </label>
                <Button
                  onClick={handleAddResponse}
                  disabled={!responseContent.trim() || createResponse.isPending}
                  size="sm"
                >
                  Add Response
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminSubmissions;
