import { Link } from "react-router-dom";
import { LogOut, User, Settings, Shield, UserCog, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsModerator, useIsAdmin } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const UserMenu = () => {
  const { user, profile, signOut } = useAuth();
  const { isModerator } = useIsModerator();
  const { isAdmin } = useIsAdmin();

  if (!user) {
    return (
      <Link to="/auth">
        <Button variant="outline" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          Sign in
        </Button>
      </Link>
    );
  }

  const displayName = profile?.display_name || profile?.username || "User";
  const username = profile?.username || "user";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-secondary text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={`/u/${username}`} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        {isModerator && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/mod-queue" className="cursor-pointer">
                <ClipboardList className="mr-2 h-4 w-4" />
                Mod Queue
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/moderation" className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4" />
                Moderation
              </Link>
            </DropdownMenuItem>
          </>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="cursor-pointer">
              <UserCog className="mr-2 h-4 w-4" />
              Admin Settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
