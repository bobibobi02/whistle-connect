import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface DebugInfo {
  supabaseUrl: string;
  projectRef: string;
  expectedRef: string;
  isMatch: boolean;
  sessionUser: {
    id: string;
    email: string;
  } | null;
  localStorageKeys: string[];
  timestamp: string;
}

const DebugPage = () => {
  const [info, setInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [edgeFunctionTest, setEdgeFunctionTest] = useState<{
    status: string;
    message: string;
    details?: Record<string, unknown>;
  } | null>(null);

  const expectedRef = "fzgtckfxntalxrwanhdn";

  const fetchDebugInfo = async () => {
    setLoading(true);
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "NOT SET";
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "UNKNOWN";
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log("[Debug] Auth error:", userError);
    }
    
    // Find all Supabase auth keys in localStorage
    const localStorageKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
        localStorageKeys.push(key);
      }
    }

    const debugInfo: DebugInfo = {
      supabaseUrl,
      projectRef,
      expectedRef,
      isMatch: projectRef === expectedRef,
      sessionUser: user ? { id: user.id, email: user.email || "no email" } : null,
      localStorageKeys,
      timestamp: new Date().toISOString(),
    };

    setInfo(debugInfo);
    setLoading(false);

    // Log to console
    console.log("=".repeat(60));
    console.log("[Debug] Supabase Environment Info:");
    console.log("[Debug] VITE_SUPABASE_URL:", supabaseUrl);
    console.log("[Debug] Project Ref:", projectRef);
    console.log("[Debug] Expected Ref:", expectedRef);
    console.log("[Debug] Match:", projectRef === expectedRef ? "✅ YES" : "❌ NO");
    console.log("[Debug] Current User:", user ? { id: user.id, email: user.email } : "Not signed in");
    console.log("[Debug] LocalStorage Auth Keys:", localStorageKeys);
    console.log("=".repeat(60));
  };

  const testEdgeFunction = async () => {
    setEdgeFunctionTest({ status: "loading", message: "Testing..." });
    
    const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-boost-checkout`;
    console.log("[Debug] Testing edge function at:", functionsUrl);
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log("[Debug] Session exists:", !!session);
      console.log("[Debug] User ID:", session?.user?.id || "none");
      
      // Try invoking the edge function with a test payload
      const { data, error } = await supabase.functions.invoke("create-boost-checkout", {
        body: {
          post_id: "test-debug-id",
          amount_cents: 100,
          message: "",
          is_public: false,
        },
      });

      if (error) {
        console.error("[Debug] Edge function error:", {
          message: error.message,
          name: error.name,
          context: error.context,
          stack: error.stack,
        });
        
        setEdgeFunctionTest({
          status: "error",
          message: error.message || "Unknown error",
          details: {
            name: error.name,
            context: error.context,
          },
        });
      } else if (data?.error) {
        // Edge function responded but with an error
        console.log("[Debug] Edge function returned error:", data.error);
        setEdgeFunctionTest({
          status: "app-error",
          message: data.error,
          details: data,
        });
      } else if (data?.url) {
        console.log("[Debug] Edge function returned checkout URL!");
        setEdgeFunctionTest({
          status: "success",
          message: "Checkout URL received!",
          details: { hasUrl: true },
        });
      } else {
        console.log("[Debug] Edge function returned:", data);
        setEdgeFunctionTest({
          status: "unknown",
          message: "Response received but no URL",
          details: data,
        });
      }
    } catch (err) {
      console.error("[Debug] Caught exception:", err);
      setEdgeFunctionTest({
        status: "exception",
        message: String(err),
      });
    }
  };

  useEffect(() => {
    // Only allow in dev mode
    if (import.meta.env.PROD) {
      window.location.href = "/";
      return;
    }
    fetchDebugInfo();
  }, []);

  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔧 Debug Page (DEV Only)</h1>
        <Button variant="outline" size="sm" onClick={fetchDebugInfo} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {info && (
        <>
          {/* Project Match Status */}
          <Card className={info.isMatch ? "border-green-500" : "border-red-500"}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                {info.isMatch ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Project Match Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected:</span>
                  <Badge variant="outline">{info.expectedRef}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actual:</span>
                  <Badge variant={info.isMatch ? "default" : "destructive"}>
                    {info.projectRef}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supabase URL */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Supabase URL</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                {info.supabaseUrl}
              </code>
            </CardContent>
          </Card>

          {/* Auth Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                {info.sessionUser ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                Current User
              </CardTitle>
            </CardHeader>
            <CardContent>
              {info.sessionUser ? (
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User ID:</span>
                    <code className="text-xs">{info.sessionUser.id}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <code className="text-xs">{info.sessionUser.email}</code>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Not signed in</p>
              )}
            </CardContent>
          </Card>

          {/* LocalStorage Keys */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Auth LocalStorage Keys</CardTitle>
            </CardHeader>
            <CardContent>
              {info.localStorageKeys.length > 0 ? (
                <ul className="space-y-1">
                  {info.localStorageKeys.map((key) => (
                    <li key={key}>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">{key}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No Supabase auth keys found</p>
              )}
            </CardContent>
          </Card>

          {/* Edge Function Test */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Edge Function Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={testEdgeFunction} disabled={!info.sessionUser}>
                Test create-boost-checkout
              </Button>
              {!info.sessionUser && (
                <p className="text-sm text-muted-foreground">Sign in first to test edge function</p>
              )}
              {edgeFunctionTest && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={
                      edgeFunctionTest.status === "success" ? "default" :
                      edgeFunctionTest.status === "loading" ? "secondary" : "destructive"
                    }>
                      {edgeFunctionTest.status}
                    </Badge>
                    <span className="text-sm">{edgeFunctionTest.message}</span>
                  </div>
                  {edgeFunctionTest.details && (
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(edgeFunctionTest.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamp */}
          <p className="text-xs text-muted-foreground text-center">
            Last updated: {info.timestamp}
          </p>
        </>
      )}
    </div>
  );
};

export default DebugPage;
