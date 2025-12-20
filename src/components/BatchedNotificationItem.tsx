import { Link } from "react-router-dom";
import { MessageCircle, ArrowBigUp, UserPlus, Reply, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { BatchedNotification } from "@/hooks/useNotificationBatching";
import { Badge } from "@/components/ui/badge";

const getNotificationIcon = (type: string, count: number) => {
  if (count > 1) {
    return <Users className="h-5 w-5" />;
  }
  
  switch (type) {
    case "upvote":
      return <ArrowBigUp className="h-5 w-5" />;
    case "follow":
      return <UserPlus className="h-5 w-5" />;
    case "reply":
      return <Reply className="h-5 w-5" />;
    case "comment":
    default:
      return <MessageCircle className="h-5 w-5" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "upvote":
      return "bg-orange-500/10 text-orange-500";
    case "follow":
      return "bg-blue-500/10 text-blue-500";
    case "reply":
      return "bg-purple-500/10 text-purple-500";
    case "comment":
    default:
      return "bg-primary/10 text-primary";
  }
};

interface BatchedNotificationItemProps {
  notification: BatchedNotification;
  onMarkAsRead: (ids: string[]) => void;
  isFocused?: boolean;
}

export const BatchedNotificationItem = ({
  notification,
  onMarkAsRead,
  isFocused,
}: BatchedNotificationItemProps) => {
  const handleClick = () => {
    if (!notification.read) {
      const ids = notification.originalNotifications.map(n => n.id);
      onMarkAsRead(ids);
    }
  };

  return (
    <div className={cn(
      "relative group",
      isFocused && "ring-2 ring-primary ring-inset"
    )}>
      <Link
        to={notification.link || "#"}
        onClick={handleClick}
        className={cn(
          "flex items-start gap-4 p-4 rounded-lg transition-colors hover:bg-secondary/50",
          !notification.read && "bg-primary/5"
        )}
      >
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full shrink-0 relative",
          getNotificationColor(notification.type)
        )}>
          {getNotificationIcon(notification.type, notification.count)}
          {notification.count > 1 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs bg-primary text-primary-foreground"
            >
              {notification.count}
            </Badge>
          )}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              getNotificationColor(notification.type)
            )}>
              {notification.count > 1 ? `${notification.count} ${notification.type}s` : notification.type}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.latestDate), { addSuffix: true })}
            </span>
          </div>
          <p className={cn("font-medium", !notification.read && "text-foreground")}>
            {notification.title}
          </p>
          {notification.message && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {notification.message}
            </p>
          )}
          {notification.count > 1 && notification.actorIds.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              From {notification.actorIds.length} {notification.actorIds.length === 1 ? 'person' : 'people'}
            </p>
          )}
        </div>
        {!notification.read && (
          <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-2" />
        )}
      </Link>
    </div>
  );
};

export default BatchedNotificationItem;
