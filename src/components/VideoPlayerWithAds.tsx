import { useState, useCallback } from "react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VideoPrerollAd } from "@/components/VideoPrerollAd";

interface VideoPlayerWithAdsProps {
  src: string;
  hlsSrc?: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  compact?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onProgress?: (progress: number) => void;
  postId?: string;
  showPreroll?: boolean; // Enable pre-roll ads
}

export function VideoPlayerWithAds({
  src,
  hlsSrc,
  poster,
  className,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  compact = false,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onProgress,
  postId,
  showPreroll = true,
}: VideoPlayerWithAdsProps) {
  const [adState, setAdState] = useState<"loading" | "showing" | "complete">(
    showPreroll ? "loading" : "complete"
  );

  const handleAdComplete = useCallback(() => {
    setAdState("complete");
  }, []);

  const handleAdSkipped = useCallback(() => {
    setAdState("complete");
  }, []);

  // Show pre-roll ad first
  if (adState === "loading" || adState === "showing") {
    return (
      <VideoPrerollAd
        postId={postId}
        onAdComplete={handleAdComplete}
        onAdSkipped={handleAdSkipped}
        className={className}
      />
    );
  }

  // After ad completes, show the actual video
  return (
    <VideoPlayer
      src={src}
      hlsSrc={hlsSrc}
      poster={poster}
      className={className}
      autoPlay={autoPlay || adState === "complete"} // Auto-play after ad
      muted={muted}
      loop={loop}
      controls={controls}
      compact={compact}
      onPlay={onPlay}
      onPause={onPause}
      onEnded={onEnded}
      onTimeUpdate={onTimeUpdate}
      onProgress={onProgress}
      postId={postId}
    />
  );
}

export default VideoPlayerWithAds;
