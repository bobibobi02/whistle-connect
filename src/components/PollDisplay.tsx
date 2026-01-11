import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePoll, useVotePoll } from "@/hooks/usePolls";
import { formatDistanceToNow } from "date-fns";

interface PollDisplayProps {
  postId: string;
}

const PollDisplay = ({ postId }: PollDisplayProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: poll, isLoading } = usePoll(postId);
  const votePoll = useVotePoll();

  if (isLoading || !poll) return null;

  const hasVoted = poll.user_votes.length > 0;
  const showResults = hasVoted || poll.is_ended;

  const handleVote = (optionId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (poll.is_ended) return;

    votePoll.mutate({
      pollId: poll.id,
      optionId,
      postId,
    });
  };

  return (
    <div className="bg-secondary/30 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{poll.question}</h3>
        {poll.ends_at && (
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {poll.is_ended
              ? "Ended"
              : `Ends ${formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true })}`}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const percentage = poll.total_votes > 0
            ? Math.round((option.vote_count / poll.total_votes) * 100)
            : 0;
          const isSelected = poll.user_votes.includes(option.id);

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={poll.is_ended}
              className={cn(
                "w-full text-left relative rounded-lg overflow-hidden transition-all",
                showResults ? "cursor-default" : "cursor-pointer hover:ring-2 hover:ring-primary/50",
                isSelected && "ring-2 ring-primary"
              )}
            >
              {showResults && (
                <Progress
                  value={percentage}
                  className="absolute inset-0 h-full rounded-lg"
                />
              )}
              <div className={cn(
                "relative p-3 flex items-center justify-between",
                showResults ? "bg-transparent" : "bg-secondary/50"
              )}>
                <span className="flex items-center gap-2">
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                  {option.text}
                </span>
                {showResults && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {percentage}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {poll.total_votes} {poll.total_votes === 1 ? "vote" : "votes"}
        {poll.allow_multiple && " · Multiple choices allowed"}
      </p>
    </div>
  );
};

export default PollDisplay;
