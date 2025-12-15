import { useState, useEffect, useRef, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { Bell, MessageCircle, ArrowBigUp, UserPlus, Reply, CheckCheck, Trash2, X, Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  useInfiniteNotifications, 
  useMarkAsRead, 
  useMarkAllAsRead, 
  useDeleteNotification,
  useDeleteAllNotifications,
  Notification 
} from "@/hooks/useNotifications";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const getNotificationIcon = (type: string) => {
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

const getNotificationLabel = (type: string) => {
  switch (type) {
    case "upvote":
      return "Upvote";
    case "follow":
      return "Follow";
    case "reply":
      return "Reply";
    case "comment":
    default:
      return "Comment";
  }
};

const NotificationCenter = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAllNotifications = useDeleteAllNotifications();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("Notifications refreshed");
  }, [queryClient]);

  const { containerRef, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Flatten paginated data
  const notifications = data?.pages.flatMap((page) => page.data) || [];

  // Calculate counts per category
  const counts = {
    all: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
    comment: notifications.filter((n) => n.type === "comment").length,
    upvote: notifications.filter((n) => n.type === "upvote").length,
    follow: notifications.filter((n) => n.type === "follow").length,
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !n.read;
    return n.type === activeFilter;
  });

  // Group notifications by date
  const groupNotificationsByDate = (notifs: Notification[]) => {
    const groups: { label: string; notifications: Notification[] }[] = [
      { label: "Today", notifications: [] },
      { label: "Yesterday", notifications: [] },
      { label: "This Week", notifications: [] },
      { label: "Older", notifications: [] },
    ];

    notifs.forEach((notification) => {
      const date = new Date(notification.created_at);
      if (isToday(date)) {
        groups[0].notifications.push(notification);
      } else if (isYesterday(date)) {
        groups[1].notifications.push(notification);
      } else if (isThisWeek(date)) {
        groups[2].notifications.push(notification);
      } else {
        groups[3].notifications.push(notification);
      }
    });

    return groups.filter((g) => g.notifications.length > 0);
  };

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  const unreadCount = counts.unread;
  const totalCount = counts.all;

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotification.mutate(notificationId, {
      onSuccess: () => toast.success("Notification deleted"),
    });
  };

  const handleDeleteAll = () => {
    deleteAllNotifications.mutate(undefined, {
      onSuccess: () => toast.success("All notifications cleared"),
    });
  };

  const isMobile = useIsMobile();

  const NotificationContent = ({ notification }: { notification: Notification }) => (
    <div className="relative group">
      <Link
        to={notification.link || "#"}
        onClick={() => {
          if (!notification.read) {
            markAsRead.mutate(notification.id);
          }
        }}
        className={cn(
          "flex items-start gap-4 p-4 rounded-lg transition-colors hover:bg-secondary/50",
          !notification.read && "bg-primary/5"
        )}
      >
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full shrink-0",
          getNotificationColor(notification.type)
        )}>
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              getNotificationColor(notification.type)
            )}>
              {getNotificationLabel(notification.type)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
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
        </div>
        {!notification.read && (
          <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-2" />
        )}
      </Link>
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => handleDelete(e, notification.id)}
        >
          <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      )}
    </div>
  );

  const NotificationItem = ({ notification }: { notification: Notification }) => {
    const handleSwipeDelete = () => {
      deleteNotification.mutate(notification.id, {
        onSuccess: () => toast.success("Notification deleted"),
      });
    };

    if (isMobile) {
      return (
        <SwipeToDelete onDelete={handleSwipeDelete}>
          <NotificationContent notification={notification} />
        </SwipeToDelete>
      );
    }

    return <NotificationContent notification={notification} />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setMobileNavOpen(true)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div ref={containerRef} className="h-[calc(100vh-4rem)] overflow-auto">
        {/* Pull to refresh indicator */}
        <div 
          className="flex items-center justify-center transition-all duration-200 overflow-hidden"
          style={{ height: pullProgress > 0 ? `${pullProgress * 60}px` : 0 }}
        >
          <RefreshCw 
            className={cn(
              "h-5 w-5 text-primary transition-transform",
              isRefreshing && "animate-spin"
            )}
            style={{ 
              transform: `rotate(${pullProgress * 360}deg)`,
              opacity: pullProgress 
            }}
          />
        </div>

        <main className="container max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
            {totalCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAll}
                disabled={deleteAllNotifications.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" onClick={() => setActiveFilter("all")} className="gap-1.5">
              All
              {counts.all > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">{counts.all}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" onClick={() => setActiveFilter("unread")} className="gap-1.5">
              Unread
              {counts.unread > 0 && (
                <Badge className="h-5 min-w-5 px-1.5 text-xs">{counts.unread}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="comment" onClick={() => setActiveFilter("comment")} className="gap-1.5">
              Comments
              {counts.comment > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">{counts.comment}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upvote" onClick={() => setActiveFilter("upvote")} className="gap-1.5">
              Upvotes
              {counts.upvote > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">{counts.upvote}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="follow" onClick={() => setActiveFilter("follow")} className="gap-1.5">
              Follows
              {counts.follow > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">{counts.follow}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <Card className="p-8 text-center text-muted-foreground">
                Loading notifications...
              </Card>
            ) : groupedNotifications.length > 0 ? (
              groupedNotifications.map((group) => (
                <div key={group.label} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground px-1">{group.label}</h3>
                  <Card className="divide-y divide-border">
                    {group.notifications.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))}
                  </Card>
                </div>
              ))
            ) : (
              <Card className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No notifications yet</p>
              </Card>
            )}
          </TabsContent>

          {["unread", "comment", "upvote", "follow"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {isLoading ? (
                <Card className="p-8 text-center text-muted-foreground">
                  Loading notifications...
                </Card>
              ) : groupedNotifications.length > 0 ? (
                groupedNotifications.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground px-1">{group.label}</h3>
                    <Card className="divide-y divide-border">
                      {group.notifications.map((notification) => (
                        <NotificationItem key={notification.id} notification={notification} />
                      ))}
                    </Card>
                  </div>
                ))
              ) : (
                <Card className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    No {tab === "unread" ? "unread" : tab} notifications
                  </p>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
          {isFetchingNextPage && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
          {!hasNextPage && notifications.length > 0 && (
            <p className="text-sm text-muted-foreground">No more notifications</p>
          )}
        </div>
        </main>
      </div>
    </div>
  );
};

export default NotificationCenter;
