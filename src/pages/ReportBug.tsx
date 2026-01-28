import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCreateTicket } from "@/hooks/useSupportTickets";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Bug, Send, CheckCircle } from "lucide-react";

const categories = [
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "account", label: "Account Issue" },
  { value: "content", label: "Content Issue" },
  { value: "payment", label: "Payment Issue" },
  { value: "other", label: "Other" },
];

export default function ReportBug() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createTicket = useCreateTicket();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [category, setCategory] = useState("bug");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!user && !email.trim()) {
      toast.error("Please provide an email address");
      return;
    }

    try {
      await createTicket.mutateAsync({
        category,
        subject: subject.trim(),
        description: description.trim(),
        email: email.trim() || undefined,
      });

      setSubmitted(true);
      toast.success("Report submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit report");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setIsMobileNavOpen(true)} />
        <main className="container max-w-lg mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-2">Report Submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Thank you for your feedback. We'll review your report and get back to you if needed.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate("/")}>Back to Home</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setSubject("");
                    setDescription("");
                    setCategory("bug");
                  }}
                >
                  Submit Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <main className="container max-w-lg mx-auto px-4 py-8 pb-24 md:pb-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/help">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Help
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Report a Bug
            </CardTitle>
            <CardDescription>
              Help us improve Whistle by reporting issues you encounter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of the issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please describe the issue in detail. Include steps to reproduce if applicable."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {description.length}/2000
                </p>
              </div>

              {!user && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll use this to follow up on your report
                  </p>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p className="font-medium mb-1">Automatically captured:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Current page: {window.location.pathname}</li>
                  <li>Browser information</li>
                  <li>App version</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createTicket.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {createTicket.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
    </div>
  );
}
