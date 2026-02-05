import { AlertTriangle } from "lucide-react";

const EnvErrorBanner = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const missingVars: string[] = [];
  if (!supabaseUrl) missingVars.push("VITE_SUPABASE_URL");
  if (!anonKey) missingVars.push("VITE_SUPABASE_PUBLISHABLE_KEY");

  if (missingVars.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-semibold">Missing Environment Variables</p>
          <p className="text-sm opacity-90">
            The following required variables are not set: {missingVars.join(", ")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnvErrorBanner;
