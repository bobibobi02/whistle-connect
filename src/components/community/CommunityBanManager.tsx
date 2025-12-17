import { useState } from "react";
import { Ban, Clock, User, X, AlertTriangle, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCommunityRoles, useAssignCommunityRole, useRemoveCommunityRole, CommunityRole } from "@/hooks/useCommunityRoles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface CommunityBanManagerProps {
  communityId: string;
}

const CommunityBanManager = ({ communityId }: CommunityBanManagerProps) => {
  const { toast } = useToast();
  const { data: roles, isLoading } = useCommunityRoles(communityId);
  const assignRole = useAssignCommunityRole();
  const removeRole = useRemoveCommunityRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'banned' | 'muted'>('banned');
  const [username, setUsername] = useState("");
  const [reason, setReason] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [duration, setDuration] = useState("7");
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  const bannedUsers = roles?.filter(r => r.role === 'banned') || [];
  const mutedUsers = roles?.filter(r => r.role === 'muted') || [];

  const handleAction = async () => {
    if (!username.trim()) {
      toast({ title: "Please enter a username", variant: "destructive" });
      return;
    }

    // Find user by username
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .eq("username", username.trim())
      .maybeSingle();

    if (!profile) {
      toast({ title: "User not found", variant: "destructive" });
      return;
    }

    const expiresAt = isPermanent ? null : new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000).toISOString();

    assignRole.mutate({
      communityId,
      userId: profile.user_id,
      role: actionType,
      reason: reason || undefined,
      expiresAt: expiresAt || undefined
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setUsername("");
        setReason("");
        setIsPermanent(false);
        setDuration("7");
      }
    });
  };

  const handleRemove = () => {
    if (!selectedRole) return;
    removeRole.mutate({
      communityId,
      userId: selectedRole.user_id,
      role: selectedRole.role
    });
    setRemoveDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bans & Mutes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Bans & Mutes</CardTitle>
            <CardDescription>Manage banned and muted users</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setActionType('banned');
                setDialogOpen(true);
              }}
            >
              <Ban className="h-4 w-4 mr-1" />
              Ban User
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActionType('muted');
                setDialogOpen(true);
              }}
            >
              <VolumeX className="h-4 w-4 mr-1" />
              Mute User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bannedUsers.length === 0 && mutedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No banned or muted users</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {bannedUsers.map((role) => (
                  <UserBanCard
                    key={role.id}
                    role={role}
                    type="banned"
                    onRemove={() => {
                      setSelectedRole(role);
                      setRemoveDialogOpen(true);
                    }}
                  />
                ))}
                {mutedUsers.map((role) => (
                  <UserBanCard
                    key={role.id}
                    role={role}
                    type="muted"
                    onRemove={() => {
                      setSelectedRole(role);
                      setRemoveDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Ban/Mute Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'banned' ? (
                <><Ban className="h-5 w-5 text-destructive" /> Ban User</>
              ) : (
                <><VolumeX className="h-5 w-5 text-yellow-500" /> Mute User</>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'banned' 
                ? "Banned users cannot post, comment, or vote in this community."
                : "Muted users can view content but cannot post or comment."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Reason for this action..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Permanent</Label>
              <Switch checked={isPermanent} onCheckedChange={setIsPermanent} />
            </div>

            {!isPermanent && (
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'banned' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={assignRole.isPending}
            >
              {assignRole.isPending ? 'Processing...' : actionType === 'banned' ? 'Ban User' : 'Mute User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedRole?.role}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will allow {selectedRole?.profile?.display_name || selectedRole?.profile?.username} to participate in this community again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>
              Remove {selectedRole?.role}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const UserBanCard = ({ 
  role, 
  type, 
  onRemove 
}: { 
  role: any; 
  type: 'banned' | 'muted'; 
  onRemove: () => void;
}) => {
  const isExpired = role.expires_at && new Date(role.expires_at) < new Date();

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${isExpired ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${type === 'banned' ? 'bg-destructive/10' : 'bg-yellow-500/10'}`}>
          {type === 'banned' ? (
            <Ban className={`h-4 w-4 ${type === 'banned' ? 'text-destructive' : 'text-yellow-500'}`} />
          ) : (
            <VolumeX className="h-4 w-4 text-yellow-500" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {role.profile?.display_name || role.profile?.username || 'Unknown user'}
            </span>
            <Badge variant={type === 'banned' ? 'destructive' : 'outline'}>
              {type}
            </Badge>
            {isExpired && <Badge variant="secondary">Expired</Badge>}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {role.expires_at ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {isExpired ? 'Expired' : `Expires ${formatDistanceToNow(new Date(role.expires_at), { addSuffix: true })}`}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Permanent
              </span>
            )}
          </div>
          {role.reason && (
            <p className="text-xs text-muted-foreground mt-1 italic">"{role.reason}"</p>
          )}
        </div>
      </div>
      <Button size="sm" variant="ghost" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default CommunityBanManager;
