import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, ChevronRight, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import CreateCommunityDialog from "@/components/CreateCommunityDialog";
import { useCommunities } from "@/hooks/useCommunities";
import { useAuth } from "@/hooks/useAuth";

const formatMemberCount = (count: number | null) => {
  if (!count) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
};

const Communities = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const { user } = useAuth();
  const { data: communities, isLoading } = useCommunities();

  const filteredCommunities = communities?.filter((community) =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setMobileMenuOpen(true)} />
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <CreateCommunityDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Browse Communities</h1>
            <p className="text-muted-foreground">Discover and join communities that match your interests</p>
          </div>
          {user && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2 bg-gradient-warm hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </Button>
          )}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-xl">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredCommunities.map((community, index) => (
              <Link
                key={community.id}
                to={`/c/${community.name}`}
                className="flex items-center justify-between p-4 bg-card rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200 group animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl">
                    {community.icon || "💬"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold group-hover:text-primary transition-colors">
                        w/{community.name}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {community.description || "No description"}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{formatMemberCount(community.member_count)} members</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        )}

        {!isLoading && filteredCommunities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No communities found matching "{searchQuery}"</p>
          </div>
        )}

        <div className="mt-8 p-6 bg-gradient-warm rounded-xl text-primary-foreground text-center">
          <h3 className="font-semibold text-lg mb-2">Don't see what you're looking for?</h3>
          <p className="text-sm opacity-90 mb-4">Create your own community and build something amazing</p>
          <Button
            variant="secondary"
            className="bg-card/20 hover:bg-card/30 border-0 text-primary-foreground"
            onClick={() => user ? setCreateDialogOpen(true) : window.location.href = "/auth"}
          >
            Create Community
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Communities;
