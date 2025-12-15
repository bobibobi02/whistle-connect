import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import PostCard from "@/components/PostCard";
import CreatePostBar from "@/components/CreatePostBar";
import { useCommunityPosts } from "@/hooks/usePosts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";

const communityInfo: Record<string, { icon: string; description: string; members: string }> = {
  technology: { icon: "🖥️", description: "Discuss the latest in tech, gadgets, and innovation", members: "2.4M" },
  gaming: { icon: "🎮", description: "Everything about video games, esports, and gaming culture", members: "1.8M" },
  movies: { icon: "🎬", description: "Film discussions, reviews, and recommendations", members: "1.2M" },
  music: { icon: "🎵", description: "Share and discover music from all genres", members: "980K" },
  sports: { icon: "⚽", description: "Sports news, highlights, and discussions", members: "850K" },
  food: { icon: "🍕", description: "Recipes, restaurant reviews, and food culture", members: "720K" },
  general: { icon: "💬", description: "General discussions and conversations", members: "5.2M" },
};

const Community = () => {
  const { communityName } = useParams<{ communityName: string }>();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { data: posts, isLoading, error } = useCommunityPosts(communityName || "");

  const info = communityInfo[communityName || ""] || { 
    icon: "💬", 
    description: "A community for discussions", 
    members: "0" 
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(!isMobileNavOpen)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        {/* Community Header */}
        <div className="bg-card rounded-xl shadow-card p-6 mb-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{info.icon}</span>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">w/{communityName}</h1>
              <p className="text-muted-foreground mt-1">{info.description}</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{info.members} members</span>
              </div>
            </div>
            <Button variant="default" className="hidden sm:flex">
              Join Community
            </Button>
          </div>
        </div>

        {/* Create Post Bar */}
        <CreatePostBar />

        {/* Posts Feed */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))
          ) : error ? (
            <div className="bg-card rounded-xl p-8 text-center">
              <p className="text-destructive">Error loading posts</p>
            </div>
          ) : posts && posts.length > 0 ? (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="bg-card rounded-xl p-8 text-center">
              <p className="text-muted-foreground mb-4">No posts in this community yet</p>
              <Link to="/create">
                <Button>Create the first post</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Community;
