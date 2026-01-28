import { useState } from "react";
import { Link } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useUserRoles";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Database,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  HardDrive,
  Download,
  AlertTriangle,
} from "lucide-react";

const backupSteps = [
  {
    id: "1",
    title: "Enable Point-in-Time Recovery (PITR)",
    description: "In your database settings, enable PITR for automatic continuous backups.",
    required: true,
  },
  {
    id: "2",
    title: "Configure backup retention period",
    description: "Set how long backups are retained (7-30 days recommended).",
    required: true,
  },
  {
    id: "3",
    title: "Test restore process",
    description: "Periodically test restoring from a backup to ensure it works.",
    required: true,
  },
  {
    id: "4",
    title: "Document recovery procedure",
    description: "Create a runbook for the team to follow during an incident.",
    required: false,
  },
  {
    id: "5",
    title: "Set up monitoring alerts",
    description: "Get notified if backups fail or storage is running low.",
    required: false,
  },
  {
    id: "6",
    title: "Export critical data regularly",
    description: "For extra safety, export user data and configuration periodically.",
    required: false,
  },
];

const recoverySteps = [
  "Identify the issue and the point in time to restore to",
  "Notify the team and users about planned downtime",
  "Access the backup management interface",
  "Select the restore point (timestamp)",
  "Initiate the restore process",
  "Verify data integrity after restore",
  "Test critical application features",
  "Communicate restoration completion to users",
];

export default function AdminBackups() {
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const toggleStep = (id: string) => {
    setCompletedSteps(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  if (roleLoading) {
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

  const requiredSteps = backupSteps.filter(s => s.required);
  const completedRequired = requiredSteps.filter(s => completedSteps.includes(s.id)).length;
  const allRequiredComplete = completedRequired === requiredSteps.length;

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <main className="container max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/admin/go-live">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Go-Live
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Backups & Recovery</h1>
          <p className="text-muted-foreground">
            Runbook for database backup and disaster recovery
          </p>
        </div>

        {/* Status */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${allRequiredComplete ? "bg-primary/10" : "bg-yellow-500/10"}`}>
                  {allRequiredComplete ? (
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-yellow-500" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {allRequiredComplete ? "Backup Setup Complete" : "Setup Incomplete"}
                  </h2>
                  <p className="text-muted-foreground">
                    {completedRequired} of {requiredSteps.length} required steps complete
                  </p>
                </div>
              </div>
              <Badge variant={allRequiredComplete ? "default" : "secondary"}>
                {Math.round((completedSteps.length / backupSteps.length) * 100)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Setup Checklist */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Backup Setup Checklist
            </CardTitle>
            <CardDescription>
              Complete these steps to ensure your data is protected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {backupSteps.map((step) => (
              <div
                key={step.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border"
              >
                <Checkbox
                  id={step.id}
                  checked={completedSteps.includes(step.id)}
                  onCheckedChange={() => toggleStep(step.id)}
                />
                <div className="flex-1">
                  <label htmlFor={step.id} className="font-medium cursor-pointer">
                    {step.title}
                    {step.required && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Required
                      </Badge>
                    )}
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recovery Procedure */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recovery Procedure
            </CardTitle>
            <CardDescription>
              Steps to follow during a disaster recovery event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {recoverySteps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-medium mb-2">Backup Frequency</h3>
                <p className="text-sm text-muted-foreground">
                  Enable continuous backups with PITR. This allows you to restore to any point in time.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-medium mb-2">Retention Period</h3>
                <p className="text-sm text-muted-foreground">
                  Keep at least 7 days of backups. For critical data, consider 30 days.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-medium mb-2">Test Regularly</h3>
                <p className="text-sm text-muted-foreground">
                  Perform a test restore at least once per month to verify backup integrity.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-medium mb-2">Monitor Storage</h3>
                <p className="text-sm text-muted-foreground">
                  Set up alerts for storage capacity to avoid backup failures.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
    </div>
  );
}
