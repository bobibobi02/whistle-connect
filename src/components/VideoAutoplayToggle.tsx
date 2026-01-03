import { Switch } from "@/components/ui/switch";
import { useVideoQueue } from "@/hooks/useVideoQueue";
import { SkipForward } from "lucide-react";

interface VideoAutoplayToggleProps {
  compact?: boolean;
}

export const VideoAutoplayToggle = ({ compact = false }: VideoAutoplayToggleProps) => {
  const { autoplayEnabled, toggleAutoplay } = useVideoQueue();

  if (compact) {
    return (
      <button
        onClick={toggleAutoplay}
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
        title={autoplayEnabled ? "Autoplay is ON" : "Autoplay is OFF"}
      >
        <SkipForward className="h-3 w-3" />
        <span className="hidden sm:inline">Auto</span>
        <span className={autoplayEnabled ? "text-green-400" : "text-muted-foreground"}>
          {autoplayEnabled ? "ON" : "OFF"}
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        id="autoplay-toggle"
        checked={autoplayEnabled}
        onCheckedChange={toggleAutoplay}
        className="scale-90"
      />
      <label
        htmlFor="autoplay-toggle"
        className="text-sm text-muted-foreground cursor-pointer"
      >
        Autoplay next
      </label>
    </div>
  );
};
