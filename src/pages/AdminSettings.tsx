import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, UserCog, Lock, Search, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin, AppRole } from "@/hooks/useUserRoles";
import { useUsersWithRoles, useAssignRole, useRemoveRole, UserWithRoles } from "@/hooks/useUserManagement";
import { formatDistanceToNow } from "date-fns";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useIsAdmin();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("moderator");

  const { data: users, isLoading: usersLoading } = useUsersWithRoles();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  if (authLoading || rolesLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setIsMobileNavOpen(true)} />
        <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
        <main className="container max-w-2xl mx-auto px-4 py-16 text-center">
          <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access admin settings.
            This area is restricted to administrators only.
          </p>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </main>
      </div>
    );
  }

  const filteredUsers = users?.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAssignRole = (userId: string) => {
    assignRole.mutate({ userId, role: selectedRole });
  };

  const handleRemoveRole = (userId: string, role: AppRole) => {
    removeRole.mutate({ userId, role });
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'moderator': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-4xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to feed
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <UserCog className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Admin Settings</h1>
            <p className="text-muted-foreground">Manage user roles and permissions</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User Role Management
            </CardTitle>
            <CardDescription>Assign or remove moderator and admin roles from users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {usersLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredUsers.map((userItem) => (
                    <UserRoleCard
                      key={userItem.user_id}
                      user={userItem}
                      currentUserId={user.id}
                      selectedRole={selectedRole}
                      onSelectRole={setSelectedRole}
                      onAssignRole={handleAssignRole}
                      onRemoveRole={handleRemoveRole}
                      isAssigning={assignRole.isPending}
                      isRemoving={removeRole.isPending}
                      getRoleBadgeVariant={getRoleBadgeVariant}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

interface UserRoleCardProps {
  user: UserWithRoles;
  currentUserId: string;
  selectedRole: AppRole;
  onSelectRole: (role: AppRole) => void;
  onAssignRole: (userId: string) => void;
  onRemoveRole: (userId: string, role: AppRole) => void;
  isAssigning: boolean;
  isRemoving: boolean;
  getRoleBadgeVariant: (role: AppRole) => "default" | "secondary" | "destructive" | "outline";
}

const UserRoleCard = ({
  user,
  currentUserId,
  selectedRole,
  onSelectRole,
  onAssignRole,
  onRemoveRole,
  isAssigning,
  isRemoving,
  getRoleBadgeVariant
}: UserRoleCardProps) => {
  const displayName = user.display_name || user.username || "Unknown User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isCurrentUser = user.user_id === currentUserId;

  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">
              {displayName}
              {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(you)</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              @{user.username || 'unknown'} · Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {user.roles.length > 0 ? (
            user.roles.map((role) => (
              <div key={role} className="flex items-center gap-1">
                <Badge variant={getRoleBadgeVariant(role)}>{role}</Badge>
                {!isCurrentUser && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        disabled={isRemoving}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {role} role?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the {role} role from {displayName}. They will lose associated permissions.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onRemoveRole(user.user_id, role)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove Role
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))
          ) : (
            <Badge variant="outline">No roles</Badge>
          )}

          {!isCurrentUser && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3 w-3" />
                  Add Role
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Assign role to {displayName}</AlertDialogTitle>
                  <AlertDialogDescription>
                    Select a role to assign to this user.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Select value={selectedRole} onValueChange={(v) => onSelectRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onAssignRole(user.user_id)}
                    disabled={isAssigning || user.roles.includes(selectedRole)}
                  >
                    {user.roles.includes(selectedRole) ? 'Already has role' : 'Assign Role'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
