import { Link, useNavigate } from "react-router-dom";
import { ArrowBigUp, ArrowBigDown, MessageCircle, Share2, Bookmark, MoreHorizontal, Copy, Twitter, Facebook, Linkedin, Flag, Lock, Pin, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useVotePost, useDeletePost, Post } from "@/hooks/usePosts";
import { useBookmarks, useToggleBookmark } from "@/hooks/useBookmarks";
import { useComments, countTotalComments } from "@/hooks/useComments";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import ReportDialog from "@/components/ReportDialog";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { useIsMobile } from "@/hooks/use-mobile";
import PostModActions from "@/components/community/PostModActions";
import VideoPlayer from "@/components/VideoPlayer";
import BoostModal from "@/components/BoostModal";
import BoostBadge from "@/components/BoostBadge";
import LiveBadge from "@/components/LiveBadge";
import LiveEmbed from "@/components/LiveEmbed";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostCardProps {
  post: Post;
  index?: number;
  showModActions?: boolean;
}

const PostCard = ({ post, index = 0, showModActions = false }: PostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const votePost = useVotePost();
  const deletePost = useDeletePost();
  const { data: bookmarks } = useBookmarks();
  const toggleBookmark = useToggleBookmark();
  const isMobile = useIsMobile();
  
  // Fetch actual comments for accurate count
  const { data: comments } = useComments(post.id);
  const actualCommentCount = countTotalComments(comments);
  // Use actual count if comments loaded, otherwise fall back to post.comment_count
  const displayCommentCount = comments !== undefined ? actualCommentCount : post.comment_count;

  const isBookmarked = bookmarks?.includes(post.id) ?? false;
  const isOwner = user?.id === post.user_id;

  const authorName = post.author.display_name || post.author.username || "Anonymous";
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  const handleVote = (type: 1 | -1) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Don't allow voting on locked posts
    if (post.is_locked) {
      toast.error("This post is locked");
      return;
    }

    const newVote = post.user_vote === type ? null : type;
    votePost.mutate({ postId: post.id, voteType: newVote });
  };

  const postUrl = `${window.location.origin}/post/${post.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(postUrl);
    toast.success("Link copied to clipboard!");
  };

  const handleShareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`, "_blank");
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, "_blank");
  };

  const handleShareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`, "_blank");
  };

  const displayedUpvotes = post.upvotes + 
    (post.user_vote ? 0 : 0); // Vote is already counted in upvotes

  const handleDelete = () => {
    deletePost.mutate(post.id);
  };

  const cardContent = (
    <article
      className={cn(
        "group bg-card rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-in overflow-hidden card-interactive",
        post.is_removed && "opacity-60 border border-destructive/30"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="p-4">
        {/* Status indicators */}
        {(post.is_pinned || post.is_locked || post.is_removed || post.live_url) && (
          <div className="flex items-center gap-2 mb-2">
            {post.live_url && <LiveBadge />}
            {post.is_pinned && (
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
              </Badge>
            )}
            {post.is_locked && (
              <Badge variant="outline" className="text-orange-500 border-orange-500/30 bg-orange-500/10">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
            {post.is_removed && (
              <Badge variant="destructive">
                Removed
              </Badge>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-warm text-primary-foreground text-sm font-semibold">
              {post.community_icon || "💬"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold hover:text-primary cursor-pointer transition-colors">
                w/{post.community}
              </span>
              <span className="text-xs text-muted-foreground">
                Posted by{" "}
                <Link 
                  to={`/u/${post.author.username || "anonymous"}`}
                  className="hover:text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  u/{authorName}
                </Link>
                {" "}· {timeAgo}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {showModActions && (
              <PostModActions
                postId={post.id}
                communityName={post.community}
                isLocked={post.is_locked}
                isPinned={post.is_pinned}
                isRemoved={post.is_removed}
                currentFlairId={post.flair_id}
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <ReportDialog 
                  contentType="post" 
                  postId={post.id}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Flag className="h-4 w-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                  }
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Flair */}
        {post.flair && (
          <div className="mb-2">
            <Badge
              variant="outline"
              style={{
                backgroundColor: post.flair.background_color,
                color: post.flair.color,
                borderColor: post.flair.color,
              }}
            >
              {post.flair.name}
            </Badge>
          </div>
        )}

        {/* Content */}
        <Link to={`/post/${post.id}`}>
          <h2 className="text-lg font-semibold mb-2 hover:text-primary cursor-pointer transition-colors leading-snug">
            {post.title}
          </h2>
        </Link>
        
        {post.content && (
          <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
            {post.content}
          </p>
        )}

        {/* Live Embed */}
        {post.live_url && (
          <div className="relative -mx-4 mb-3 overflow-hidden">
            <LiveEmbed url={post.live_url} className="max-h-96" />
          </div>
        )}

        {/* Image (only if no video and no live) */}
        {post.image_url && !post.video_url && !post.live_url && (
          <div className="relative -mx-4 mb-3 overflow-hidden">
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full h-auto max-h-96 object-cover"
            />
          </div>
        )}

        {/* Video (only if no live) */}
        {post.video_url && !post.live_url && (
          <div className="relative -mx-4 mb-3 overflow-hidden">
            <VideoPlayer
              src={post.video_url}
              poster={post.poster_image_url || undefined}
              compact
              className="w-full max-h-96"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 -ml-1.5">
          {/* Votes */}
          <div className="flex items-center gap-0.5 bg-secondary/50 rounded-full px-1">
            <button
              onClick={() => handleVote(1)}
              className={cn(
                "vote-button vote-button-up",
                post.user_vote === 1 && "active animate-vote-pop"
              )}
              disabled={post.is_locked}
            >
              <ArrowBigUp className={cn("h-5 w-5", post.user_vote === 1 && "fill-current")} />
            </button>
            <span className={cn(
              "text-sm font-semibold min-w-[2rem] text-center",
              post.user_vote === 1 && "text-upvote",
              post.user_vote === -1 && "text-downvote"
            )}>
              {displayedUpvotes.toLocaleString()}
            </span>
            <button
              onClick={() => handleVote(-1)}
              className={cn(
                "vote-button vote-button-down",
                post.user_vote === -1 && "active animate-vote-pop"
              )}
              disabled={post.is_locked}
            >
              <ArrowBigDown className={cn("h-5 w-5", post.user_vote === -1 && "fill-current")} />
            </button>
          </div>

          <Link to={`/post/${post.id}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground rounded-full">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">{displayCommentCount}</span>
              {post.is_locked && <Lock className="h-3 w-3 ml-1 text-orange-500" />}
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground rounded-full">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Share</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShareTwitter}>
                <Twitter className="h-4 w-4 mr-2" />
                Share on X
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShareFacebook}>
                <Facebook className="h-4 w-4 mr-2" />
                Share on Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShareLinkedIn}>
                <Linkedin className="h-4 w-4 mr-2" />
                Share on LinkedIn
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Boost Button */}
          <BoostModal postId={post.id} postTitle={post.title} />
          
          {/* Boost Badge */}
          <BoostBadge postId={post.id} className="hidden sm:inline-flex" />

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground hover:text-foreground rounded-full ml-auto",
              isBookmarked && "text-primary"
            )}
            onClick={() => {
              if (!user) {
                navigate("/auth");
                return;
              }
              toggleBookmark.mutate({ postId: post.id, isBookmarked });
            }}
            disabled={toggleBookmark.isPending}
          >
            <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
          </Button>
        </div>
      </div>
    </article>
  );

  // Wrap in SwipeToDelete for owner on mobile
  if (isMobile && isOwner) {
    return (
      <SwipeToDelete 
        onDelete={handleDelete}
        confirmTitle="Delete this post?"
        confirmDescription="This will permanently delete your post and all its comments."
      >
        {cardContent}
      </SwipeToDelete>
    );
  }

  return cardContent;
};

export default PostCard;
