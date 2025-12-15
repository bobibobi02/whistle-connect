import { useState } from "react";
import { ArrowBigUp, ArrowBigDown, MessageCircle, Share2, Bookmark, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PostCardProps {
  id: string;
  community: string;
  communityIcon: string;
  author: string;
  timeAgo: string;
  title: string;
  content?: string;
  image?: string;
  upvotes: number;
  comments: number;
  index?: number;
}

const PostCard = ({
  community,
  communityIcon,
  author,
  timeAgo,
  title,
  content,
  image,
  upvotes: initialUpvotes,
  comments,
  index = 0,
}: PostCardProps) => {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [voteState, setVoteState] = useState<"up" | "down" | null>(null);

  const handleUpvote = () => {
    if (voteState === "up") {
      setUpvotes(initialUpvotes);
      setVoteState(null);
    } else {
      setUpvotes(initialUpvotes + 1);
      setVoteState("up");
    }
  };

  const handleDownvote = () => {
    if (voteState === "down") {
      setUpvotes(initialUpvotes);
      setVoteState(null);
    } else {
      setUpvotes(initialUpvotes - 1);
      setVoteState("down");
    }
  };

  return (
    <article
      className="group bg-card rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-in overflow-hidden"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-warm text-primary-foreground text-sm font-semibold">
              {communityIcon}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold hover:text-primary cursor-pointer transition-colors">
                w/{community}
              </span>
              <span className="text-xs text-muted-foreground">
                Posted by u/{author} · {timeAgo}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <h2 className="text-lg font-semibold mb-2 hover:text-primary cursor-pointer transition-colors leading-snug">
          {title}
        </h2>
        
        {content && (
          <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
            {content}
          </p>
        )}

        {image && (
          <div className="relative -mx-4 mb-3 overflow-hidden">
            <img
              src={image}
              alt={title}
              className="w-full h-auto max-h-96 object-cover"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 -ml-1.5">
          {/* Votes */}
          <div className="flex items-center gap-0.5 bg-secondary/50 rounded-full px-1">
            <button
              onClick={handleUpvote}
              className={cn(
                "vote-button vote-button-up",
                voteState === "up" && "active animate-vote-pop"
              )}
            >
              <ArrowBigUp className={cn("h-5 w-5", voteState === "up" && "fill-current")} />
            </button>
            <span className={cn(
              "text-sm font-semibold min-w-[2rem] text-center",
              voteState === "up" && "text-upvote",
              voteState === "down" && "text-downvote"
            )}>
              {upvotes.toLocaleString()}
            </span>
            <button
              onClick={handleDownvote}
              className={cn(
                "vote-button vote-button-down",
                voteState === "down" && "active animate-vote-pop"
              )}
            >
              <ArrowBigDown className={cn("h-5 w-5", voteState === "down" && "fill-current")} />
            </button>
          </div>

          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground rounded-full">
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm">{comments}</span>
          </Button>

          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground rounded-full">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Share</span>
          </Button>

          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-full ml-auto">
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
