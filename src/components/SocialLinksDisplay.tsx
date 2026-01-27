import { Globe, Instagram, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
  </svg>
);

interface SocialLinks {
  website_url?: string;
  instagram_url?: string;
  x_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
}

interface SocialLinksDisplayProps {
  links: SocialLinks | null;
  className?: string;
  compact?: boolean;
}

const SocialLinksDisplay = ({ links, className, compact = false }: SocialLinksDisplayProps) => {
  if (!links) return null;

  const hasLinks = Object.values(links).some((url) => url && url.trim());
  if (!hasLinks) return null;

  const socialLinks = [
    { key: "website_url", url: links.website_url, icon: Globe, label: "Website" },
    { key: "instagram_url", url: links.instagram_url, icon: Instagram, label: "Instagram" },
    { key: "x_url", url: links.x_url, icon: XIcon, label: "X" },
    { key: "youtube_url", url: links.youtube_url, icon: Youtube, label: "YouTube" },
    { key: "tiktok_url", url: links.tiktok_url, icon: TikTokIcon, label: "TikTok" },
  ].filter((link) => link.url && link.url.trim());

  if (socialLinks.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {socialLinks.map((link) => {
        const Icon = link.icon;
        return (
          <Button
            key={link.key}
            variant="ghost"
            size={compact ? "icon" : "sm"}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              compact ? "h-8 w-8" : "gap-1.5"
            )}
            asChild
          >
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.label}
            >
              <Icon className="h-4 w-4" />
              {!compact && <span className="text-xs">{link.label}</span>}
            </a>
          </Button>
        );
      })}
    </div>
  );
};

export default SocialLinksDisplay;
