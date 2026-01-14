import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * OAuth callback handler
 * This page handles the redirect from OAuth providers (Google, etc.)
 * It extracts the session from the URL hash and redirects to home
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      console.log("[AuthCallback] Processing OAuth callback...");
      
      // Supabase will automatically exchange the code in URL for session
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("[AuthCallback] Error getting session:", error);
        navigate("/auth?error=callback_failed");
        return;
      }

      if (data.session) {
        console.log("[AuthCallback] Session established, redirecting to home");
        navigate("/");
      } else {
        console.log("[AuthCallback] No session found, redirecting to auth");
        navigate("/auth");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
