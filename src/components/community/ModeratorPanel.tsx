import { useState } from "react";
import { Shield, Users, FileText, Tag, History, Ban } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import CommunityFlairManager from "./CommunityFlairManager";
import CommunityModeratorsManager from "./CommunityModeratorsManager";
import CommunityBanManager from "./CommunityBanManager";
import { useCommunityModLog } from "@/hooks/useCommunityModeration";

interface ModeratorPanelProps {
  communityId: string;
  communityName: string;
}

const ModeratorPanel = ({ communityId, communityName }: ModeratorPanelProps) => {
  const [activeTab, setActiveTab] = useState("moderators");
  const { data: modLogs } = useCommunityModLog(communityId);

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      assign_owner: "Assigned owner",
      assign_moderator: "Assigned moderator",
      assign_member: "Assigned member",
      assign_banned: "Banned user",
      assign_muted: "Muted user",
      remove_owner: "Removed owner",
      remove_moderator: "Removed moderator",
      remove_banned: "Unbanned user",
      remove_muted: "Unmuted user",
      create_rule: "Created rule",
      update_rule: "Updated rule",
      delete_rule: "Deleted rule",
      create_flair: "Created flair",
      delete_flair: "Deleted flair",
      lock_post: "Locked post",
      unlock_post: "Unlocked post",
      pin_post: "Pinned post",
      unpin_post: "Unpinned post",
      remove_post: "Removed post",
      approve_post: "Approved post",
      remove_comment: "Removed comment",
      approve_comment: "Approved comment",
      distinguish_comment: "Distinguished comment",
      undistinguish_comment: "Undistinguished comment",
    };
    return labels[action] || action;
  };

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Mod Tools - w/{communityName}
        </h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0">
          <TabsTrigger
            value="moderators"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Users className="h-4 w-4 mr-2" />
            Mods
          </TabsTrigger>
          <TabsTrigger
            value="flairs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Tag className="h-4 w-4 mr-2" />
            Flairs
          </TabsTrigger>
          <TabsTrigger
            value="bans"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Ban className="h-4 w-4 mr-2" />
            Bans
          </TabsTrigger>
          <TabsTrigger
            value="log"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <History className="h-4 w-4 mr-2" />
            Log
          </TabsTrigger>
        </TabsList>

        <div className="p-4">
          <TabsContent value="moderators" className="mt-0">
            <CommunityModeratorsManager communityId={communityId} />
          </TabsContent>

          <TabsContent value="flairs" className="mt-0">
            <CommunityFlairManager communityId={communityId} />
          </TabsContent>

          <TabsContent value="bans" className="mt-0">
            <CommunityBanManager communityId={communityId} />
          </TabsContent>

          <TabsContent value="log" className="mt-0">
            <ScrollArea className="h-[300px]">
              {modLogs && modLogs.length > 0 ? (
                <div className="space-y-2">
                  {modLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded-lg bg-secondary/30 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getActionLabel(log.action)}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        by {log.mod?.display_name || log.mod?.username || "Unknown"}
                        {log.target_user && (
                          <> → {log.target_user.display_name || log.target_user.username}</>
                        )}
                      </p>
                      {log.details?.reason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reason: {log.details.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No moderation actions yet
                </p>
              )}
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ModeratorPanel;
