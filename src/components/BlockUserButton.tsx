import { useState } from "react";
import { Ban, Loader2 } from "lucide-react";
import { useBlockUser, useUnblockUser, useIsUserBlocked } from "@/hooks/useBlockedUsers";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface BlockUserButtonProps {
  userId: string;
  username?: string;
  variant?: "button" | "dropdown";
  onBlock?: () => void;
}

export function BlockUserButton({ userId, username, variant = "button", onBlock }: BlockUserButtonProps) {
  const { user } = useAuth();
  const { data: isBlocked, isLoading: isCheckingBlocked } = useIsUserBlocked(userId);
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const [isProcessing, setIsProcessing] = useState(false);

  // Don't show block button for own profile or if not logged in
  if (!user || user.id === userId) return null;

  const handleBlock = async () => {
    setIsProcessing(true);
    try {
      await blockUser.mutateAsync(userId);
      onBlock?.();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnblock = async () => {
    setIsProcessing(true);
    try {
      await unblockUser.mutateAsync(userId);
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = isCheckingBlocked || isProcessing;
  const displayName = username || "this user";

  if (variant === "dropdown") {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <DropdownMenuItem 
            onSelect={(e) => e.preventDefault()}
            disabled={isLoading}
            className={isBlocked ? "" : "text-destructive focus:text-destructive"}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Ban className="h-4 w-4 mr-2" />
            )}
            {isBlocked ? "Unblock User" : "Block User"}
          </DropdownMenuItem>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBlocked ? "Unblock" : "Block"} {displayName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBlocked 
                ? `This will allow ${displayName} to interact with your content again.`
                : `${displayName} won't be able to see your posts or interact with your content. You won't see their content either.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={isBlocked ? handleUnblock : handleBlock}
              className={isBlocked ? "" : "bg-destructive hover:bg-destructive/90"}
            >
              {isBlocked ? "Unblock" : "Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant={isBlocked ? "outline" : "destructive"} 
          size="sm" 
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Ban className="h-4 w-4" />
          )}
          {isBlocked ? "Unblock" : "Block"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBlocked ? "Unblock" : "Block"} {displayName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked 
              ? `This will allow ${displayName} to interact with your content again.`
              : `${displayName} won't be able to see your posts or interact with your content. You won't see their content either.`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={isBlocked ? handleUnblock : handleBlock}
            className={isBlocked ? "" : "bg-destructive hover:bg-destructive/90"}
          >
            {isBlocked ? "Unblock" : "Block"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
