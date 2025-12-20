import { Rocket } from "lucide-react";
import { usePostBoostTotals } from "@/hooks/usePostBoosts";
import { cn } from "@/lib/utils";

interface BoostBadgeProps {
  postId: string;
  className?: string;
}

const BoostBadge = ({ postId, className }: BoostBadgeProps) => {
  const { data: totals } = usePostBoostTotals(postId);

  if (!totals || totals.total_amount_cents === 0) return null;

  const amount = (totals.total_amount_cents / 100).toFixed(0);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        "bg-primary/10 text-primary border border-primary/20",
        className
      )}
    >
      <Rocket className="h-3 w-3" />
      <span>€{amount} boosted</span>
    </div>
  );
};

export default BoostBadge;
