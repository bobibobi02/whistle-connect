import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KarmaBadgeProps {
  karma: number;
  className?: string;
  showIcon?: boolean;
}

const formatKarma = (karma: number): string => {
  if (karma >= 1000000) {
    return `${(karma / 1000000).toFixed(1)}M`;
  }
  if (karma >= 1000) {
    return `${(karma / 1000).toFixed(1)}K`;
  }
  return karma.toString();
};

const getKarmaLevel = (karma: number): { color: string; label: string } => {
  if (karma >= 100000) return { color: "text-amber-500", label: "Legendary" };
  if (karma >= 50000) return { color: "text-purple-500", label: "Epic" };
  if (karma >= 10000) return { color: "text-blue-500", label: "Rare" };
  if (karma >= 1000) return { color: "text-green-500", label: "Notable" };
  if (karma >= 100) return { color: "text-muted-foreground", label: "Rising" };
  return { color: "text-muted-foreground", label: "New" };
};

const KarmaBadge = ({ karma, className, showIcon = true }: KarmaBadgeProps) => {
  const { color, label } = getKarmaLevel(karma);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center gap-1 text-sm font-medium", color, className)}>
          {showIcon && <Sparkles className="h-3.5 w-3.5" />}
          {formatKarma(karma)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{karma.toLocaleString()} karma · {label}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default KarmaBadge;
