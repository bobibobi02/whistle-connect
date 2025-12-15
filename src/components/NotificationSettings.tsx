import { useState, useEffect } from "react";
import { Settings, Mail, Bell } from "lucide-react";
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
import { useEmailPreferences, useUpdateEmailPreferences } from "@/hooks/useEmailPreferences";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { toast } from "sonner";

const NotificationSettings = () => {
  const { data: preferences, isLoading } = useEmailPreferences();
  const updatePreferences = useUpdateEmailPreferences();
  const { isSoundEnabled, setSoundEnabled } = useNotificationSound();
  
  const [emailFollower, setEmailFollower] = useState(true);
  const [emailUpvote, setEmailUpvote] = useState(false);
  const [emailComment, setEmailComment] = useState(true);
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled);

  useEffect(() => {
    if (preferences) {
      setEmailFollower(preferences.email_new_follower ?? true);
      setEmailUpvote(preferences.email_post_upvote ?? false);
      setEmailComment(preferences.email_comment ?? true);
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updatePreferences.mutateAsync({
        email_new_follower: emailFollower,
        email_post_upvote: emailUpvote,
        email_comment: emailComment,
      });
      setSoundEnabled(soundEnabled);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notification Settings</DialogTitle>
          <DialogDescription>
            Choose how you want to receive notifications
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Sound Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bell className="h-4 w-4" />
              In-App Notifications
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sound" className="text-sm">
                Notification sound
              </Label>
              <Switch
                id="sound"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabledState}
              />
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
