import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Send, AlertCircle, Check, Lock, FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { useCreateSubmission, SUBMISSION_CATEGORIES } from "@/hooks/useAnonymousSubmissions";

const SubmitTip = () => {
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);

  const createSubmission = useCreateSubmission();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !content.trim()) return;

    try {
      const result = await createSubmission.mutateAsync({
        category,
        subject,
        content,
      });
      setSubmittedToken(result.submission_token);
      setSubject("");
      setContent("");
      setCategory("general");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-2xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Submit Anonymous Tip</h1>
            <p className="text-muted-foreground">Your identity is protected</p>
          </div>
        </div>

        {/* Security Notice */}
        <Alert className="mb-6 border-primary/50 bg-primary/5">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <strong>Your privacy is protected.</strong> We do not log IP addresses, 
            require login, or store any identifying information. Your submission 
            is encrypted and only accessible to verified moderators.
          </AlertDescription>
        </Alert>

        {submittedToken ? (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Submission Received
              </CardTitle>
              <CardDescription>
                Your anonymous tip has been securely submitted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-xs text-muted-foreground">Your Reference Token (save this)</Label>
                <p className="font-mono text-sm mt-1 break-all">{submittedToken}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Save this token if you want to check the status of your submission later.
                This is the only way to track your submission anonymously.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setSubmittedToken(null)} variant="outline">
                  Submit Another
                </Button>
                <Button onClick={() => navigate("/")}>
                  Return Home
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Submit Your Information</CardTitle>
              <CardDescription>
                All fields are processed securely. No login required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBMISSION_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief summary of your tip"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={200}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {subject.length}/200 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Details</Label>
                  <Textarea
                    id="content"
                    placeholder="Provide as much detail as possible. Include dates, names, locations, and any evidence you may have."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    maxLength={10000}
                    required
                    className="min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {content.length}/10,000 characters
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Do not include personally identifying 
                    information about yourself unless necessary. Our moderators 
                    will review your submission and may follow up if you provide 
                    a secure contact method.
                  </AlertDescription>
                </Alert>

                <Button 
                  type="submit" 
                  className="w-full gap-2"
                  disabled={createSubmission.isPending || !subject.trim() || !content.trim()}
                >
                  {createSubmission.isPending ? (
                    "Submitting securely..."
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Anonymously
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Security Info */}
        <Card className="mt-6 border-muted">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">How We Protect You</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                No login or account required
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                IP addresses are not logged
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                All data encrypted in transit and at rest
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                Only verified moderators can access submissions
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                No cookies or tracking used on this page
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SubmitTip;
