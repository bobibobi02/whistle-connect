import { Clock, User, FileText, MessageSquare, Shield, Ban, Pin, Lock, Tag, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommunityModLog } from "@/hooks/useCommunityModeration";
import { formatDistanceToNow } from "date-fns";

interface CommunityModLogProps {
  communityId: string;
}

const ACTION_ICONS: Record<string, any> = {
  lock_post: Lock,
  unlock_post: Lock,
  pin_post: Pin,
  unpin_post: Pin,
  remove_post: XCircle,
  approve_post: CheckCircle,
  remove_comment: XCircle,
  approve_comment: CheckCircle,
  distinguish_comment: Shield,
  undistinguish_comment: Shield,
  set_flair: Tag,
  assign_role: User,
  remove_role: User,
  ban_user: Ban,
  mute_user: Ban,
};

const ACTION_COLORS: Record<string, string> = {
  lock_post: "bg-yellow-500/10 text-yellow-600",
  unlock_post: "bg-green-500/10 text-green-600",
  pin_post: "bg-blue-500/10 text-blue-600",
  unpin_post: "bg-muted text-muted-foreground",
  remove_post: "bg-destructive/10 text-destructive",
  approve_post: "bg-green-500/10 text-green-600",
  remove_comment: "bg-destructive/10 text-destructive",
  approve_comment: "bg-green-500/10 text-green-600",
  distinguish_comment: "bg-primary/10 text-primary",
  undistinguish_comment: "bg-muted text-muted-foreground",
  set_flair: "bg-purple-500/10 text-purple-600",
  assign_role: "bg-blue-500/10 text-blue-600",
  remove_role: "bg-orange-500/10 text-orange-600",
  ban_user: "bg-destructive/10 text-destructive",
  mute_user: "bg-yellow-500/10 text-yellow-600",
};

const formatAction = (action: string): string => {
  return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const CommunityModLog = ({ communityId }: CommunityModLogProps) => {
  const { data: logs, isLoading } = useCommunityModLog(communityId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Moderation Log</CardTitle>
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

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Moderation Log</CardTitle>
          <CardDescription>Recent moderation actions in this community</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No moderation actions yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Moderation Log</CardTitle>
        <CardDescription>Recent moderation actions in this community</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {logs.map((log) => {
              const Icon = ACTION_ICONS[log.action] || Shield;
              const colorClass = ACTION_COLORS[log.action] || "bg-muted text-muted-foreground";

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {log.mod?.display_name || log.mod?.username || 'Unknown mod'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {formatAction(log.action)}
                      </Badge>
                    </div>
                    
                    {log.target_type === 'post' && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Post
                      </p>
                    )}
                    {log.target_type === 'comment' && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Comment
                      </p>
                    )}
                    {log.target_type === 'user' && log.target_user && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.target_user.display_name || log.target_user.username}
                      </p>
                    )}
                    
                    {log.details && typeof log.details === 'object' && (
                      <div className="mt-1">
                        {(log.details as any).reason && (
                          <p className="text-xs text-muted-foreground italic">
                            "{(log.details as any).reason}"
                          </p>
                        )}
                        {(log.details as any).flair_name && (
                          <p className="text-xs text-muted-foreground">
                            Flair: {(log.details as any).flair_name}
                          </p>
                        )}
                        {(log.details as any).role && (
                          <p className="text-xs text-muted-foreground">
                            Role: {(log.details as any).role}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CommunityModLog;
