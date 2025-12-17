import { useState } from "react";
import { Plus, Crown, Shield, UserX, VolumeX, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCommunityRoles,
  useAssignCommunityRole,
  useRemoveCommunityRole,
  CommunityRole,
  CommunityRoleRecord,
} from "@/hooks/useCommunityRoles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CommunityModeratorsManagerProps {
  communityId: string;
}

const ROLE_ICONS: Record<CommunityRole, typeof Crown> = {
  owner: Crown,
  moderator: Shield,
  member: Shield,
  banned: UserX,
  muted: VolumeX,
};

const ROLE_COLORS: Record<CommunityRole, string> = {
  owner: "text-yellow-500",
  moderator: "text-primary",
  member: "text-muted-foreground",
  banned: "text-destructive",
  muted: "text-orange-500",
};

const CommunityModeratorsManager = ({ communityId }: CommunityModeratorsManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [selectedRole, setSelectedRole] = useState<CommunityRole>("moderator");
  const [reason, setReason] = useState("");
  const [removeRole, setRemoveRole] = useState<CommunityRoleRecord | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const { data: roles, isLoading } = useCommunityRoles(communityId);
  const assignRole = useAssignCommunityRole();
  const removeRoleMutation = useRemoveCommunityRole();
  const { toast } = useToast();

  const owners = roles?.filter((r) => r.role === "owner") || [];
  const moderators = roles?.filter((r) => r.role === "moderator") || [];
  const banned = roles?.filter((r) => r.role === "banned") || [];
  const muted = roles?.filter((r) => r.role === "muted") || [];

  const handleAddRole = async () => {
    if (!username.trim()) return;

    setIsSearching(true);
    try {
      // Find user by username
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", username.trim())
        .maybeSingle();

      if (error) throw error;
      if (!profile) {
        toast({
          title: "User not found",
          description: `No user found with username "${username}"`,
          variant: "destructive",
        });
        return;
      }

      assignRole.mutate({
        communityId,
        userId: profile.user_id,
        role: selectedRole,
        reason: reason.trim() || undefined,
      });
      setIsDialogOpen(false);
      setUsername("");
      setReason("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to find user",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveRole = () => {
    if (removeRole) {
      removeRoleMutation.mutate({
        communityId,
        userId: removeRole.user_id,
        role: removeRole.role,
      });
      setRemoveRole(null);
    }
  };

  const RoleSection = ({
    title,
    roleList,
    icon: Icon,
    canRemove = true,
  }: {
    title: string;
    roleList: CommunityRoleRecord[];
    icon: typeof Crown;
    canRemove?: boolean;
  }) => (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {title} ({roleList.length})
      </h4>
      {roleList.length > 0 ? (
        <div className="space-y-1">
          {roleList.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 group"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={role.profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {(role.profile?.username || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">
                  {role.profile?.display_name || role.profile?.username || "Unknown"}
                </span>
              </div>
              {canRemove && role.role !== "owner" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                  onClick={() => setRemoveRole(role)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">None</p>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-secondary rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add User
        </Button>

        <RoleSection title="Owners" roleList={owners} icon={Crown} canRemove={false} />
        <RoleSection title="Moderators" roleList={moderators} icon={Shield} />
        <RoleSection title="Banned" roleList={banned} icon={UserX} />
        <RoleSection title="Muted" roleList={muted} icon={VolumeX} />
      </div>

      {/* Add User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as CommunityRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderator">
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Moderator
                    </span>
                  </SelectItem>
                  <SelectItem value="banned">
                    <span className="flex items-center gap-2">
                      <UserX className="h-4 w-4" />
                      Banned
                    </span>
                  </SelectItem>
                  <SelectItem value="muted">
                    <span className="flex items-center gap-2">
                      <VolumeX className="h-4 w-4" />
                      Muted
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(selectedRole === "banned" || selectedRole === "muted") && (
              <div>
                <Input
                  placeholder="Reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddRole}
              disabled={!username.trim() || isSearching || assignRole.isPending}
            >
              {isSearching ? "Searching..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeRole} onOpenChange={() => setRemoveRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removeRole?.profile?.display_name || removeRole?.profile?.username}'s {removeRole?.role} role?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveRole} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CommunityModeratorsManager;
