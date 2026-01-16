import { usePaidBoosts, PaidBoostWithProfile } from "@/hooks/usePostBoosts";
import { Zap, Crown, Medal, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";

interface BoostsSectionProps {
  postId: string;
}

export const BoostsSection = ({ postId }: BoostsSectionProps) => {
  const { data: boosts, isLoading, error } = usePaidBoosts(postId);

  // Don't render if loading, error, or no boosts
  if (isLoading || error || !boosts?.length) {
    return null;
  }

  // Calculate total boost amount
  const totalAmount = boosts.reduce((sum, b) => sum + b.amount_total, 0);
  const currency = boosts[0]?.currency || "eur";
  const currencySymbol = currency.toUpperCase() === "EUR" ? "€" : currency.toUpperCase() === "USD" ? "$" : currency.toUpperCase();

  // Group boosts by user and calculate totals for leaderboard
  const supporterTotals = boosts.reduce((acc, boost) => {
    const key = boost.from_user_id || "anonymous";
    if (!acc[key]) {
      acc[key] = {
        userId: boost.from_user_id,
        profile: boost.profile,
        total: 0,
        count: 0,
        isPublic: boost.is_public !== false,
      };
    }
    acc[key].total += boost.amount_total;
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { userId: string | null; profile: PaidBoostWithProfile["profile"]; total: number; count: number; isPublic: boolean }>);

  // Sort by total amount and get top 5
  const topSupporters = Object.values(supporterTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="bg-card rounded-xl shadow-card p-4 mt-4 animate-fade-in">
      {/* Header with total */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Top Supporters</h3>
            <p className="text-xs text-muted-foreground">{boosts.length} boost{boosts.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-primary">
            {currencySymbol}{(totalAmount / 100).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">total raised</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-2">
        {topSupporters.map((supporter, index) => (
          <SupporterRow 
            key={supporter.userId || `anon-${index}`} 
            supporter={supporter} 
            rank={index + 1}
            currencySymbol={currencySymbol}
          />
        ))}
      </div>

      {/* Show more indicator if there are more supporters */}
      {Object.keys(supporterTotals).length > 5 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          +{Object.keys(supporterTotals).length - 5} more supporter{Object.keys(supporterTotals).length - 5 !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

interface SupporterRowProps {
  supporter: {
    userId: string | null;
    profile: PaidBoostWithProfile["profile"];
    total: number;
    count: number;
    isPublic: boolean;
  };
  rank: number;
  currencySymbol: string;
}

const SupporterRow = ({ supporter, rank, currencySymbol }: SupporterRowProps) => {
  const amount = (supporter.total / 100).toFixed(2);
  
  // Determine rank icon and styling
  const getRankDisplay = () => {
    switch (rank) {
      case 1:
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="text-xs font-medium text-muted-foreground w-4 text-center">{rank}</span>;
    }
  };

  // Show name only if boost is public and has profile
  const isPublic = supporter.isPublic;
  const displayName = isPublic && supporter.profile
    ? supporter.profile.display_name || supporter.profile.username || "Supporter"
    : "Anonymous";
  
  const userId = isPublic && supporter.userId;

  const content = (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm transition-colors ${
      rank <= 3 ? 'bg-primary/5 border border-primary/10' : 'bg-muted/50'
    } ${userId ? 'hover:bg-muted cursor-pointer' : ''}`}>
      <div className="flex items-center justify-center w-6">
        {getRankDisplay()}
      </div>
      
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${rank === 1 ? 'text-primary' : ''}`}>
          {displayName}
        </p>
        <p className="text-xs text-muted-foreground">
          {supporter.count} boost{supporter.count !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="text-right">
        <p className={`font-semibold ${rank === 1 ? 'text-primary' : ''}`}>
          {currencySymbol}{amount}
        </p>
      </div>
    </div>
  );

  if (userId) {
    return <Link to={`/profile/${userId}`}>{content}</Link>;
  }

  return content;
};
