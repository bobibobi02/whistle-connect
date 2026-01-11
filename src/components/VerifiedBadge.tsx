import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  type?: "creator" | "official" | "notable";
  className?: string;
  size?: "sm" | "md" | "lg";
}

const badgeColors = {
  creator: "text-purple-500",
  official: "text-blue-500",
  notable: "text-amber-500",
};

const badgeLabels = {
  creator: "Verified Creator",
  official: "Official Account",
  notable: "Notable User",
};

const VerifiedBadge = ({ type = "creator", className, size = "sm" }: VerifiedBadgeProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <BadgeCheck
          className={cn(
            sizeClasses[size],
            badgeColors[type],
            "inline-block",
            className
          )}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p>{badgeLabels[type]}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default VerifiedBadge;
