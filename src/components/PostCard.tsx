import { Link, useNavigate } from "react-router-dom";
import { ArrowBigUp, ArrowBigDown, MessageCircle, Share2, Bookmark, MoreHorizontal, Copy, Twitter, Facebook, Linkedin, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useVotePost, Post } from "@/hooks/usePosts";
import { useBookmarks, useToggleBookmark } from "@/hooks/useBookmarks";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import ReportDialog from "@/components/ReportDialog";
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
}

const PostCard = ({ post, index = 0 }: PostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const votePost = useVotePost();
  const { data: bookmarks } = useBookmarks();
  const toggleBookmark = useToggleBookmark();

  const isBookmarked = bookmarks?.includes(post.id) ?? false;

  const authorName = post.author.display_name || post.author.username || "Anonymous";
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  const handleVote = (type: 1 | -1) => {
    if (!user) {
      navigate("/auth");
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

        {post.image_url && (
          <div className="relative -mx-4 mb-3 overflow-hidden">
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full h-auto max-h-96 object-cover"
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
            >
              <ArrowBigDown className={cn("h-5 w-5", post.user_vote === -1 && "fill-current")} />
            </button>
          </div>

          <Link to={`/post/${post.id}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground rounded-full">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">{post.comment_count}</span>
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
};

export default PostCard;
