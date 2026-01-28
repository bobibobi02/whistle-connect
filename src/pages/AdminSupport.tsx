import { useState } from "react";
import { Link } from "react-router-dom";
import { useIsAdmin, useIsModerator } from "@/hooks/useUserRoles";
import { useSupportTickets, useUpdateTicket } from "@/hooks/useSupportTickets";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Shield,
  ArrowLeft,
  Loader2,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  ExternalLink,
} from "lucide-react";

export default function AdminSupport() {
  const { isAdmin } = useIsAdmin();
  const { isModerator, isLoading: roleLoading } = useIsModerator();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const { data: tickets, isLoading: ticketsLoading } = useSupportTickets(statusFilter === "all" ? undefined : statusFilter);
  const updateTicket = useUpdateTicket();

  const selectedTicket = tickets?.find(t => t.id === selectedTicketId);

  const handleStatusChange = async (status: string) => {
    if (!selectedTicketId) return;

    try {
      await updateTicket.mutateAsync({ id: selectedTicketId, status });
      toast.success(`Status updated to ${status}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handlePriorityChange = async (priority: string) => {
    if (!selectedTicketId) return;

    try {
      await updateTicket.mutateAsync({ id: selectedTicketId, priority });
      toast.success(`Priority updated to ${priority}`);
    } catch (error) {
      toast.error("Failed to update priority");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedTicketId) return;

    try {
      await updateTicket.mutateAsync({ id: selectedTicketId, notes });
      toast.success("Notes saved");
    } catch (error) {
      toast.error("Failed to save notes");
    }
  };

  if (roleLoading || ticketsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isModerator && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setIsMobileNavOpen(true)} />
        <main className="container max-w-2xl mx-auto px-4 py-8 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need moderator privileges to access this page.</p>
        </main>
        <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="default">Open</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500/20 text-yellow-500">In Progress</Badge>;
      case "resolved":
        return <Badge variant="secondary">Resolved</Badge>;
      case "closed":
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      case "high":
        return <Badge className="bg-orange-500/20 text-orange-500">High</Badge>;
      case "normal":
        return <Badge variant="outline">Normal</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return null;
    }
  };

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

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Support Tickets</h1>
          <p className="text-muted-foreground">
            Manage user bug reports and support requests
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Ticket List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Tickets</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {tickets?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No tickets found</p>
              ) : (
                tickets?.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => {
                      setSelectedTicketId(ticket.id);
                      setNotes(ticket.notes || "");
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTicketId === ticket.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate flex-1">{ticket.subject}</span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{ticket.category}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Ticket Detail */}
          <Card className="lg:col-span-2">
            {selectedTicket ? (
              <>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedTicket.subject}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{selectedTicket.category}</Badge>
                        {getPriorityBadge(selectedTicket.priority)}
                      </CardDescription>
                    </div>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Submitted</p>
                      <p>{new Date(selectedTicket.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Route</p>
                      <p className="font-mono">{selectedTicket.route || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p>{selectedTicket.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">App Version</p>
                      <p>{selectedTicket.app_version || "N/A"}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-muted-foreground bg-muted/50 p-4 rounded-lg whitespace-pre-wrap">
                      {selectedTicket.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Select value={selectedTicket.status} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Priority</p>
                      <Select value={selectedTicket.priority} onValueChange={handlePriorityChange}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <h3 className="font-medium">Internal Notes</h3>
                    <Textarea
                      placeholder="Add internal notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                    <Button size="sm" onClick={handleSaveNotes} disabled={updateTicket.isPending}>
                      Save Notes
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a ticket to view details</p>
              </CardContent>
            )}
          </Card>
        </div>
      </main>
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
    </div>
  );
}
