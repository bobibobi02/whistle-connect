import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search as SearchIcon, Users, FileText, ArrowLeft, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import PostCard from "@/components/PostCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import KarmaBadge from "@/components/KarmaBadge";
import { useSearch } from "@/hooks/useSearch";
import { useUserSearch } from "@/hooks/useUserSearch";

const formatMemberCount = (count: number | null) => {
  if (!count) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
};

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: results, isLoading } = useSearch(query);
  const { data: users, isLoading: usersLoading } = useUserSearch(query);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value) {
      setSearchParams({ q: value });
    } else {
      setSearchParams({});
    }
  };
  const totalResults = (results?.posts.length || 0) + (results?.communities.length || 0) + (users?.length || 0);
  const isLoadingAny = isLoading || usersLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setMobileMenuOpen(true)} />
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Search</h1>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search posts and communities..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-11 h-12 text-lg bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
              autoFocus
            />
          </div>
          {query.length >= 2 && !isLoadingAny && (
            <p className="text-sm text-muted-foreground mt-2">
              {totalResults} result{totalResults !== 1 ? "s" : ""} for "{query}"
            </p>
          )}
        </div>

        {query.length < 2 ? (
          <div className="bg-card rounded-xl shadow-card p-8 text-center">
            <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Enter at least 2 characters to search</p>
          </div>
        ) : isLoadingAny ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : totalResults === 0 ? (
          <div className="bg-card rounded-xl shadow-card p-8 text-center">
            <p className="text-muted-foreground">No results found for "{query}"</p>
            <p className="text-sm text-muted-foreground mt-1">Try different keywords</p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All ({totalResults})
              </TabsTrigger>
              <TabsTrigger value="users">
                <User className="h-4 w-4 mr-1" />
                Users ({users?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="posts">
                <FileText className="h-4 w-4 mr-1" />
                Posts ({results?.posts.length || 0})
              </TabsTrigger>
              <TabsTrigger value="communities">
                <Users className="h-4 w-4 mr-1" />
                Communities ({results?.communities.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {/* Users Section */}
              {users && users.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">USERS</h3>
                  <div className="grid gap-2">
                    {users.slice(0, 3).map((user) => (
                      <Link
                        key={user.user_id}
                        to={`/u/${user.username || "anonymous"}`}
                        className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card hover:shadow-card-hover transition-all group"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {(user.display_name || user.username || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium group-hover:text-primary transition-colors">
                              {user.display_name || user.username || "Anonymous"}
                            </span>
                            {user.is_verified && <VerifiedBadge type="creator" />}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            u/{user.username || "anonymous"}
                          </p>
                        </div>
                        <KarmaBadge karma={user.karma || 0} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {results?.communities && results.communities.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">COMMUNITIES</h3>
                  <div className="grid gap-2">
                    {results.communities.slice(0, 3).map((community) => (
                      <Link
                        key={community.id}
                        to={`/c/${community.name}`}
                        className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card hover:shadow-card-hover transition-all group"
                      >
                        <span className="text-2xl">{community.icon || "💬"}</span>
                        <div className="flex-1">
                          <span className="font-medium group-hover:text-primary transition-colors">
                            w/{community.name}
                          </span>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {community.description || "No description"}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatMemberCount(community.member_count)} members
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {results?.posts && results.posts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">POSTS</h3>
                  <div className="space-y-4">
                    {results.posts.map((post, index) => (
                      <PostCard key={post.id} post={post} index={index} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-2">
              {users && users.length > 0 ? (
                users.map((user) => (
                  <Link
                    key={user.user_id}
                    to={`/u/${user.username || "anonymous"}`}
                    className="flex items-center gap-4 p-4 bg-card rounded-xl shadow-card hover:shadow-card-hover transition-all group"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {(user.display_name || user.username || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold group-hover:text-primary transition-colors">
                          {user.display_name || user.username || "Anonymous"}
                        </span>
                        {user.is_verified && <VerifiedBadge type="creator" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        u/{user.username || "anonymous"}
                      </p>
                      {user.bio && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {user.bio}
                        </p>
                      )}
                    </div>
                    <KarmaBadge karma={user.karma || 0} />
                  </Link>
                ))
              ) : (
                <div className="bg-card rounded-xl shadow-card p-8 text-center">
                  <p className="text-muted-foreground">No users found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="posts" className="space-y-4">
              {results?.posts && results.posts.length > 0 ? (
                results.posts.map((post, index) => (
                  <PostCard key={post.id} post={post} index={index} />
                ))
              ) : (
                <div className="bg-card rounded-xl shadow-card p-8 text-center">
                  <p className="text-muted-foreground">No posts found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="communities" className="space-y-2">
              {results?.communities && results.communities.length > 0 ? (
                results.communities.map((community) => (
                  <Link
                    key={community.id}
                    to={`/c/${community.name}`}
                    className="flex items-center gap-3 p-4 bg-card rounded-xl shadow-card hover:shadow-card-hover transition-all group"
                  >
                    <span className="text-3xl">{community.icon || "💬"}</span>
                    <div className="flex-1">
                      <span className="font-semibold group-hover:text-primary transition-colors">
                        w/{community.name}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {community.description || "No description"}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatMemberCount(community.member_count)} members
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="bg-card rounded-xl shadow-card p-8 text-center">
                  <p className="text-muted-foreground">No communities found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Search;
