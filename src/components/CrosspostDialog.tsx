import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUserJoinedCommunities } from "@/hooks/useCommunities";
import { Post } from "@/hooks/usePosts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CrosspostDialogProps {
  post: Post;
  trigger?: React.ReactNode;
}

export function CrosspostDialog({ post, trigger }: CrosspostDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  const { user } = useAuth();
  const { data: communities, isLoading } = useUserJoinedCommunities(user?.id);

  // Filter out the original post's community
  const availableCommunities = communities?.filter(
    (c) => c.name !== post.community
  ) || [];

  const handleToggleCommunity = (communityName: string) => {
    setSelectedCommunities((prev) =>
      prev.includes(communityName)
        ? prev.filter((c) => c !== communityName)
        : [...prev, communityName]
    );
  };

  const handleCrosspost = async () => {
    if (selectedCommunities.length === 0) {
      toast.error("Please select at least one community");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to crosspost");
      return;
    }

    setIsPosting(true);

    try {
      for (const communityName of selectedCommunities) {
        const community = availableCommunities.find((c) => c.name === communityName);
        
        const { error } = await supabase.from("posts").insert({
          user_id: user.id,
          title: post.title,
          content: post.content || null,
          image_url: post.image_url || null,
          video_url: post.video_url || null,
          video_mime_type: post.video_mime_type || null,
          live_url: post.live_url || null,
          community: communityName,
          community_icon: community?.icon || "💬",
          crosspost_of: post.id,
        });
        
        if (error) throw error;
      }

      toast.success(`Crossposted to ${selectedCommunities.length} communities`);
      setOpen(false);
      setSelectedCommunities([]);
    } catch (error) {
      toast.error("Failed to crosspost");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Copy className="h-4 w-4" />
            Crosspost
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crosspost to Communities</DialogTitle>
          <DialogDescription>
            Share this post to other communities you've joined.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
            <p className="text-sm font-medium line-clamp-2">{post.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              From w/{post.community}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableCommunities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No other communities to crosspost to.</p>
              <p className="text-sm mt-1">Join more communities to crosspost.</p>
            </div>
          ) : (
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {availableCommunities.map((community) => (
                  <div
                    key={community.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => handleToggleCommunity(community.name)}
                  >
                    <Checkbox
                      checked={selectedCommunities.includes(community.name)}
                      onCheckedChange={() => handleToggleCommunity(community.name)}
                    />
                    <span className="text-xl">{community.icon || "💬"}</span>
                    <div className="flex-1">
                      <p className="font-medium">w/{community.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {community.member_count?.toLocaleString() || 0} members
                      </p>
                    </div>
                    {selectedCommunities.includes(community.name) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCrosspost}
            disabled={selectedCommunities.length === 0 || isPosting}
          >
            {isPosting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Posting...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Crosspost to {selectedCommunities.length || ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
