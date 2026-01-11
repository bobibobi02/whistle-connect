import { supabase } from "@/integrations/supabase/client";

export const useGoogleAuth = () => {
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    return { error };
  };

  return { signInWithGoogle };
};
