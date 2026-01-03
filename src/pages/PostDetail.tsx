import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { VideoAutoplayToggle } from "@/components/VideoAutoplayToggle";
import { VideoNavigationControls } from "@/components/VideoNavigationControls";
import { NsfwBadge } from "@/components/NsfwBadge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePost, useVotePost } from "@/hooks/usePosts";
import { useComments, useCreateComment, countTotalComments } from "@/hooks/useComments";
import { useVerifyBoostPayment, usePostBoostTotals } from "@/hooks/usePostBoosts";
import { useVideoQueue } from "@/hooks/useVideoQueue";
import { useFeedEvents } from "@/hooks/useFeedEvents";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const videoStartTimeRef = useRef<number | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const verifyBoost = useVerifyBoostPayment();
  const { autoplayEnabled, goToNextVideo, goToPreviousVideo, getNextVideoId, getCurrentPosition } = useVideoQueue();
  const { trackEvent, trackImmediately } = useFeedEvents();
  const isMobile = useIsMobile();

  // Swipe gesture handlers for mobile video navigation
  const swipeHandlers = useMemo(() => ({
    onSwipeUp: () => {
      const result = goToNextVideo();
      if (!result) toast.info("No more videos");
    },
    onSwipeDown: () => {
      const result = goToPreviousVideo();
      if (!result) toast.info("No previous video");
    },
  }), [goToNextVideo, goToPreviousVideo]);

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

  // Enable swipe only on video posts and mobile
  const hasVideo = !!post?.video_url && !post?.live_url;
  useSwipeGesture(videoContainerRef, swipeHandlers, { enabled: isMobile && hasVideo });

  // Use actual comments array length as source of truth for count
  const totalCommentCount = countTotalComments(comments);

  // Track which comment IDs we've seen to highlight new ones from real-time updates
  const seenCommentIds = useRef<Set<string>>(new Set());
  const [newCommentIds, setNewCommentIds] = useState<Set<string>>(new Set());

  // Update seen comments when comments change
  useEffect(() => {
    if (!comments) return;
    
    const allCommentIds = new Set<string>();
    const collectIds = (commentList: typeof comments) => {
      if (!commentList) return;
      for (const c of commentList) {
        allCommentIds.add(c.id);
        if (c.replies) collectIds(c.replies);
      }
    };
    collectIds(comments);

    // Find new comments (ones we haven't seen before)
    const newIds = new Set<string>();
    allCommentIds.forEach(id => {
      // Only mark as new if we've already loaded comments once (not initial load)
      // and it's not a temp optimistic comment
      if (seenCommentIds.current.size > 0 && !seenCommentIds.current.has(id) && !id.startsWith("temp-")) {
        newIds.add(id);
      }
    });

    if (newIds.size > 0) {
      setNewCommentIds(prev => new Set([...prev, ...newIds]));
      // Clear new status after 5 seconds
      setTimeout(() => {
        setNewCommentIds(prev => {
          const updated = new Set(prev);
          newIds.forEach(id => updated.delete(id));
          return updated;
        });
      }, 5000);
    }

    // Update seen IDs
    seenCommentIds.current = allCommentIds;
  }, [comments]);

  // Helper to check if a comment is new
  const isNewComment = (commentId: string): boolean => newCommentIds.has(commentId);

  // Video event handlers
  const handleVideoPlay = useCallback(() => {
    setManuallyPaused(false);
    videoStartTimeRef.current = Date.now();
    if (postId) {
      trackEvent({ postId, eventType: "view_start" });
    }
  }, [postId, trackEvent]);

  const handleVideoPause = useCallback(() => {
    setManuallyPaused(true);
    // Track watch time on pause
    if (postId && videoStartTimeRef.current) {
      const watchTimeMs = Date.now() - videoStartTimeRef.current;
      trackEvent({
        postId,
        eventType: "watch_time",
        watchTimeMs,
        videoDurationMs: post?.video_duration_seconds ? post.video_duration_seconds * 1000 : undefined,
      });
      videoStartTimeRef.current = null;
    }
  }, [postId, post?.video_duration_seconds, trackEvent]);

  const handleVideoEnded = useCallback(() => {
    // Track completion
    if (postId) {
      trackImmediately({ postId, eventType: "view_complete" });
    }

    // Auto-advance to next video if enabled and not manually paused
    if (autoplayEnabled && !manuallyPaused) {
      const nextId = goToNextVideo();
      if (!nextId) {
        toast.info("No more videos in queue");
      }
    }
  }, [postId, autoplayEnabled, manuallyPaused, goToNextVideo, trackImmediately]);

  const handleVideoProgress = useCallback((progress: number) => {
    // Preload next video when we're 80% through
    if (progress > 0.8 && autoplayEnabled) {
      const nextId = getNextVideoId();
      if (nextId) {
        // Prefetch next post data
        queryClient.prefetchQuery({ queryKey: ["post", nextId] });
      }
    }
  }, [autoplayEnabled, getNextVideoId, queryClient]);

  const handleVote = (type: 1 | -1) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!post) return;
    const newVote = post.user_vote === type ? null : type;
    votePost.mutate({ postId: post.id, voteType: newVote });
    // Track like event
    if (type === 1 && post.user_vote !== 1) {
      trackEvent({ postId: post.id, eventType: "like" });
    }
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
        onSuccess: () => {
          setCommentText("");
          trackEvent({ postId, eventType: "comment" });
        },
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
                    <div className="flex items-start gap-2 mb-4">
                      <h1 className="text-xl sm:text-2xl font-bold leading-tight flex-1">
                        {post.title}
                      </h1>
                      {(post as any).is_nsfw && <NsfwBadge size="md" />}
                    </div>
                    
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
                      <div ref={videoContainerRef} className="mb-6 relative touch-pan-x">
                        <VideoPlayer
                          src={post.video_url}
                          poster={post.poster_image_url || undefined}
                          className="w-full max-h-[600px] rounded-lg"
                          controls
                          postId={post.id}
                          onPlay={handleVideoPlay}
                          onPause={handleVideoPause}
                          onEnded={handleVideoEnded}
                          onProgress={handleVideoProgress}
                        />
                        {/* Video controls overlay */}
                        <div className="absolute top-2 right-2 flex items-center gap-2">
                          <VideoAutoplayToggle compact />
                        </div>
                        {/* Navigation controls on right side */}
                        <VideoNavigationControls className="absolute right-2 top-1/2 -translate-y-1/2" />
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
                        <Comment key={comment.id} comment={comment} isNew={isNewComment(comment.id)} />
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
