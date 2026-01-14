import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Google OAuth Hook
 * 
 * IMPORTANT: Google OAuth must be enabled in the Supabase Dashboard:
 * 1. Go to Authentication → Providers → Google
 * 2. Enable Google provider
 * 3. Add Google OAuth Client ID and Client Secret from Google Cloud Console
 * 4. In Google Cloud Console, add this as authorized redirect URI:
 *    https://<PROJECT_REF>.supabase.co/auth/v1/callback
 * 
 * If you see "provider is not enabled" error, configure Google in Supabase Dashboard.
 */
export const useGoogleAuth = () => {
  const signInWithGoogle = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "unknown";
    
    console.log("[Auth] Starting Google OAuth...");
    console.log("[Auth] Supabase URL:", supabaseUrl);
    console.log("[Auth] Project ref:", projectRef);
    console.log("[Auth] Redirect URL:", `${window.location.origin}/auth/callback`);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("[Auth] Google OAuth error:", {
        message: error.message,
        status: error.status,
        name: error.name,
        projectRef,
      });
      
      // Provide helpful error messages based on error type
      if (error.message?.includes("provider is not enabled") || error.message?.includes("Unsupported provider")) {
        toast.error(
          "Google sign-in is not configured for this project. Please use email/password authentication, or configure Google in the Lovable Cloud backend.",
          { duration: 6000 }
        );
        console.error(
          "[Auth] ADMIN ACTION REQUIRED: Enable Google provider in Lovable Cloud → Users → Auth Settings → Google Settings"
        );
      } else {
        toast.error(error.message || "Failed to sign in with Google");
      }
    } else {
      console.log("[Auth] Google OAuth initiated successfully, redirecting...");
    }

    return { data, error };
  };

  return { signInWithGoogle };
};
