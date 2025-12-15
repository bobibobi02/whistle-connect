import { X, Home, Search, Bell, User, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/useNotifications";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { name: "Home", icon: Home, path: "/" },
  { name: "Search", icon: Search, path: "/search" },
  { name: "Notifications", icon: Bell, path: "/notifications" },
  { name: "Profile", icon: User, path: "/profile" },
];

const MobileNav = ({ isOpen, onClose }: MobileNavProps) => {
  const { data: unreadCount } = useUnreadCount();

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
              className="w-full justify-start gap-3 h-12 relative"
              asChild
            >
              <Link to={item.path} onClick={onClose}>
                <item.icon className="h-5 w-5" />
                {item.name}
                {item.name === "Notifications" && unreadCount && unreadCount > 0 && (
                  <span className="absolute right-4 h-5 min-w-5 px-1.5 rounded-full bg-primary text-[11px] font-bold text-primary-foreground flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Button className="w-full gap-2 bg-gradient-warm hover:opacity-90" asChild>
            <Link to="/create-post" onClick={onClose}>
              <Plus className="h-4 w-4" />
              Create Post
            </Link>
          </Button>
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
