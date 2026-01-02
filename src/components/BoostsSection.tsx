import { useSucceededBoosts, BoostWithProfile } from "@/hooks/usePostBoosts";
import { Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BoostsSectionProps {
  postId: string;
}

export const BoostsSection = ({ postId }: BoostsSectionProps) => {
  const { data: boosts, isLoading } = useSucceededBoosts(postId);

  if (isLoading || !boosts?.length) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl shadow-card p-4 mt-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Boosts ({boosts.length})</h3>
      </div>
      <div className="space-y-2">
        {boosts.map((boost) => (
          <BoostRow key={boost.id} boost={boost} />
        ))}
      </div>
    </div>
  );
};

interface BoostRowProps {
  boost: BoostWithProfile;
}

const BoostRow = ({ boost }: BoostRowProps) => {
  const amount = (boost.amount_cents / 100).toFixed(2);
  const currencySymbol = boost.currency.toUpperCase() === "EUR" ? "€" : "$";
  const timeAgo = formatDistanceToNow(new Date(boost.created_at), { addSuffix: true });
  
  // Show name only if boost is public and has profile
  const boosterName = boost.is_public && boost.profile
    ? boost.profile.display_name || boost.profile.username || "Anonymous"
    : "Anonymous";

  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-muted/50 rounded-lg text-sm">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
        <Zap className="h-3 w-3 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-muted-foreground">{boosterName}</span>
        <span className="mx-1.5 text-foreground font-medium">
          Boosted {currencySymbol}{amount}
        </span>
        <span className="text-muted-foreground text-xs">· {timeAgo}</span>
      </div>
    </div>
  );
};
