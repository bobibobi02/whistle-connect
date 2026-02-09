import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import CommunitySidebar from "@/components/CommunitySidebar";
import CreatePostBar from "@/components/CreatePostBar";
import MobileNav from "@/components/MobileNav";
import VirtualizedPostList, { VirtualizedPostListHandle } from "@/components/VirtualizedPostList";
import { useInfinitePosts, useJoinedCommunityPosts, useFollowingPosts, SortOption } from "@/hooks/usePosts";
import { useLivePosts } from "@/hooks/useLivePosts";
import { useForYouFeed, useUpdateFeedProfile } from "@/hooks/useForYouFeed";
import { useVideoQueue } from "@/hooks/useVideoQueue";
import { useAuth } from "@/hooks/useAuth";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import FloatingActionButton from "@/components/FloatingActionButton";
import { AdSlot } from "@/components/AdSlot";
import { Button } from "@/components/ui/button";
import { Users, Flame, TrendingUp, Clock, UserPlus, RefreshCw, Radio, Sparkles } from "lucide-react";

const sortOptions = [
  { value: "best" as SortOption, label: "Best", icon: Flame },
  { value: "hot" as SortOption, label: "Hot", icon: TrendingUp },
  { value: "new" as SortOption, label: "New", icon: Clock },
];

const Index = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { user } = useAuth();
  // Default to "all" feed for guests, "foryou" for logged-in users
  const [feedType, setFeedType] = useState<"all" | "foryou" | "joined" | "following" | "live">("all");
  const [sortBy, setSortBy] = useState<SortOption>("best");
  const navigate = useNavigate();
  
  const queryClient = useQueryClient();
  const { initializeQueue } = useVideoQueue();
  const { updateProfile } = useUpdateFeedProfile();
  
  // Switch feed type based on auth state
  useEffect(() => {
    if (user && feedType === "all") {
      setFeedType("foryou");
    }
    // On logout: reset to "all" if on auth-required feed, and clear cache
    if (!user && (feedType === "foryou" || feedType === "joined" || feedType === "following")) {
      setFeedType("all");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    }
  }, [user]);

  // Update feed profile periodically
  useEffect(() => {
    if (user) {
      updateProfile();
    }
  }, [user]);
  
  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
  }, [queryClient]);

  const { containerRef, isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });
  
  // All feeds now use infinite queries
  const allQuery = useInfinitePosts(sortBy);
  const joinedQuery = useJoinedCommunityPosts();
  const followingQuery = useFollowingPosts();
  const liveQuery = useLivePosts();
  const forYouQuery = useForYouFeed();

  // Get the current feed data
  const getCurrentFeed = () => {
    if (feedType === "foryou") {
      return {
        posts: forYouQuery.data?.pages.flatMap((page) => page.posts) ?? [],
        isLoading: forYouQuery.isLoading,
        error: forYouQuery.error,
        fetchNextPage: forYouQuery.fetchNextPage,
        hasNextPage: forYouQuery.hasNextPage,
        isFetchingNextPage: forYouQuery.isFetchingNextPage,
      };
    }
    if (feedType === "live") {
      return {
        posts: liveQuery.data?.pages.flatMap((page) => page.posts) ?? [],
        isLoading: liveQuery.isLoading,
        error: liveQuery.error,
        fetchNextPage: liveQuery.fetchNextPage,
        hasNextPage: liveQuery.hasNextPage,
        isFetchingNextPage: liveQuery.isFetchingNextPage,
      };
    }
    if (feedType === "joined") {
      return {
        posts: joinedQuery.data?.pages.flatMap((page) => page.posts) ?? [],
        isLoading: joinedQuery.isLoading,
        error: joinedQuery.error,
        fetchNextPage: joinedQuery.fetchNextPage,
        hasNextPage: joinedQuery.hasNextPage,
        isFetchingNextPage: joinedQuery.isFetchingNextPage,
      };
    }
    if (feedType === "following") {
      return {
        posts: followingQuery.data?.pages.flatMap((page) => page.posts) ?? [],
        isLoading: followingQuery.isLoading,
        error: followingQuery.error,
        fetchNextPage: followingQuery.fetchNextPage,
        hasNextPage: followingQuery.hasNextPage,
        isFetchingNextPage: followingQuery.isFetchingNextPage,
      };
    }
    return {
      posts: allQuery.data?.pages.flatMap((page) => page.posts) ?? [],
      isLoading: allQuery.isLoading,
      error: allQuery.error,
      fetchNextPage: allQuery.fetchNextPage,
      hasNextPage: allQuery.hasNextPage,
      isFetchingNextPage: allQuery.isFetchingNextPage,
    };
  };

  const { posts, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = getCurrentFeed();

  // Ref for virtualized list to enable keyboard navigation with scrollToIndex
  const virtualizedListRef = useRef<VirtualizedPostListHandle>(null);

  // Keyboard navigation (J/K)
  const { focusedId } = useKeyboardNavigation({
    items: posts,
    enabled: posts.length > 0 && !isLoading,
    virtualizerRef: virtualizedListRef as any,
  });

  // Initialize video queue when posts load
  useEffect(() => {
    if (posts.length > 0) {
      const firstVideoPost = posts.find((p) => p.video_url && !p.live_url);
      if (firstVideoPost) {
        initializeQueue(posts, firstVideoPost.id, feedType);
      }
    }
  }, [posts, feedType, initializeQueue]);

  // Handle post click - initialize video queue
  const handlePostClick = useCallback(
    (postId: string) => {
      initializeQueue(posts, postId, feedType);
      navigate(`/post/${postId}`);
    },
    [posts, feedType, initializeQueue, navigate]
  );

  return (
    <div className="min-h-screen bg-background" ref={containerRef}>
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      {/* Pull to refresh indicator */}
      <div 
        className="flex items-center justify-center overflow-hidden transition-all duration-200 lg:hidden"
        style={{ 
          height: pullDistance > 0 ? `${pullDistance}px` : 0,
          opacity: pullProgress 
        }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw 
            className={`h-5 w-5 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: isRefreshing ? undefined : `rotate(${pullProgress * 360}deg)` }}
          />
          <span className="text-sm">
            {isRefreshing ? 'Refreshing...' : pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      <main className="container max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main Feed */}
          <div className="flex-1 max-w-2xl">
            <CreatePostBar />

            {/* Feed Controls */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Sort Options */}
              <div className="flex gap-1 p-1 bg-card rounded-lg shadow-card">
                {sortOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={sortBy === option.value ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortBy(option.value)}
                    className={sortBy === option.value 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "hover:bg-primary/10 hover:text-primary"
                    }
                  >
                    <option.icon className="h-4 w-4 mr-1.5" />
                    {option.label}
                  </Button>
                ))}
              </div>

              {/* Feed Type Toggle */}
              <div className="flex gap-1 p-1 bg-card rounded-lg shadow-card overflow-x-auto">
                <Button
                  variant={feedType === "foryou" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFeedType("foryou")}
                  className={feedType === "foryou" 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "hover:bg-primary/10 hover:text-primary"
                  }
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  For You
                </Button>
                <Button
                  variant={feedType === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFeedType("all")}
                  className={feedType === "all" 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "hover:bg-primary/10 hover:text-primary"
                  }
                >
                  All
                </Button>
                <Button
                  variant={feedType === "live" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFeedType("live")}
                  className={feedType === "live" 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "hover:bg-primary/10 hover:text-primary"
                  }
                >
                  <Radio className="h-4 w-4 mr-1.5" />
                  Live
                </Button>
                {user && (
                  <>
                    <Button
                      variant={feedType === "joined" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setFeedType("joined")}
                      className={feedType === "joined" 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "hover:bg-primary/10 hover:text-primary"
                      }
                    >
                      <Users className="h-4 w-4 mr-1.5" />
                      Joined
                    </Button>
                    <Button
                      variant={feedType === "following" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setFeedType("following")}
                      className={feedType === "following" 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "hover:bg-primary/10 hover:text-primary"
                      }
                    >
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      Following
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {error ? (
              <div className="bg-card rounded-xl shadow-card p-8 text-center">
                <p className="text-muted-foreground">Failed to load posts. Please try again.</p>
              </div>
            ) : posts.length > 0 || isLoading ? (
              <VirtualizedPostList
                ref={virtualizedListRef}
                posts={posts}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                isLoading={isLoading}
                focusedPostId={focusedId}
              />
            ) : feedType === "joined" ? (
              <div className="bg-card rounded-xl shadow-card p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No posts from your communities yet.</p>
                <p className="text-sm text-muted-foreground mb-4">Join some communities to see their posts here!</p>
                <Link to="/communities">
                  <Button>Browse Communities</Button>
                </Link>
              </div>
            ) : feedType === "following" ? (
              <div className="bg-card rounded-xl shadow-card p-8 text-center">
                <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No posts from users you follow yet.</p>
                <p className="text-sm text-muted-foreground mb-4">Follow some users to see their posts here!</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl shadow-card p-8 text-center">
                <p className="text-muted-foreground mb-2">No posts yet.</p>
                <p className="text-sm text-muted-foreground">Be the first to create a post!</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block sticky top-24 h-fit space-y-4">
            <CommunitySidebar sortBy={sortBy} onSortChange={setSortBy} />
            <AdSlot placementKey="POST_VIEW_RAIL" variant="sidebar" />
          </div>
        </div>
      </main>

      <FloatingActionButton />
    </div>
  );
};

export default Index;
