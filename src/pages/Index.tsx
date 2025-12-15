import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import CommunitySidebar from "@/components/CommunitySidebar";
import CreatePostBar from "@/components/CreatePostBar";
import MobileNav from "@/components/MobileNav";
import { useInfinitePosts, useJoinedCommunityPosts, useFollowingPosts, SortOption } from "@/hooks/usePosts";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, Flame, TrendingUp, Clock, Loader2, UserPlus } from "lucide-react";

const sortOptions = [
  { value: "best" as SortOption, label: "Best", icon: Flame },
  { value: "hot" as SortOption, label: "Hot", icon: TrendingUp },
  { value: "new" as SortOption, label: "New", icon: Clock },
];

const Index = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [feedType, setFeedType] = useState<"all" | "joined" | "following">("all");
  const [sortBy, setSortBy] = useState<SortOption>("best");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const {
    data: infiniteData,
    isLoading: allLoading,
    error: allError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePosts(sortBy);
  const { data: joinedPosts, isLoading: joinedLoading, error: joinedError } = useJoinedCommunityPosts();
  const { data: followingPosts, isLoading: followingLoading, error: followingError } = useFollowingPosts();

  const allPosts = infiniteData?.pages.flatMap((page) => page.posts) ?? [];
  const posts = feedType === "joined" ? joinedPosts : feedType === "following" ? followingPosts : allPosts;
  const isLoading = feedType === "joined" ? joinedLoading : feedType === "following" ? followingLoading : allLoading;
  const error = feedType === "joined" ? joinedError : feedType === "following" ? followingError : allError;

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage && feedType === "all") {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage, feedType]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: "100px",
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

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
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card rounded-xl shadow-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-card rounded-xl shadow-card p-8 text-center">
                <p className="text-muted-foreground">Failed to load posts. Please try again.</p>
              </div>
            ) : posts && posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post, index) => (
                  <PostCard key={post.id} post={post} index={index} />
                ))}
                
                {/* Load more trigger */}
                {feedType === "all" && (
                  <div ref={loadMoreRef} className="py-4 flex justify-center">
                    {isFetchingNextPage ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Loading more...</span>
                      </div>
                    ) : hasNextPage ? (
                      <Button
                        variant="outline"
                        onClick={() => fetchNextPage()}
                        className="w-full max-w-xs"
                      >
                        Load More
                      </Button>
                    ) : posts.length > 10 ? (
                      <p className="text-sm text-muted-foreground">You've reached the end</p>
                    ) : null}
                  </div>
                )}
              </div>
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
    </div>
  );
};

export default Index;
