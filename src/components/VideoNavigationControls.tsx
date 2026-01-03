import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVideoQueue } from "@/hooks/useVideoQueue";
import { cn } from "@/lib/utils";

interface VideoNavigationControlsProps {
  className?: string;
}

export const VideoNavigationControls = ({ className }: VideoNavigationControlsProps) => {
  const { goToNextVideo, goToPreviousVideo, getCurrentPosition } = useVideoQueue();
  const position = getCurrentPosition();

  if (!position) return null;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Button
        variant="secondary"
        size="icon"
        onClick={goToPreviousVideo}
        disabled={!position.hasPrevious}
        className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
        title="Previous video (K or ↑)"
      >
        <ChevronUp className="h-5 w-5" />
      </Button>
      
      <div className="text-center text-xs text-muted-foreground py-1">
        {position.index + 1}/{position.total}
      </div>
      
      <Button
        variant="secondary"
        size="icon"
        onClick={goToNextVideo}
        disabled={!position.hasNext}
        className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
        title="Next video (J or ↓)"
      >
        <ChevronDown className="h-5 w-5" />
      </Button>
    </div>
  );
};
