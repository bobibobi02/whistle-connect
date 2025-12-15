import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, MessageCircle, ArrowBigUp, UserPlus, Reply, BellRing, Volume2, VolumeX } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "upvote":
      return <ArrowBigUp className="h-4 w-4" />;
    case "follow":
      return <UserPlus className="h-4 w-4" />;
    case "reply":
      return <Reply className="h-4 w-4" />;
    case "comment":
    default:
      return <MessageCircle className="h-4 w-4" />;
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

const NotificationsPopover = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { data: notifications } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const { permission, requestPermission, isSupported } = usePushNotifications();
  const { setSoundEnabled, isSoundEnabled } = useNotificationSound();
  const [soundOn, setSoundOn] = useState(isSoundEnabled);

  if (!user) {
    return (
      <Button variant="ghost" size="icon" className="hidden sm:flex" asChild>
        <Link to="/auth">
          <Bell className="h-5 w-5" />
        </Link>
      </Button>
    );
  }

  const handleNotificationClick = (notification: { id: string; read: boolean }) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    setOpen(false);
  };

  const handleEnablePush = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success("Push notifications enabled!");
    } else {
      toast.error("Push notifications were denied");
    }
  };

  const toggleSound = () => {
    const newValue = !soundOn;
    setSoundEnabled(newValue);
    setSoundOn(newValue);
    toast.success(newValue ? "Notification sound enabled" : "Notification sound muted");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount && unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 w-7 p-0"
              onClick={toggleSound}
              title={soundOn ? "Mute sounds" : "Enable sounds"}
            >
              {soundOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            </Button>
            {isSupported && permission !== "granted" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={handleEnablePush}
              >
                <BellRing className="h-3 w-3 mr-1" />
                Enable
              </Button>
            )}
            {unreadCount && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => markAllAsRead.mutate()}
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-80">
          {notifications && notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  to={notification.link || "#"}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex items-start gap-3 p-3 hover:bg-secondary/50 transition-colors",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                    getNotificationColor(notification.type)
                  )}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", !notification.read && "font-medium")}>
                      {notification.message || notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsPopover;
