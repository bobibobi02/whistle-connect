import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HealthCheck {
  name: string;
  status: "checking" | "healthy" | "unhealthy";
  message?: string;
}

export default function Status() {
  const [checks, setChecks] = useState<HealthCheck[]>([
    { name: "Application", status: "checking" },
    { name: "Database API", status: "checking" },
    { name: "Authentication", status: "checking" },
  ]);

  useEffect(() => {
    const runHealthChecks = async () => {
      // Check 1: Application is running (always passes if this page loads)
      setChecks(prev =>
        prev.map(c =>
          c.name === "Application"
            ? { ...c, status: "healthy", message: "App loaded successfully" }
            : c
        )
      );

      // Check 2: Database API is reachable
      try {
        const { error } = await supabase
          .from("communities")
          .select("id")
          .limit(1);
        
        setChecks(prev =>
          prev.map(c =>
            c.name === "Database API"
              ? {
                  ...c,
                  status: error ? "unhealthy" : "healthy",
                  message: error ? error.message : "API responding",
                }
              : c
          )
        );
      } catch {
        setChecks(prev =>
          prev.map(c =>
            c.name === "Database API"
              ? { ...c, status: "unhealthy", message: "Connection failed" }
              : c
          )
        );
      }

      // Check 3: Auth service is reachable
      try {
        const { error } = await supabase.auth.getSession();
        setChecks(prev =>
          prev.map(c =>
            c.name === "Authentication"
              ? {
                  ...c,
                  status: error ? "unhealthy" : "healthy",
                  message: error ? error.message : "Auth service available",
                }
              : c
          )
        );
      } catch {
        setChecks(prev =>
          prev.map(c =>
            c.name === "Authentication"
              ? { ...c, status: "unhealthy", message: "Auth unavailable" }
              : c
          )
        );
      }
    };

    runHealthChecks();
  }, []);

  const allHealthy = checks.every(c => c.status === "healthy");
  const anyChecking = checks.some(c => c.status === "checking");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            {anyChecking ? (
              <Loader2 className="h-16 w-16 mx-auto text-muted-foreground animate-spin" />
            ) : allHealthy ? (
              <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
            ) : (
              <XCircle className="h-16 w-16 mx-auto text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {anyChecking
              ? "Checking Status..."
              : allHealthy
              ? "All Systems Operational"
              : "Some Issues Detected"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {checks.map((check) => (
            <div
              key={check.name}
              className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
            >
              <div>
                <p className="font-medium">{check.name}</p>
                {check.message && (
                  <p className="text-sm text-muted-foreground">{check.message}</p>
                )}
              </div>
              {check.status === "checking" ? (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              ) : check.status === "healthy" ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
          ))}
          
          <div className="pt-4 border-t border-border text-center text-sm text-muted-foreground">
            <p>Whistle v1.0.0</p>
            <p>Environment: {window.location.hostname.includes("localhost") ? "Development" : "Production"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
