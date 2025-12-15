import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Edit2, Users, Bookmark } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import PostCard from "@/components/PostCard";
import EditProfileDialog from "@/components/EditProfileDialog";
import { useAuth } from "@/hooks/useAuth";
import { useProfileByUsername, useUserPosts } from "@/hooks/useProfile";
import { useUserJoinedCommunities } from "@/hooks/useCommunities";
import { useBookmarkedPosts } from "@/hooks/useBookmarks";

const Profile = () => {
  const { username } = useParams();
  const { user } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: profile, isLoading: profileLoading } = useProfileByUsername(username || "");
  const { data: posts, isLoading: postsLoading } = useUserPosts(profile?.user_id || "");
  const { data: joinedCommunities, isLoading: communitiesLoading } = useUserJoinedCommunities(profile?.user_id);
  const { data: savedPosts, isLoading: savedLoading } = useBookmarkedPosts();

  const isOwnProfile = user && profile && user.id === profile.user_id;
  const displayName = profile?.display_name || profile?.username || "Anonymous";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-4xl mx-auto px-4 py-6">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to feed</span>
        </Link>

        {profileLoading ? (
          <div className="bg-card rounded-xl shadow-card p-6 mb-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
            </div>
          </div>
        ) : !profile ? (
          <div className="bg-card rounded-xl shadow-card p-8 text-center">
            <p className="text-muted-foreground">User not found.</p>
            <Link to="/" className="text-primary hover:underline mt-2 inline-block">
              Go back to feed
            </Link>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="bg-card rounded-xl shadow-card overflow-hidden mb-6 animate-fade-in">
              {/* Cover gradient */}
              <div className="h-32 bg-gradient-warm" />
              
              <div className="px-6 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                  <Avatar className="h-24 w-24 border-4 border-card">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-2xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 pt-2 sm:pt-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-bold">{displayName}</h1>
                        <p className="text-muted-foreground">u/{profile.username || "anonymous"}</p>
                      </div>
                      
                      {isOwnProfile && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => setIsEditOpen(true)}
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit Profile
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {profile.bio && (
                  <p className="mt-4 text-foreground/90">{profile.bio}</p>
                )}

                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {format(new Date(profile.created_at), "MMMM yyyy")}</span>
                </div>

                <div className="flex gap-6 mt-4">
                  <div>
                    <span className="font-bold">{posts?.length || 0}</span>
                    <span className="text-muted-foreground ml-1">posts</span>
                  </div>
                  <div>
                    <span className="font-bold">{joinedCommunities?.length || 0}</span>
                    <span className="text-muted-foreground ml-1">communities</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Joined Communities */}
            {(joinedCommunities && joinedCommunities.length > 0) && (
              <div className="mb-6 animate-fade-in" style={{ animationDelay: "50ms" }}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Communities
                </h2>
                <div className="flex flex-wrap gap-2">
                  {joinedCommunities.map((community) => (
                    <Link
                      key={community.id}
                      to={`/c/${community.name}`}
                      className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg shadow-card hover:shadow-card-hover transition-all group"
                    >
                      <span className="text-lg">{community.icon || "💬"}</span>
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">
                        w/{community.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {communitiesLoading && (
              <div className="mb-6">
                <Skeleton className="h-5 w-32 mb-3" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-28 rounded-lg" />
                  ))}
                </div>
              </div>
            )}

            {/* Posts and Saved Tabs */}
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="posts">
                  Posts ({posts?.length || 0})
                </TabsTrigger>
                {isOwnProfile && (
                  <TabsTrigger value="saved">
                    <Bookmark className="h-4 w-4 mr-1.5" />
                    Saved ({savedPosts?.length || 0})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="posts" className="space-y-4">
                {postsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-card rounded-xl shadow-card p-4">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                ) : posts && posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map((post, index) => (
                      <PostCard key={post.id} post={post} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-card rounded-xl shadow-card p-8 text-center">
                    <p className="text-muted-foreground">
                      {isOwnProfile ? "You haven't posted anything yet." : "No posts yet."}
                    </p>
                  </div>
                )}
              </TabsContent>

              {isOwnProfile && (
                <TabsContent value="saved" className="space-y-4">
                  {savedLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-card rounded-xl shadow-card p-4">
                          <Skeleton className="h-6 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : savedPosts && savedPosts.length > 0 ? (
                    <div className="space-y-4">
                      {savedPosts.map((post, index) => (
                        <PostCard key={post.id} post={post} index={index} />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-card rounded-xl shadow-card p-8 text-center">
                      <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-2">No saved posts yet</p>
                      <p className="text-sm text-muted-foreground">
                        Click the bookmark icon on posts to save them for later
                      </p>
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>

            {/* Edit Profile Dialog */}
            {isOwnProfile && (
              <EditProfileDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                profile={profile}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Profile;
