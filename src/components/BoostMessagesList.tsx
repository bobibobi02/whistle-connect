import { usePostBoosts, PostBoost } from "@/hooks/usePostBoosts";
import { Heart, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BoostMessagesListProps {
  postId: string;
}

export const BoostMessagesList = ({ postId }: BoostMessagesListProps) => {
  const { data: boosts, isLoading } = usePostBoosts(postId);

  console.log("[BoostMessagesList] Rendering for post:", postId, "boosts:", boosts, "loading:", isLoading);

  // Filter to only show boosts with public messages
  const publicBoostsWithMessages = boosts?.filter(
    (boost) => boost.is_public && boost.message
  );

  console.log("[BoostMessagesList] Filtered public boosts with messages:", publicBoostsWithMessages);

  if (isLoading) {
    return null;
  }

  if (!publicBoostsWithMessages?.length) {
    console.log("[BoostMessagesList] No public boosts with messages to display");
    return null;
  }

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="h-5 w-5 text-primary fill-primary" />
        <h3 className="font-semibold text-lg">Supporter Messages</h3>
        <span className="text-sm text-muted-foreground">
          ({publicBoostsWithMessages.length})
        </span>
      </div>

      <div className="space-y-4">
        {publicBoostsWithMessages.map((boost) => (
          <BoostMessageCard key={boost.id} boost={boost} formatAmount={formatAmount} />
        ))}
      </div>
    </div>
  );
};

interface BoostMessageCardProps {
  boost: PostBoost;
  formatAmount: (cents: number, currency: string) => string;
}

const BoostMessageCard = ({ boost, formatAmount }: BoostMessageCardProps) => {
  const timeAgo = formatDistanceToNow(new Date(boost.created_at), {
    addSuffix: true,
  });

  return (
    <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{boost.from_user_id ? "Supporter" : "Anonymous Supporter"}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Heart className="h-3 w-3 fill-current" />
              {formatAmount(boost.amount_cents, boost.currency)}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">
            {boost.message}
          </p>
        </div>
      </div>
    </div>
  );
};
