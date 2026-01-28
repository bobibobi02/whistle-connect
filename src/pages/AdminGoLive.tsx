import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { useAppSettings, useUpdateAppSetting, useEmergencyMode } from "@/hooks/useAppSettings";
import { useLegalPages, usePublishAllLegalPages } from "@/hooks/useLegalPages";
import PageShell from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Globe,
  Shield,
  FileText,
  Database,
  Activity,
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  status: "pass" | "fail" | "pending";
  action?: () => void;
  actionLabel?: string;
}

export default function AdminGoLive() {
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();

  const { data: settings, isLoading: settingsLoading } = useAppSettings();
  const { data: legalPages, isLoading: legalLoading } = useLegalPages();
  const updateSetting = useUpdateAppSetting();
  const publishAllPages = usePublishAllLegalPages();
  const { enabled: emergencyEnabled, message: emergencyMessage } = useEmergencyMode();

  const [productionDomain, setProductionDomain] = useState("");

  if (roleLoading || settingsLoading || legalLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell maxWidth="max-w-2xl">
        <div className="text-center py-8">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </PageShell>
    );
  }

  const getSetting = (key: string) => settings?.find(s => s.key === key)?.value;

  const domainConfig = getSetting("production_domain") as { domain: string; configured: boolean } | undefined;
  const authUrls = getSetting("auth_redirect_urls") as { urls: string[] } | undefined;
  const backupsEnabled = getSetting("backups_enabled") as { enabled: boolean } | undefined;
  const monitoringEnabled = getSetting("monitoring_enabled") as { enabled: boolean } | undefined;

  const allLegalPublished = legalPages?.every(p => p.is_published) ?? false;

  const checklist: ChecklistItem[] = [
    {
      id: "domain",
      label: "Production Domain Configured",
      description: domainConfig?.domain || "No domain set",
      status: domainConfig?.configured ? "pass" : "fail",
    },
    {
      id: "auth",
      label: "Auth Redirect URLs Set",
      description: `${authUrls?.urls?.length || 0} redirect URLs configured`,
      status: (authUrls?.urls?.length || 0) > 0 ? "pass" : "fail",
    },
    {
      id: "legal",
      label: "Legal Pages Published",
      description: allLegalPublished ? "All pages published" : "Some pages unpublished",
      status: allLegalPublished ? "pass" : "fail",
      action: () => publishAllPages.mutate(),
      actionLabel: "Publish All",
    },
    {
      id: "backups",
      label: "Backups Enabled",
      description: backupsEnabled?.enabled ? "Backups are configured" : "Backups not enabled",
      status: backupsEnabled?.enabled ? "pass" : "pending",
    },
    {
      id: "monitoring",
      label: "Monitoring Enabled",
      description: monitoringEnabled?.enabled ? "Monitoring active" : "No monitoring configured",
      status: monitoringEnabled?.enabled ? "pass" : "pending",
    },
  ];

  const passCount = checklist.filter(c => c.status === "pass").length;
  const readyToLaunch = passCount >= 3; // At least 3 must pass

  const handleSaveDomain = async () => {
    if (!productionDomain.trim()) {
      toast.error("Please enter a domain");
      return;
    }

    try {
      await updateSetting.mutateAsync({
        key: "production_domain",
        value: { domain: productionDomain.trim(), configured: true },
      });
      toast.success("Domain saved");
    } catch {
      toast.error("Failed to save domain");
    }
  };

  const handleToggleEmergency = async () => {
    try {
      await updateSetting.mutateAsync({
        key: "emergency_mode",
        value: { enabled: !emergencyEnabled, message: emergencyMessage },
      });
      toast.success(emergencyEnabled ? "Emergency mode disabled" : "Emergency mode enabled");
    } catch {
      toast.error("Failed to update emergency mode");
    }
  };

  return (
    <PageShell maxWidth="max-w-4xl">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link to="/admin">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Go-Live Checklist</h1>
        <p className="text-muted-foreground">
          Complete these checks before launching to production
        </p>
      </div>

      {/* Status Summary */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {readyToLaunch ? "Ready to Launch! 🚀" : "Not Ready Yet"}
              </h2>
              <p className="text-muted-foreground">
                {passCount} of {checklist.length} checks passed
              </p>
            </div>
            <Badge variant={readyToLaunch ? "default" : "secondary"} className="text-lg px-4 py-2">
              {Math.round((passCount / checklist.length) * 100)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Environment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Current URL</Label>
              <p className="font-mono text-sm">{window.location.origin}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Environment</Label>
              <p>{window.location.hostname.includes("localhost") ? "Development" : "Production"}</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Production Domain</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://whistle.example.com"
                value={productionDomain || domainConfig?.domain || ""}
                onChange={(e) => setProductionDomain(e.target.value)}
              />
              <Button onClick={handleSaveDomain} disabled={updateSetting.isPending}>
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Launch Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {checklist.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border"
            >
              <div className="flex items-center gap-3">
                {item.status === "pass" ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : item.status === "fail" ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              {item.action && item.status !== "pass" && (
                <Button size="sm" variant="outline" onClick={item.action}>
                  {item.actionLabel}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Auth Configuration Helper */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Auth Configuration
          </CardTitle>
          <CardDescription>
            Values to configure in your backend Auth settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Site URL</Label>
            <p className="font-mono text-sm bg-muted p-2 rounded">
              {domainConfig?.domain || window.location.origin}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Redirect URLs (add all of these)</Label>
            <ul className="space-y-1 mt-1">
              <li className="font-mono text-sm bg-muted p-2 rounded">http://localhost:3000</li>
              <li className="font-mono text-sm bg-muted p-2 rounded">https://whistle-connect-hub.lovable.app</li>
              {domainConfig?.domain && (
                <li className="font-mono text-sm bg-muted p-2 rounded">{domainConfig.domain}</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Mode */}
      <Card className="mb-6 border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Emergency Mode
          </CardTitle>
          <CardDescription>
            Enable read-only mode to disable new signups and posting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{emergencyEnabled ? "Emergency Mode Active" : "Normal Operation"}</p>
              <p className="text-sm text-muted-foreground">{emergencyMessage}</p>
            </div>
            <Switch
              checked={emergencyEnabled}
              onCheckedChange={handleToggleEmergency}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          <Button variant="outline" asChild>
            <Link to="/admin/legal">
              <FileText className="h-4 w-4 mr-2" />
              Edit Legal Pages
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/analytics">
              <Activity className="h-4 w-4 mr-2" />
              View Analytics
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/backups">
              <Database className="h-4 w-4 mr-2" />
              Backup Runbook
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/status">
              <Globe className="h-4 w-4 mr-2" />
              Status Page
            </Link>
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}
