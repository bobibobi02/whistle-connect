import { useEmergencyMode } from "@/hooks/useAppSettings";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function EmergencyBanner() {
  const { enabled, message } = useEmergencyMode();
  const [dismissed, setDismissed] = useState(false);

  if (!enabled || dismissed) {
    return null;
  }

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
      <div className="container max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            {message}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
