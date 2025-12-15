import { useState } from "react";
import { ArrowBigUp, ArrowBigDown, MessageCircle, MoreHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface CommentData {
  id: string;
  author: string;
  timeAgo: string;
  content: string;
  upvotes: number;
  replies?: CommentData[];
}

interface CommentProps {
  comment: CommentData;
  depth?: number;
}

const Comment = ({ comment, depth = 0 }: CommentProps) => {
  const [upvotes, setUpvotes] = useState(comment.upvotes);
  const [voteState, setVoteState] = useState<"up" | "down" | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleUpvote = () => {
    if (voteState === "up") {
      setUpvotes(comment.upvotes);
      setVoteState(null);
    } else {
      setUpvotes(comment.upvotes + 1);
      setVoteState("up");
    }
  };

  const handleDownvote = () => {
    if (voteState === "down") {
      setUpvotes(comment.upvotes);
      setVoteState(null);
    } else {
      setUpvotes(comment.upvotes - 1);
      setVoteState("down");
    }
  };

  const maxDepth = 5;
  const shouldNest = depth < maxDepth;

  return (
    <div className={cn("relative", depth > 0 && "ml-4 sm:ml-6")}>
      {/* Thread line */}
      {depth > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-border hover:bg-primary/50 cursor-pointer transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
        />
      )}

      <div className={cn("pl-3", depth > 0 && "pl-4")}>
        {/* Comment header */}
        <div className="flex items-center gap-2 py-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
          <div className="h-6 w-6 rounded-full bg-gradient-warm flex items-center justify-center text-xs font-semibold text-primary-foreground">
            {comment.author[0].toUpperCase()}
          </div>
          <span className="text-sm font-medium hover:text-primary cursor-pointer transition-colors">
            u/{comment.author}
          </span>
          <span className="text-xs text-muted-foreground">· {comment.timeAgo}</span>
          {isCollapsed && comment.replies && comment.replies.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'})
            </span>
          )}
        </div>

        {/* Comment body */}
        {!isCollapsed && (
          <>
            <div className="py-2">
              <p className="text-sm leading-relaxed">{comment.content}</p>
            </div>

            {/* Comment actions */}
            <div className="flex items-center gap-1 -ml-1.5 pb-2">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleUpvote}
                  className={cn(
                    "vote-button vote-button-up h-7 w-7",
                    voteState === "up" && "active"
                  )}
                >
                  <ArrowBigUp className={cn("h-4 w-4", voteState === "up" && "fill-current")} />
                </button>
                <span className={cn(
                  "text-xs font-semibold min-w-[1.5rem] text-center",
                  voteState === "up" && "text-upvote",
                  voteState === "down" && "text-downvote"
                )}>
                  {upvotes}
                </span>
                <button
                  onClick={handleDownvote}
                  className={cn(
                    "vote-button vote-button-down h-7 w-7",
                    voteState === "down" && "active"
                  )}
                >
                  <ArrowBigDown className={cn("h-4 w-4", voteState === "down" && "fill-current")} />
                </button>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 text-muted-foreground hover:text-foreground h-7 text-xs"
                onClick={() => setIsReplying(!isReplying)}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Reply
              </Button>

              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Reply form */}
            {isReplying && (
              <div className="pb-3 animate-fade-in">
                <Textarea
                  placeholder="What are your thoughts?"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[80px] text-sm resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" disabled={!replyText.trim()}>
                    Reply
                  </Button>
                </div>
              </div>
            )}

            {/* Nested replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="space-y-1">
                {comment.replies.map((reply) => (
                  <Comment 
                    key={reply.id} 
                    comment={reply} 
                    depth={shouldNest ? depth + 1 : depth} 
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Comment;
