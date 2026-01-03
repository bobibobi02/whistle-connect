import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NsfwBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export const NsfwBadge = ({ className, size = "sm" }: NsfwBadgeProps) => {
  return (
    <Badge
      variant="destructive"
      className={cn(
        "font-bold uppercase tracking-wider",
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        className
      )}
    >
      NSFW
    </Badge>
  );
};
