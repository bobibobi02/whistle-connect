import { useState, useEffect } from "react";
import { Settings, Mail, Bell, Play, Volume2, BellOff, Clock, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmailPreferences, useUpdateEmailPreferences, useSnoozeNotifications } from "@/hooks/useEmailPreferences";
import { useNotificationSound, SoundType } from "@/hooks/useNotificationSound";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const SNOOZE_OPTIONS = [
  { label: "1 hour", value: 1 },
  { label: "4 hours", value: 4 },
  { label: "8 hours", value: 8 },
  { label: "24 hours", value: 24 },
];

const NotificationSettings = () => {
  const { data: preferences, isLoading } = useEmailPreferences();
  const updatePreferences = useUpdateEmailPreferences();
  const snoozeNotifications = useSnoozeNotifications();
  const { getSoundType, setSoundType, getVolume, setVolume, previewSound, soundOptions } = useNotificationSound();
  const { permission, requestPermission, isSupported, isNative } = usePushNotifications();
  
  const [emailFollower, setEmailFollower] = useState(true);
  const [emailUpvote, setEmailUpvote] = useState(false);
  const [emailComment, setEmailComment] = useState(true);
  const [inappFollower, setInappFollower] = useState(true);
  const [inappUpvote, setInappUpvote] = useState(true);
  const [inappComment, setInappComment] = useState(true);
  const [selectedSound, setSelectedSound] = useState<SoundType>(getSoundType());
  const [volume, setVolumeState] = useState(getVolume());
  const [pushEnabled, setPushEnabled] = useState(permission === "granted");

  useEffect(() => {
    setPushEnabled(permission === "granted");
  }, [permission]);

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestPermission();
      setPushEnabled(granted);
      if (granted) {
        toast.success("Push notifications enabled!");
      } else {
        toast.error("Push notification permission denied");
      }
    } else {
      toast.info("To disable push notifications, use your browser or device settings");
    }
  };

  const snoozeUntil = preferences?.snooze_until ? new Date(preferences.snooze_until) : null;
  const isSnoozed = snoozeUntil && snoozeUntil > new Date();

  useEffect(() => {
    if (preferences) {
      setEmailFollower(preferences.email_new_follower ?? true);
      setEmailUpvote(preferences.email_post_upvote ?? false);
      setEmailComment(preferences.email_comment ?? true);
      setInappFollower(preferences.inapp_new_follower ?? true);
      setInappUpvote(preferences.inapp_post_upvote ?? true);
      setInappComment(preferences.inapp_comment ?? true);
    }
  }, [preferences]);

  const handleSoundChange = (value: SoundType) => {
    setSelectedSound(value);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolumeState(value[0]);
  };

  const handlePreviewSound = () => {
    if (selectedSound !== "none") {
      previewSound(selectedSound, volume);
    }
  };

  const handleSnooze = async (hours: number) => {
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + hours);
    try {
      await snoozeNotifications.mutateAsync(snoozeUntil);
      toast.success(`Notifications snoozed for ${hours} hour${hours > 1 ? "s" : ""}`);
    } catch (error) {
      toast.error("Failed to snooze notifications");
    }
  };

  const handleUnsnooze = async () => {
    try {
      await snoozeNotifications.mutateAsync(null);
      toast.success("Notifications resumed");
    } catch (error) {
      toast.error("Failed to resume notifications");
    }
  };

  const handleSave = async () => {
    try {
      await updatePreferences.mutateAsync({
        email_new_follower: emailFollower,
        email_post_upvote: emailUpvote,
        email_comment: emailComment,
        inapp_new_follower: inappFollower,
        inapp_post_upvote: inappUpvote,
        inapp_comment: inappComment,
      });
      setSoundType(selectedSound);
      setVolume(volume);
      toast.success("Notification settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notification Settings</DialogTitle>
          <DialogDescription>
            Choose how you want to receive notifications
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Snooze Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BellOff className="h-4 w-4" />
              Snooze Notifications
            </div>
            
            {isSnoozed ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Snoozed for {formatDistanceToNow(snoozeUntil)}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleUnsnooze}
                  disabled={snoozeNotifications.isPending}
                >
                  Resume
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {SNOOZE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSnooze(option.value)}
                    disabled={snoozeNotifications.isPending}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Push Notifications */}
          {isSupported && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-4 w-4" />
                Push Notifications
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-enabled" className="text-sm">
                    Enable push notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isNative ? "Receive notifications on your device" : "Receive browser notifications"}
                  </p>
                </div>
                <Switch
                  id="push-enabled"
                  checked={pushEnabled}
                  onCheckedChange={handlePushToggle}
                />
              </div>

              {pushEnabled && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-follower" className="text-sm">
                      New followers
                    </Label>
                    <Switch
                      id="push-follower"
                      checked={inappFollower}
                      onCheckedChange={setInappFollower}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-upvote" className="text-sm">
                      Post upvotes
                    </Label>
                    <Switch
                      id="push-upvote"
                      checked={inappUpvote}
                      onCheckedChange={setInappUpvote}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-comment" className="text-sm">
                      New comments
                    </Label>
                    <Switch
                      id="push-comment"
                      checked={inappComment}
                      onCheckedChange={setInappComment}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* In-App Notification Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bell className="h-4 w-4" />
              In-App Notifications
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="inapp-follower" className="text-sm">
                New followers
              </Label>
              <Switch
                id="inapp-follower"
                checked={inappFollower}
                onCheckedChange={setInappFollower}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="inapp-upvote" className="text-sm">
                Post upvotes
              </Label>
              <Switch
                id="inapp-upvote"
                checked={inappUpvote}
                onCheckedChange={setInappUpvote}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="inapp-comment" className="text-sm">
                New comments
              </Label>
              <Switch
                id="inapp-comment"
                checked={inappComment}
                onCheckedChange={setInappComment}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <Label htmlFor="sound" className="text-sm">
                Alert sound
              </Label>
              <div className="flex items-center gap-2">
                <Select value={selectedSound} onValueChange={handleSoundChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {soundOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviewSound}
                  disabled={selectedSound === "none"}
                  className="h-9 w-9"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label className="text-sm flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Volume
              </Label>
              <div className="flex items-center gap-3 w-40">
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  min={0}
                  step={0.1}
                  disabled={selectedSound === "none"}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-8">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Email Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4" />
              Email Notifications
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="email-follower" className="text-sm">
                New followers
              </Label>
              <Switch
                id="email-follower"
                checked={emailFollower}
                onCheckedChange={setEmailFollower}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="email-upvote" className="text-sm">
                Post upvotes
              </Label>
              <Switch
                id="email-upvote"
                checked={emailUpvote}
                onCheckedChange={setEmailUpvote}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="email-comment" className="text-sm">
                New comments
              </Label>
              <Switch
                id="email-comment"
                checked={emailComment}
                onCheckedChange={setEmailComment}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={updatePreferences.isPending}>
          {updatePreferences.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationSettings;
