import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";

const communities = [
  { name: "technology", members: "2.4M", icon: "🖥️", description: "Discuss the latest in tech, gadgets, and innovation" },
  { name: "gaming", members: "1.8M", icon: "🎮", description: "Gaming news, reviews, and discussions" },
  { name: "movies", members: "1.2M", icon: "🎬", description: "Film discussions, reviews, and recommendations" },
  { name: "music", members: "980K", icon: "🎵", description: "Share and discover music from all genres" },
  { name: "sports", members: "850K", icon: "⚽", description: "Sports news, highlights, and fan discussions" },
  { name: "food", members: "720K", icon: "🍕", description: "Recipes, restaurant reviews, and foodie culture" },
  { name: "general", members: "500K", icon: "💬", description: "General discussions and conversations" },
  { name: "science", members: "450K", icon: "🔬", description: "Scientific discoveries and discussions" },
  { name: "art", members: "380K", icon: "🎨", description: "Share and appreciate art in all forms" },
  { name: "books", members: "320K", icon: "📚", description: "Book recommendations and literary discussions" },
  { name: "travel", members: "290K", icon: "✈️", description: "Travel tips, stories, and destination guides" },
  { name: "fitness", members: "260K", icon: "💪", description: "Workout tips, nutrition, and health discussions" },
];

const Communities = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCommunities = communities.filter((community) =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setMobileMenuOpen(true)} />
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse Communities</h1>
          <p className="text-muted-foreground">Discover and join communities that match your interests</p>
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

        <div className="grid gap-3">
          {filteredCommunities.map((community, index) => (
            <Link
              key={community.name}
              to={`/c/${community.name}`}
              className="flex items-center justify-between p-4 bg-card rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200 group animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl">
                  {community.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold group-hover:text-primary transition-colors">
                      w/{community.name}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {community.description}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{community.members} members</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>

        {filteredCommunities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No communities found matching "{searchQuery}"</p>
          </div>
        )}

        <div className="mt-8 p-6 bg-gradient-warm rounded-xl text-primary-foreground text-center">
          <h3 className="font-semibold text-lg mb-2">Don't see what you're looking for?</h3>
          <p className="text-sm opacity-90 mb-4">Create your own community and build something amazing</p>
          <Button variant="secondary" className="bg-card/20 hover:bg-card/30 border-0 text-primary-foreground">
            Create Community
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Communities;
