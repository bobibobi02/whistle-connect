import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowBigUp, ArrowBigDown, MessageCircle, Share2, Bookmark, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import CommentSkeleton from "@/components/CommentSkeleton";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import CommunitySidebar from "@/components/CommunitySidebar";
import Comment from "@/components/Comment";
import VideoPlayer from "@/components/VideoPlayer";
import BoostModal from "@/components/BoostModal";
import BoostBadge from "@/components/BoostBadge";
import LiveBadge from "@/components/LiveBadge";
import LiveEmbed from "@/components/LiveEmbed";
import { BoostMessagesList } from "@/components/BoostMessagesList";
import { BoostsSection } from "@/components/BoostsSection";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePost, useVotePost } from "@/hooks/usePosts";
import { useComments, useCreateComment } from "@/hooks/useComments";
import { useVerifyBoostPayment, usePostBoostTotals } from "@/hooks/usePostBoosts";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const verifyBoost = useVerifyBoostPayment();

  // Handle boost success/cancel feedback - verify payment and refetch boosts
  useEffect(() => {
    const boostStatus = searchParams.get("boost");
    if (boostStatus === "success") {
      // Check for pending boost ID in session storage
      const pendingBoostId = sessionStorage.getItem("pending_boost_id");
      console.log("[Boost] Success redirect, pending boost ID:", pendingBoostId);
      
      if (pendingBoostId) {
        // Verify the payment and update status
        verifyBoost.mutate(pendingBoostId);
        sessionStorage.removeItem("pending_boost_id");
      } else {
        toast.success("Thank you for your boost!");
      }
      
      // Refetch boosts immediately (both old and new tables)
      if (postId) {
        queryClient.invalidateQueries({ queryKey: ["paid-boosts", postId] });
        queryClient.invalidateQueries({ queryKey: ["succeeded-boosts", postId] });
        queryClient.invalidateQueries({ queryKey: ["post-boost-totals", postId] });
        queryClient.invalidateQueries({ queryKey: ["post-boosts", postId] });
      }
      
      // Remove the query param via replaceState
      window.history.replaceState({}, "", window.location.pathname);
    } else if (boostStatus === "cancelled") {
      sessionStorage.removeItem("pending_boost_id");
      toast.info("Boost cancelled");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams, postId, queryClient]);

  const { data: post, isLoading: postLoading } = usePost(postId || "");
  const { data: comments, isLoading: commentsLoading } = useComments(postId || "");
  const votePost = useVotePost();
  const createComment = useCreateComment();

  // Helper to count total comments including nested replies
  const countTotalComments = (commentList: typeof comments): number => {
    if (!commentList) return 0;
    let count = 0;
    const countRecursive = (items: typeof comments) => {
      if (!items) return;
      for (const item of items) {
        count++;
        if (item.replies && item.replies.length > 0) {
          countRecursive(item.replies);
        }
      }
    };
    countRecursive(commentList);
    return count;
  };

  // Use actual comments array length as source of truth for count
  const totalCommentCount = countTotalComments(comments);

  // Debug: Log count comparison
  console.log("[PostDetail] Comment count debug:", {
    postId,
    dbCount: post?.comment_count,
    actualCount: totalCommentCount,
    rootCommentsLength: comments?.length,
  });

  const handleVote = (type: 1 | -1) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!post) return;
    const newVote = post.user_vote === type ? null : type;
    votePost.mutate({ postId: post.id, voteType: newVote });
  };

  const handleSubmitComment = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!commentText.trim() || !postId) return;
    createComment.mutate(
      { postId, content: commentText },
      {
        onSuccess: () => setCommentText(""),
      }
    );
  };

  const authorName = post?.author.display_name || post?.author.username || "Anonymous";
  const timeAgo = post ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : "";

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 max-w-2xl">
            {/* Back button */}
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to feed</span>
            </Link>

            {postLoading ? (
              <div className="bg-card rounded-xl shadow-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : !post ? (
              <div className="bg-card rounded-xl shadow-card p-8 text-center">
                <p className="text-muted-foreground">Post not found.</p>
                <Link to="/" className="text-primary hover:underline mt-2 inline-block">
                  Go back to feed
                </Link>
              </div>
            ) : (
              <>
                {/* Post */}
                <article className="bg-card rounded-xl shadow-card overflow-hidden animate-fade-in">
                  <div className="p-4 sm:p-6">
                    {/* Status badges */}
                    {post.live_url && (
                      <div className="mb-4">
                        <LiveBadge />
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-warm text-primary-foreground text-lg font-semibold">
                          {post.community_icon || "💬"}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold hover:text-primary cursor-pointer transition-colors">
                            w/{post.community}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Posted by{" "}
                            <Link 
                              to={`/u/${post.author.username || "anonymous"}`}
                              className="hover:text-primary hover:underline"
                            >
                              u/{authorName}
                            </Link>
                            {" "}· {timeAgo}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <BoostBadge postId={post.id} />
                        <BoostModal postId={post.id} postTitle={post.title} />
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Title & Content */}
                    <h1 className="text-xl sm:text-2xl font-bold mb-4 leading-tight">
                      {post.title}
                    </h1>
                    
                    {post.content && (
                      <div className="prose prose-sm max-w-none text-foreground/90 mb-6">
                        {post.content.split('\n\n').map((paragraph, i) => (
                          <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
                        ))}
                      </div>
                    )}

                    {/* Live Embed */}
                    {post.live_url && (
                      <div className="mb-6">
                        <LiveEmbed url={post.live_url} className="rounded-lg" />
                      </div>
                    )}

                    {post.image_url && !post.video_url && !post.live_url && (
                      <div className="mb-6">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="w-full h-auto max-h-[600px] object-contain rounded-lg"
                        />
                      </div>
                    )}

                    {post.video_url && !post.live_url && (
                      <div className="mb-6">
                        <VideoPlayer
                          src={post.video_url}
                          poster={post.poster_image_url || undefined}
                          className="w-full max-h-[600px] rounded-lg"
                          controls
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-border">
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
                          {post.upvotes.toLocaleString()}
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

                      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground rounded-full">
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-sm">{commentsLoading ? post.comment_count : totalCommentCount}</span>
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

                {/* Supporter Messages */}
                <BoostMessagesList postId={post.id} />

                {/* Comment input */}
                <div className="bg-card rounded-xl shadow-card p-4 mt-4 animate-fade-in" style={{ animationDelay: "50ms" }}>
                  {user ? (
                    <>
                      <Textarea
                        placeholder="What are your thoughts?"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="min-h-[100px] resize-none"
                      />
                      <div className="flex justify-end mt-3">
                        <Button 
                          disabled={!commentText.trim() || createComment.isPending}
                          onClick={handleSubmitComment}
                        >
                          {createComment.isPending ? "Posting..." : "Comment"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Link to="/auth" className="block text-center py-4 text-muted-foreground hover:text-primary transition-colors">
                      Sign in to leave a comment
                    </Link>
                  )}
                </div>

                {/* Boosts Section - Above Comments */}
                <BoostsSection postId={post.id} />

                {/* Comments section */}
                <div className="bg-card rounded-xl shadow-card p-4 mt-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
                  <h2 className="font-semibold mb-4">Comments ({commentsLoading ? post.comment_count.toLocaleString() : totalCommentCount.toLocaleString()})</h2>
                  {commentsLoading ? (
                    <CommentSkeleton count={4} />
                  ) : comments && comments.length > 0 ? (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <Comment key={comment.id} comment={comment} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No comments yet. Be the first to share your thoughts!
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <CommunitySidebar className="hidden lg:block sticky top-24 h-fit" />
        </div>
      </main>
    </div>
  );
};

export default PostDetail;
