import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveBadgeProps {
  className?: string;
}

const LiveBadge = ({ className }: LiveBadgeProps) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase",
        "bg-red-500 text-white animate-pulse",
        className
      )}
    >
      <Radio className="h-3 w-3" />
      <span>Live</span>
    </div>
  );
};

export default LiveBadge;
