import { TrendingUp, Flame, Clock, Users, Hash, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const communities = [
  { name: "technology", members: "2.4M", icon: "🖥️" },
  { name: "gaming", members: "1.8M", icon: "🎮" },
  { name: "movies", members: "1.2M", icon: "🎬" },
  { name: "music", members: "980K", icon: "🎵" },
  { name: "sports", members: "850K", icon: "⚽" },
  { name: "food", members: "720K", icon: "🍕" },
];

const trendingTopics = [
  { tag: "AI", posts: "12.5K" },
  { tag: "Gaming2024", posts: "8.2K" },
  { tag: "NewMusic", posts: "5.7K" },
  { tag: "TechNews", posts: "4.3K" },
];

const feedFilters = [
  { name: "Best", icon: Flame, active: true },
  { name: "Hot", icon: TrendingUp, active: false },
  { name: "New", icon: Clock, active: false },
];

interface CommunitySidebarProps {
  className?: string;
}

const CommunitySidebar = ({ className }: CommunitySidebarProps) => {
  return (
    <aside className={cn("w-72 space-y-4", className)}>
      {/* Feed Filter */}
      <div className="bg-card rounded-xl shadow-card p-4 animate-slide-in-right">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">FEED</h3>
        <div className="space-y-1">
          {feedFilters.map((filter) => (
            <Button
              key={filter.name}
              variant={filter.active ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                filter.active && "bg-primary/10 text-primary hover:bg-primary/15"
              )}
            >
              <filter.icon className="h-4 w-4" />
              {filter.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Trending Topics */}
      <div className="bg-card rounded-xl shadow-card p-4 animate-slide-in-right" style={{ animationDelay: "50ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">TRENDING</h3>
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-2">
          {trendingTopics.map((topic, idx) => (
            <div
              key={topic.tag}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium group-hover:text-primary transition-colors">
                  {topic.tag}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{topic.posts} posts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Communities */}
      <div className="bg-card rounded-xl shadow-card p-4 animate-slide-in-right" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">COMMUNITIES</h3>
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-1">
          {communities.map((community) => (
            <div
              key={community.name}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{community.icon}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    w/{community.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {community.members} members
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
        <Button variant="ghost" className="w-full mt-2 text-primary hover:text-primary hover:bg-primary/10">
          View All Communities
        </Button>
      </div>

      {/* Create Community CTA */}
      <div className="bg-gradient-warm rounded-xl p-4 text-primary-foreground animate-slide-in-right" style={{ animationDelay: "150ms" }}>
        <h3 className="font-semibold mb-1">Start Your Community</h3>
        <p className="text-sm opacity-90 mb-3">
          Create a space for your interests
        </p>
        <Button variant="secondary" className="w-full bg-card/20 hover:bg-card/30 border-0 text-primary-foreground">
          Create Community
        </Button>
      </div>
    </aside>
  );
};

export default CommunitySidebar;
