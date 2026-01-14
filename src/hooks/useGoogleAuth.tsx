import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useGoogleAuth = () => {
  const signInWithGoogle = async () => {
    console.log("[Auth] Starting Google OAuth...");
    console.log("[Auth] Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      console.error("[Auth] Google OAuth error:", {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      
      // Provide helpful error messages
      if (error.message?.includes("provider is not enabled")) {
        toast.error("Google sign-in is not configured. Please use email/password or contact support.");
      } else if (error.message?.includes("Unsupported provider")) {
        toast.error("Google authentication is not available. Please sign up with email.");
      } else {
        toast.error(error.message || "Failed to sign in with Google");
      }
    }

    return { data, error };
  };

  return { signInWithGoogle };
};
