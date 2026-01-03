import { useState, useEffect } from "react";
import { Bell, Mail, Smartphone, BellOff, Clock, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

export const NotificationPreferences = () => {
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
  const [hasChanges, setHasChanges] = useState(false);

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

  const handleSnooze = async (hours: number) => {
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + hours);
    try {
      await snoozeNotifications.mutateAsync(snoozeUntil);
      toast.success(`Notifications snoozed for ${hours} hour${hours > 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to snooze notifications");
    }
  };

  const handleUnsnooze = async () => {
    try {
      await snoozeNotifications.mutateAsync(null);
      toast.success("Notifications resumed");
    } catch {
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
      setHasChanges(false);
      toast.success("Notification settings saved!");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const markChanged = () => setHasChanges(true);

  return (
    <div className="space-y-6">
      {/* Snooze Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BellOff className="h-4 w-4" />
          Snooze All Notifications
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

      <Accordion type="multiple" className="w-full" defaultValue={["push", "inapp", "email"]}>
        {/* Push Notifications */}
        {isSupported && (
          <AccordionItem value="push">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Push Notifications
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
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
            </AccordionContent>
          </AccordionItem>
        )}

        {/* In-App Notifications */}
        <AccordionItem value="inapp">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              In-App Notifications
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="inapp-follower" className="text-sm">New followers</Label>
              <Switch
                id="inapp-follower"
                checked={inappFollower}
                onCheckedChange={(v) => { setInappFollower(v); markChanged(); }}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="inapp-upvote" className="text-sm">Post upvotes</Label>
              <Switch
                id="inapp-upvote"
                checked={inappUpvote}
                onCheckedChange={(v) => { setInappUpvote(v); markChanged(); }}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="inapp-comment" className="text-sm">New comments</Label>
              <Switch
                id="inapp-comment"
                checked={inappComment}
                onCheckedChange={(v) => { setInappComment(v); markChanged(); }}
                disabled={isLoading}
              />
            </div>

            {/* Sound Settings */}
            <div className="pt-2 space-y-3 border-t border-border">
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">Alert sound</Label>
                <div className="flex items-center gap-2">
                  <Select value={selectedSound} onValueChange={(v: SoundType) => { setSelectedSound(v); markChanged(); }}>
                    <SelectTrigger className="w-28">
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
                    onClick={() => selectedSound !== "none" && previewSound(selectedSound, volume)}
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
                <div className="flex items-center gap-3 w-36">
                  <Slider
                    value={[volume]}
                    onValueChange={([v]) => { setVolumeState(v); markChanged(); }}
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
          </AccordionContent>
        </AccordionItem>

        {/* Email Notifications */}
        <AccordionItem value="email">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Notifications
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-follower" className="text-sm">New followers</Label>
              <Switch
                id="email-follower"
                checked={emailFollower}
                onCheckedChange={(v) => { setEmailFollower(v); markChanged(); }}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-upvote" className="text-sm">Post upvotes</Label>
              <Switch
                id="email-upvote"
                checked={emailUpvote}
                onCheckedChange={(v) => { setEmailUpvote(v); markChanged(); }}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-comment" className="text-sm">New comments</Label>
              <Switch
                id="email-comment"
                checked={emailComment}
                onCheckedChange={(v) => { setEmailComment(v); markChanged(); }}
                disabled={isLoading}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {hasChanges && (
        <Button onClick={handleSave} disabled={updatePreferences.isPending} className="w-full">
          {updatePreferences.isPending ? "Saving..." : "Save Changes"}
        </Button>
      )}
    </div>
  );
};
