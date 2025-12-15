import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import CommunitySidebar from "@/components/CommunitySidebar";
import CreatePostBar from "@/components/CreatePostBar";
import MobileNav from "@/components/MobileNav";
import { usePosts, useJoinedCommunityPosts, SortOption } from "@/hooks/usePosts";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, Flame, TrendingUp, Clock } from "lucide-react";

const sortOptions = [
  { value: "best" as SortOption, label: "Best", icon: Flame },
  { value: "hot" as SortOption, label: "Hot", icon: TrendingUp },
  { value: "new" as SortOption, label: "New", icon: Clock },
];

const Index = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [feedType, setFeedType] = useState<"all" | "joined">("all");
  const [sortBy, setSortBy] = useState<SortOption>("best");
  
  const { user } = useAuth();
  const { data: allPosts, isLoading: allLoading, error: allError } = usePosts(sortBy);
  const { data: joinedPosts, isLoading: joinedLoading, error: joinedError } = useJoinedCommunityPosts();

  const posts = feedType === "joined" ? joinedPosts : allPosts;
  const isLoading = feedType === "joined" ? joinedLoading : allLoading;
  const error = feedType === "joined" ? joinedError : allError;

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
