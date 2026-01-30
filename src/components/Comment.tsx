import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowBigUp, ArrowBigDown, MessageCircle, MoreHorizontal, ChevronDown, ChevronUp, Flag, Rocket, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Comment as CommentType, useCreateComment, useVoteComment, useDeleteComment } from "@/hooks/useComments";
import { formatDistanceToNow } from "date-fns";
import ReportDialog from "@/components/ReportDialog";
import { BlockUserButton } from "@/components/BlockUserButton";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CommentProps {
  comment: CommentType;
  depth?: number;
  isNew?: boolean; // For real-time highlight animation
}

const Comment = ({ comment, depth = 0, isNew = false }: CommentProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createComment = useCreateComment();
  const voteComment = useVoteComment();
  const deleteComment = useDeleteComment();
  const isMobile = useIsMobile();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showHighlight, setShowHighlight] = useState(isNew);

  // Auto-fade the highlight after 3 seconds
  useEffect(() => {
    if (isNew) {
      setShowHighlight(true);
      const timer = setTimeout(() => setShowHighlight(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  const authorName = comment.author.display_name || comment.author.username || "Anonymous";
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });
  const isBoostComment = !!comment.boost_id;

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
  const isOwner = user?.id === comment.user_id;

  const handleDelete = () => {
    deleteComment.mutate({ commentId: comment.id, postId: comment.post_id });
  };

  const isRemoved = comment.is_removed === true;

  const commentContent = (
    <div className={cn(
      "relative transition-all duration-500",
      depth > 0 && "ml-4 sm:ml-6",
      isBoostComment && "bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20 p-2 -ml-2",
      showHighlight && !isBoostComment && "bg-primary/10 rounded-lg ring-2 ring-primary/30 animate-pulse",
      isRemoved && "opacity-60 bg-destructive/5 border border-destructive/20 rounded-lg p-2"
    )}>
      {/* Thread line */}
      {depth > 0 && !isBoostComment && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-border hover:bg-primary/50 cursor-pointer transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
        />
      )}

      <div className={cn("pl-3", depth > 0 && !isBoostComment && "pl-4")}>
        {/* Comment header */}
        <div className="flex items-center gap-2 py-1 flex-wrap">
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
          {isBoostComment ? (
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Rocket className="h-3.5 w-3.5 text-white" />
            </div>
          ) : (
            <div className="h-6 w-6 rounded-full bg-gradient-warm flex items-center justify-center text-xs font-semibold text-primary-foreground">
              {authorName[0].toUpperCase()}
            </div>
          )}
          <Link 
            to={`/u/${comment.author.username || "anonymous"}`}
            className="text-sm font-medium hover:text-primary cursor-pointer transition-colors"
          >
            u/{authorName}
          </Link>
          {isBoostComment && (
            <Badge variant="outline" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs px-1.5 py-0">
              <Rocket className="h-3 w-3 mr-1" />
              Boost {comment.boost_amount_cents && comment.boost_currency ? (
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: comment.boost_currency.toUpperCase(),
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                }).format(comment.boost_amount_cents / 100)
              ) : ''}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">· {timeAgo}</span>
          {isRemoved && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" />
              Removed
            </Badge>
          )}
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-7 w-7">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <ReportDialog 
                    contentType="comment" 
                    commentId={comment.id}
                    postId={comment.post_id}
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Flag className="h-4 w-4 mr-2" />
                        Report
                      </DropdownMenuItem>
                    }
                  />
                  {user && user.id !== comment.user_id && (
                    <>
                      <DropdownMenuSeparator />
                      <BlockUserButton 
                        userId={comment.user_id} 
                        username={comment.author.display_name || comment.author.username || undefined}
                        variant="dropdown"
                      />
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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

  // Wrap in SwipeToDelete for owner on mobile (only at depth 0 to avoid nesting issues)
  if (isMobile && isOwner && depth === 0) {
    return (
      <SwipeToDelete 
        onDelete={handleDelete}
        confirmTitle="Delete this comment?"
        confirmDescription="This will permanently delete your comment and all replies."
      >
        {commentContent}
      </SwipeToDelete>
    );
  }

  return commentContent;
};

export default Comment;
