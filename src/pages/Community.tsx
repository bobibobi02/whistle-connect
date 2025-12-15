import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import PostCard from "@/components/PostCard";
import CreatePostBar from "@/components/CreatePostBar";
import { useCommunityPosts } from "@/hooks/usePosts";
import { useCommunity, useIsMember, useJoinCommunity, useLeaveCommunity } from "@/hooks/useCommunities";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, LogIn } from "lucide-react";

const formatMemberCount = (count: number | null) => {
  if (!count) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
};

const Community = () => {
  const { communityName } = useParams<{ communityName: string }>();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  const { user } = useAuth();
  const { data: community, isLoading: communityLoading } = useCommunity(communityName || "");
  const { data: posts, isLoading: postsLoading, error } = useCommunityPosts(communityName || "");
  const { data: isMember, isLoading: memberLoading } = useIsMember(community?.id, user?.id);
  
  const joinCommunity = useJoinCommunity();
  const leaveCommunity = useLeaveCommunity();

  const handleJoinLeave = () => {
    if (!user || !community) return;
    
    if (isMember) {
      leaveCommunity.mutate({ communityId: community.id, userId: user.id });
    } else {
      joinCommunity.mutate({ communityId: community.id, userId: user.id });
    }
  };

  const isActionLoading = joinCommunity.isPending || leaveCommunity.isPending || memberLoading;

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
        {communityLoading ? (
          <div className="bg-card rounded-xl shadow-card p-6 mb-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        ) : community ? (
          <div className="bg-card rounded-xl shadow-card p-6 mb-6 animate-fade-in">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{community.icon || "💬"}</span>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">w/{community.name}</h1>
                <p className="text-muted-foreground mt-1">{community.description || "A community for discussions"}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{formatMemberCount(community.member_count)} members</span>
                </div>
              </div>
              {user ? (
                <Button
                  variant={isMember ? "outline" : "default"}
                  className={!isMember ? "bg-gradient-warm hover:opacity-90" : ""}
                  onClick={handleJoinLeave}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? "..." : isMember ? "Leave" : "Join"}
                </Button>
              ) : (
                <Link to="/auth">
                  <Button variant="outline" className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Login to Join
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-card p-6 mb-6 text-center">
            <p className="text-muted-foreground">Community not found</p>
          </div>
        )}

        {/* Create Post Bar */}
        <CreatePostBar />

        {/* Posts Feed */}
        <div className="space-y-4">
          {postsLoading ? (
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
