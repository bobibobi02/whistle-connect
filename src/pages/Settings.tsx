import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Shield, Eye, Volume2 } from "lucide-react";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { NsfwToggle } from "@/components/NsfwToggle";
import { VideoAutoplayToggle } from "@/components/VideoAutoplayToggle";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setIsMobileNavOpen(true)} />
        <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
        <main className="container max-w-2xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Please sign in to access settings</p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-2xl mx-auto px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back</span>
        </Link>

        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="space-y-6">
          {/* Content Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Content Preferences
              </CardTitle>
              <CardDescription>
                Control what content you see in your feed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <NsfwToggle />
            </CardContent>
          </Card>

          {/* Video Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Video Settings
              </CardTitle>
              <CardDescription>
                Control video playback behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <VideoAutoplayToggle />
            </CardContent>
          </Card>

          {/* Privacy & Safety Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Safety
              </CardTitle>
              <CardDescription>
                Manage your privacy and safety settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Additional privacy settings coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
