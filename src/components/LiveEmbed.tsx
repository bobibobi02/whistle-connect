import { useMemo } from "react";

interface LiveEmbedProps {
  url: string;
  className?: string;
}

// Parse live URL and return embed data
const parseLiveUrl = (url: string): { type: "youtube" | "twitch" | null; embedUrl: string | null; videoId: string | null } => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // YouTube Live
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      let videoId: string | null = null;

      if (hostname.includes("youtu.be")) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.pathname.includes("/watch")) {
        videoId = urlObj.searchParams.get("v");
      } else if (urlObj.pathname.includes("/live/")) {
        videoId = urlObj.pathname.split("/live/")[1];
      } else if (urlObj.pathname.includes("/embed/")) {
        videoId = urlObj.pathname.split("/embed/")[1];
      }

      if (videoId) {
        return {
          type: "youtube",
          embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0`,
          videoId,
        };
      }
    }

    // Twitch
    if (hostname.includes("twitch.tv")) {
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      
      if (pathParts.length > 0) {
        const channel = pathParts[0];
        // Use current domain as parent for Twitch embed requirement
        const parent = typeof window !== "undefined" ? window.location.hostname : "localhost";
        return {
          type: "twitch",
          embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=${parent}`,
          videoId: channel,
        };
      }
    }
  } catch {
    // Invalid URL
  }

  return { type: null, embedUrl: null, videoId: null };
};

export const isValidLiveUrl = (url: string): boolean => {
  const { type } = parseLiveUrl(url);
  return type !== null;
};

const LiveEmbed = ({ url, className }: LiveEmbedProps) => {
  const embedData = useMemo(() => parseLiveUrl(url), [url]);

  if (!embedData.type || !embedData.embedUrl) {
    return (
      <div className={`bg-muted rounded-lg flex items-center justify-center p-8 ${className}`}>
        <p className="text-muted-foreground text-sm">Invalid live stream URL</p>
      </div>
    );
  }

  return (
    <div className={`aspect-video w-full ${className}`}>
      <iframe
        src={embedData.embedUrl}
        className="w-full h-full rounded-lg"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={`${embedData.type} live stream`}
      />
    </div>
  );
};

export default LiveEmbed;
