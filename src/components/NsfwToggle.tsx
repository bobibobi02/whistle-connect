import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNsfwSettings } from "@/hooks/useNsfwSettings";
import { NsfwConfirmDialog } from "@/components/NsfwConfirmDialog";
import { EyeOff, Eye } from "lucide-react";

export const NsfwToggle = () => {
  const { allowNsfw, enableNsfw, disableNsfw, isLoading } = useNsfwSettings();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setShowConfirm(true);
    } else {
      disableNsfw.mutate();
    }
  };

  const handleConfirm = () => {
    enableNsfw.mutate();
    setShowConfirm(false);
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-3">
          {allowNsfw ? (
            <Eye className="h-5 w-5 text-muted-foreground" />
          ) : (
            <EyeOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <Label htmlFor="nsfw-toggle" className="text-base font-medium">
              Adult Content (18+)
            </Label>
            <p className="text-sm text-muted-foreground">
              {allowNsfw ? "NSFW content is visible" : "NSFW content is hidden"}
            </p>
          </div>
        </div>
        <Switch
          id="nsfw-toggle"
          checked={allowNsfw}
          onCheckedChange={handleToggle}
          disabled={isLoading || enableNsfw.isPending || disableNsfw.isPending}
        />
      </div>

      <NsfwConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleConfirm}
        isPending={enableNsfw.isPending}
      />
    </>
  );
};
