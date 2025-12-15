import { X, Home, Search, Bell, User, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { name: "Home", icon: Home },
  { name: "Search", icon: Search },
  { name: "Notifications", icon: Bell },
  { name: "Profile", icon: User },
];

const MobileNav = ({ isOpen, onClose }: MobileNavProps) => {
  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm transition-opacity md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <nav
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 bg-card shadow-xl transition-transform duration-300 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-warm">
              <span className="text-lg font-bold text-primary-foreground">W</span>
            </div>
            <span className="text-xl font-bold">Whistle</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              className="w-full justify-start gap-3 h-12"
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Button>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Button className="w-full gap-2 bg-gradient-warm hover:opacity-90">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
