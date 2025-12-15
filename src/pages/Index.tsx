import { useState } from "react";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import CommunitySidebar from "@/components/CommunitySidebar";
import CreatePostBar from "@/components/CreatePostBar";
import MobileNav from "@/components/MobileNav";
import { usePosts } from "@/hooks/usePosts";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { data: posts, isLoading, error } = usePosts();

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main Feed */}
          <div className="flex-1 max-w-2xl">
            <CreatePostBar />
            
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
            ) : (
              <div className="bg-card rounded-xl shadow-card p-8 text-center">
                <p className="text-muted-foreground mb-2">No posts yet.</p>
                <p className="text-sm text-muted-foreground">Be the first to create a post!</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <CommunitySidebar className="hidden lg:block sticky top-24 h-fit" />
        </div>
      </main>
    </div>
  );
};

export default Index;
