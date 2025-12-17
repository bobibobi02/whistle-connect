import { useState } from "react";
import { Lock, Unlock, Pin, PinOff, Trash2, Check, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useLockPost,
  usePinPost,
  useRemovePost,
  useApprovePost,
  useSetPostFlair,
} from "@/hooks/useCommunityModeration";
import { useCommunityFlairs, CommunityFlair } from "@/hooks/useCommunityFlairs";
import { useCommunity } from "@/hooks/useCommunities";

interface PostModActionsProps {
  postId: string;
  communityName: string;
  isLocked?: boolean;
  isPinned?: boolean;
  isRemoved?: boolean;
  currentFlairId?: string | null;
}

const PostModActions = ({
  postId,
  communityName,
  isLocked = false,
  isPinned = false,
  isRemoved = false,
  currentFlairId,
}: PostModActionsProps) => {
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState("");

  const { data: community } = useCommunity(communityName);
  const { data: flairs } = useCommunityFlairs(community?.id);

  const lockPost = useLockPost();
  const pinPost = usePinPost();
  const removePost = useRemovePost();
  const approvePost = useApprovePost();
  const setPostFlair = useSetPostFlair();

  const communityId = community?.id;

  const handleLock = () => {
    if (!communityId) return;
    lockPost.mutate({ postId, communityId, locked: !isLocked });
  };

  const handlePin = () => {
    if (!communityId) return;
    pinPost.mutate({ postId, communityId, pinned: !isPinned });
  };

  const handleRemove = () => {
    if (!communityId) return;
    removePost.mutate({ postId, communityId, reason: removeReason || undefined });
    setRemoveDialogOpen(false);
    setRemoveReason("");
  };

  const handleApprove = () => {
    if (!communityId) return;
    approvePost.mutate({ postId, communityId });
  };

  const handleSetFlair = (flairId: string | null) => {
    setPostFlair.mutate({ postId, flairId });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-primary">
            Mod
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleLock}>
            {isLocked ? (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                Unlock Comments
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Lock Comments
              </>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handlePin}>
            {isPinned ? (
              <>
                <PinOff className="h-4 w-4 mr-2" />
                Unpin Post
              </>
            ) : (
              <>
                <Pin className="h-4 w-4 mr-2" />
                Pin Post
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {flairs && flairs.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Tag className="h-4 w-4 mr-2" />
                Set Flair
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleSetFlair(null)}>
                  <span className="text-muted-foreground">No flair</span>
                </DropdownMenuItem>
                {flairs.map((flair) => (
                  <DropdownMenuItem key={flair.id} onClick={() => handleSetFlair(flair.id)}>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium mr-2"
                      style={{
                        backgroundColor: flair.background_color,
                        color: flair.color,
                      }}
                    >
                      {flair.name}
                    </span>
                    {currentFlairId === flair.id && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          <DropdownMenuSeparator />

          {isRemoved ? (
            <DropdownMenuItem onClick={handleApprove} className="text-green-500">
              <Check className="h-4 w-4 mr-2" />
              Approve Post
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setRemoveDialogOpen(true)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Post
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Remove Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Post</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the post from the community. You can approve it later to restore it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Removal reason (optional)"
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PostModActions;
