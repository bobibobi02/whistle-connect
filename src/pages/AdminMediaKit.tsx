import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Image, Megaphone, Monitor, Smartphone, Users } from "lucide-react";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { useAdPackages } from "@/hooks/useAdPackages";

const AdminMediaKit = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useIsAdmin();
  const { data: packages, isLoading: packagesLoading } = useAdPackages();

  if (authLoading || rolesLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setIsMobileNavOpen(true)} />
        <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
        <main className="container max-w-2xl mx-auto px-4 py-16 text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </main>
      </div>
    );
  }

  const placements = [
    {
      name: "Sponsored Post (In-Feed)",
      key: "FEED_INLINE",
      description: "Native ad that appears in the main feed, styled like a regular post with 'Sponsored' label.",
      dimensions: "Flexible (matches post layout)",
      imageSize: "Max 1200x628px recommended",
      icon: <Image className="h-5 w-5" />,
    },
    {
      name: "Top Banner",
      key: "BANNER_TOP",
      description: "Prominent banner at the top of the feed. High visibility on page load.",
      dimensions: "Full width, 80-120px height",
      imageSize: "80x80px square thumbnail",
      icon: <Monitor className="h-5 w-5" />,
    },
    {
      name: "Sidebar Banner",
      key: "BANNER_SIDEBAR",
      description: "Compact banner in the sidebar area (desktop only).",
      dimensions: "300px width, 250px height",
      imageSize: "64x64px square thumbnail",
      icon: <Smartphone className="h-5 w-5" />,
    },
    {
      name: "Loop Sponsorship",
      key: "LOOP_SPONSORED",
      description: "Exclusive sponsorship of a community/loop. Shows sponsor badge on the community page.",
      dimensions: "Badge with logo (40x40px)",
      imageSize: "40x40px square logo",
      icon: <Users className="h-5 w-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-4xl mx-auto px-4 py-6 pb-24">
        <Link to="/admin/ads" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Ads</span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Media Kit</h1>
            <p className="text-muted-foreground">Ad placements, dimensions, and package information</p>
          </div>
        </div>

        {/* Packages Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Advertising Packages</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {packagesLoading ? (
              <div className="col-span-3 text-center py-8 text-muted-foreground">Loading packages...</div>
            ) : (
              packages?.filter(p => p.is_active).map((pkg) => (
                <Card key={pkg.id} className={pkg.is_exclusive ? "border-primary" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      {pkg.is_exclusive && <Badge className="bg-primary">Exclusive</Badge>}
                    </div>
                    <CardDescription>{pkg.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-3">
                      €{(pkg.price_cents / 100).toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{pkg.duration_days === 7 ? "week" : "month"}
                      </span>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {pkg.includes_sponsored_posts > 0 && (
                        <li>✓ {pkg.includes_sponsored_posts} Sponsored Post{pkg.includes_sponsored_posts > 1 ? "s" : ""}</li>
                      )}
                      {pkg.includes_banners > 0 && (
                        <li>✓ {pkg.includes_banners} Banner{pkg.includes_banners > 1 ? "s" : ""}</li>
                      )}
                      {pkg.includes_loop_sponsorship && (
                        <li>✓ Loop Sponsorship</li>
                      )}
                      {pkg.includes_reporting && (
                        <li>✓ Performance Reporting</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        <Separator className="my-8" />

        {/* Placements Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Ad Placements</h2>
          <div className="space-y-4">
            {placements.map((placement) => (
              <Card key={placement.key}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {placement.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{placement.name}</h3>
                        <Badge variant="outline" className="text-xs">{placement.key}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{placement.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Dimensions:</span>
                          <p className="font-medium">{placement.dimensions}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Image Size:</span>
                          <p className="font-medium">{placement.imageSize}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="my-8" />

        {/* Specs Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Creative Specifications</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-medium mb-2">Image Ads</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Format: JPG, PNG, WebP</li>
                    <li>• Max file size: 5MB</li>
                    <li>• Recommended: 1200x628px (1.91:1 ratio)</li>
                    <li>• Thumbnail: 80x80px minimum</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Video Ads</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Format: MP4, WebM</li>
                    <li>• Max duration: 60 seconds</li>
                    <li>• Max file size: 50MB</li>
                    <li>• Recommended: 1080p (1920x1080)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Copy Guidelines</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Headline: Max 50 characters</li>
                    <li>• Body: Max 150 characters</li>
                    <li>• CTA: Max 20 characters</li>
                    <li>• Display URL: Max 30 characters</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Content Policy</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• No misleading claims</li>
                    <li>• No prohibited content</li>
                    <li>• Clear advertiser identity</li>
                    <li>• Compliant landing pages</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">Ready to advertise?</p>
          <Button asChild>
            <Link to="/admin/ads">
              <Megaphone className="h-4 w-4 mr-2" />
              Go to Ad Management
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default AdminMediaKit;
