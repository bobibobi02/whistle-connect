import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowBigUp, ArrowBigDown, MessageCircle, MoreHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Comment as CommentType, useCreateComment, useVoteComment } from "@/hooks/useComments";
import { formatDistanceToNow } from "date-fns";

interface CommentProps {
  comment: CommentType;
  depth?: number;
}

const Comment = ({ comment, depth = 0 }: CommentProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createComment = useCreateComment();
  const voteComment = useVoteComment();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  const authorName = comment.author.display_name || comment.author.username || "Anonymous";
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });

  const handleReplyClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setIsReplying(!isReplying);
  };

  const handleVote = (type: 1 | -1) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const newVote = comment.user_vote === type ? null : type;
    voteComment.mutate({ commentId: comment.id, postId: comment.post_id, voteType: newVote });
  };

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    createComment.mutate(
      { postId: comment.post_id, content: replyText, parentId: comment.id },
      {
        onSuccess: () => {
          setReplyText("");
          setIsReplying(false);
        },
      }
    );
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
            {authorName[0].toUpperCase()}
          </div>
          <Link 
            to={`/u/${comment.author.username || "anonymous"}`}
            className="text-sm font-medium hover:text-primary cursor-pointer transition-colors"
          >
            u/{authorName}
          </Link>
          <span className="text-xs text-muted-foreground">· {timeAgo}</span>
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
                  onClick={() => handleVote(1)}
                  className={cn(
                    "vote-button vote-button-up h-7 w-7",
                    comment.user_vote === 1 && "active"
                  )}
                >
                  <ArrowBigUp className={cn("h-4 w-4", comment.user_vote === 1 && "fill-current")} />
                </button>
                <span className={cn(
                  "text-xs font-semibold min-w-[1.5rem] text-center",
                  comment.user_vote === 1 && "text-upvote",
                  comment.user_vote === -1 && "text-downvote"
                )}>
                  {comment.upvotes}
                </span>
                <button
                  onClick={() => handleVote(-1)}
                  className={cn(
                    "vote-button vote-button-down h-7 w-7",
                    comment.user_vote === -1 && "active"
                  )}
                >
                  <ArrowBigDown className={cn("h-4 w-4", comment.user_vote === -1 && "fill-current")} />
                </button>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 text-muted-foreground hover:text-foreground h-7 text-xs"
                onClick={handleReplyClick}
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
                  <Button 
                    size="sm" 
                    disabled={!replyText.trim() || createComment.isPending}
                    onClick={handleSubmitReply}
                  >
                    {createComment.isPending ? "Posting..." : "Reply"}
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
