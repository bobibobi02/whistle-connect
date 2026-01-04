import { useState } from "react";
import { UserX, Loader2 } from "lucide-react";
import { useBlockedUsers, useUnblockUser } from "@/hooks/useBlockedUsers";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { formatDistanceToNow } from "date-fns";

export function BlockedUsersManager() {
  const { data: blockedUsers, isLoading } = useBlockedUsers();
  const unblockUser = useUnblockUser();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const handleUnblock = async (blockedId: string) => {
    setUnblockingId(blockedId);
    try {
      await unblockUser.mutateAsync(blockedId);
    } finally {
      setUnblockingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!blockedUsers || blockedUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <UserX className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">You haven't blocked any users</p>
        <p className="text-sm text-muted-foreground mt-1">
          Blocked users won't be able to interact with your content
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        {blockedUsers.length} blocked user{blockedUsers.length !== 1 ? "s" : ""}
      </p>
      
      {blockedUsers.map((blocked) => (
        <div
          key={blocked.id}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={blocked.blocked_profile?.avatar_url || undefined} />
              <AvatarFallback>
                {(blocked.blocked_profile?.display_name || blocked.blocked_profile?.username || "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {blocked.blocked_profile?.display_name || blocked.blocked_profile?.username || "Unknown User"}
              </p>
              {blocked.blocked_profile?.username && blocked.blocked_profile?.display_name && (
                <p className="text-sm text-muted-foreground">@{blocked.blocked_profile.username}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Blocked {formatDistanceToNow(new Date(blocked.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={unblockingId === blocked.blocked_id}
              >
                {unblockingId === blocked.blocked_id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Unblock"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unblock user?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will allow {blocked.blocked_profile?.display_name || "this user"} to interact with your content again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleUnblock(blocked.blocked_id)}>
                  Unblock
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
}
