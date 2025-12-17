import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import CommunitySidebar from "@/components/CommunitySidebar";
import CreatePostBar from "@/components/CreatePostBar";
import MobileNav from "@/components/MobileNav";
import VirtualizedPostList from "@/components/VirtualizedPostList";
import { useInfinitePosts, useJoinedCommunityPosts, useFollowingPosts, SortOption } from "@/hooks/usePosts";
import { useAuth } from "@/hooks/useAuth";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import FloatingActionButton from "@/components/FloatingActionButton";
import { Button } from "@/components/ui/button";
import { Users, Flame, TrendingUp, Clock, UserPlus, RefreshCw } from "lucide-react";

const sortOptions = [
  { value: "best" as SortOption, label: "Best", icon: Flame },
  { value: "hot" as SortOption, label: "Hot", icon: TrendingUp },
  { value: "new" as SortOption, label: "New", icon: Clock },
];

const Index = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [feedType, setFeedType] = useState<"all" | "joined" | "following">("all");
  const [sortBy, setSortBy] = useState<SortOption>("best");
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
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

  // Get the current feed data
  const getCurrentFeed = () => {
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
                    className={sortBy === option.value ? "bg-gradient-warm hover:opacity-90" : ""}
                  >
                    <option.icon className="h-4 w-4 mr-1.5" />
                    {option.label}
                  </Button>
                ))}
              </div>

              {/* Feed Type Toggle */}
              {user && (
                <div className="flex gap-1 p-1 bg-card rounded-lg shadow-card">
                  <Button
                    variant={feedType === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFeedType("all")}
                    className={feedType === "all" ? "bg-gradient-warm hover:opacity-90" : ""}
                  >
                    All
                  </Button>
                  <Button
                    variant={feedType === "joined" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFeedType("joined")}
                    className={feedType === "joined" ? "bg-gradient-warm hover:opacity-90" : ""}
                  >
                    <Users className="h-4 w-4 mr-1.5" />
                    Joined
                  </Button>
                  <Button
                    variant={feedType === "following" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFeedType("following")}
                    className={feedType === "following" ? "bg-gradient-warm hover:opacity-90" : ""}
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Following
                  </Button>
                </div>
              )}
            </div>
            
            {error ? (
              <div className="bg-card rounded-xl shadow-card p-8 text-center">
                <p className="text-muted-foreground">Failed to load posts. Please try again.</p>
              </div>
            ) : posts.length > 0 || isLoading ? (
              <VirtualizedPostList
                posts={posts}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                isLoading={isLoading}
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
          <CommunitySidebar className="hidden lg:block sticky top-24 h-fit" sortBy={sortBy} onSortChange={setSortBy} />
        </div>
      </main>

      <FloatingActionButton />
    </div>
  );
};

export default Index;
