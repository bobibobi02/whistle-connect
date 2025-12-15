import { Search, Bell, Plus, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left: Logo & Menu */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-warm">
              <span className="text-lg font-bold text-primary-foreground">W</span>
            </div>
            <span className="text-xl font-bold tracking-tight">
              Whistle
            </span>
          </div>
        </div>

        {/* Center: Search */}
        <div className="hidden flex-1 max-w-xl mx-8 md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search communities, posts..."
              className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Bell className="h-5 w-5" />
          </Button>
          
          <Button className="gap-2 bg-gradient-warm hover:opacity-90 transition-opacity shadow-glow">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create</span>
          </Button>

          <Button variant="ghost" size="icon" className="rounded-full">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
              <User className="h-4 w-4" />
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
