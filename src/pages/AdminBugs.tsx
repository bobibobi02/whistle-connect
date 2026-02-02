import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useIsModerator } from "@/hooks/useUserRoles";
import PageShell from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState, EmptyState } from "@/components/LoadingState";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Shield,
  ArrowLeft,
  Bug,
  AlertTriangle,
  TrendingUp,
  Copy,
  ExternalLink,
} from "lucide-react";

interface TopIssue {
  id: string;
  subject: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  severity: string;
  duplicate_count: number;
  created_at: string;
  updated_at: string;
  email: string | null;
  user_id: string | null;
  route: string | null;
  triage_score: number;
}

export default function AdminBugs() {
  const { isAdmin } = useIsAdmin();
  const { isModerator, isLoading: roleLoading } = useIsModerator();
  const queryClient = useQueryClient();
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Fetch top issues from the view
  const { data: topIssues, isLoading: issuesLoading } = useQuery({
    queryKey: ["top-issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("top_issues")
        .select("*");
      
      if (error) throw error;
      return data as TopIssue[];
    },
    enabled: isAdmin || isModerator,
  });

  // Update ticket mutation
  const updateTicket = useMutation({
    mutationFn: async ({
      id,
      severity,
      duplicate_of,
    }: {
      id: string;
      severity?: string;
      duplicate_of?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (severity) updates.severity = severity;
      if (duplicate_of) {
        updates.duplicate_of = duplicate_of;
        // Increment duplicate count on parent
        const { data: parent } = await supabase
          .from("support_tickets")
          .select("duplicate_count")
          .eq("id", duplicate_of)
          .single();
        
        if (parent) {
          await supabase
            .from("support_tickets")
            .update({ duplicate_count: (parent.duplicate_count || 0) + 1 })
            .eq("id", duplicate_of);
        }
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["top-issues"] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Issue updated");
    },
    onError: () => {
      toast.error("Failed to update issue");
    },
  });

  const selectedIssue = topIssues?.find((i) => i.id === selectedIssueId);

  if (roleLoading) {
    return <LoadingState message="Loading..." />;
  }

  if (!isModerator && !isAdmin) {
    return (
      <PageShell maxWidth="max-w-2xl">
        <div className="text-center py-8">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need moderator privileges to access this page.</p>
        </div>
      </PageShell>
    );
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">High</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  return (
    <PageShell maxWidth="max-w-6xl">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link to="/admin">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Link>
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Bug className="h-8 w-8" />
          Bug Triage Dashboard
        </h1>
        <p className="text-muted-foreground">
          Top 20 issues ranked by severity, duplicates, and recency
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{topIssues?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Active Issues</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive">
              {topIssues?.filter((i) => i.severity === "critical").length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive/80">
              {topIssues?.filter((i) => i.severity === "high").length || 0}
            </div>
            <p className="text-sm text-muted-foreground">High Priority</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {topIssues?.reduce((sum, i) => sum + (i.duplicate_count || 0), 0) || 0}
            </div>
            <p className="text-sm text-muted-foreground">Total Duplicates</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Issue List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Issues
            </CardTitle>
            <CardDescription>Sorted by triage score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {issuesLoading ? (
              <LoadingState variant="skeleton" />
            ) : topIssues?.length === 0 ? (
              <EmptyState
                icon={<Bug className="h-12 w-12" />}
                title="No open issues"
                description="All bugs have been resolved!"
              />
            ) : (
              topIssues?.map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => setSelectedIssueId(issue.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedIssueId === issue.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate flex-1 mr-2">{issue.subject}</span>
                    {getSeverityBadge(issue.severity)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{issue.category}</span>
                    {issue.duplicate_count > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Copy className="h-3 w-3" />
                          {issue.duplicate_count} duplicates
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                    </span>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      Score: {issue.triage_score}
                    </span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Issue Detail */}
        <Card className="lg:col-span-2">
          {selectedIssue ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedIssue.subject}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{selectedIssue.category}</Badge>
                      {getSeverityBadge(selectedIssue.severity)}
                      {selectedIssue.duplicate_count > 0 && (
                        <Badge variant="secondary">
                          <Copy className="h-3 w-3 mr-1" />
                          {selectedIssue.duplicate_count} duplicates
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <span className="text-lg font-mono font-bold text-primary">
                    {selectedIssue.triage_score}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p>{new Date(selectedIssue.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Route</p>
                    <p className="font-mono">{selectedIssue.route || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant="outline">{selectedIssue.status}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Priority</p>
                    <Badge variant="outline">{selectedIssue.priority}</Badge>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground bg-muted/50 p-4 rounded-lg whitespace-pre-wrap">
                    {selectedIssue.description}
                  </p>
                </div>

                {/* Triage Actions */}
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Set Severity</p>
                    <Select
                      value={selectedIssue.severity}
                      onValueChange={(value) =>
                        updateTicket.mutate({ id: selectedIssue.id, severity: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/support`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Full Ticket View
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select an issue to view details and triage</p>
            </CardContent>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
