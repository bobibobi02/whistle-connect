import { useState, useEffect, useRef, useCallback } from "react";
import { useAdRequest, useAdEvent } from "@/hooks/useAds";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, VolumeX, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPrerollAdProps {
  postId?: string;
  onAdComplete: () => void;
  onAdSkipped: () => void;
  className?: string;
}

export function VideoPrerollAd({
  postId,
  onAdComplete,
  onAdSkipped,
  className,
}: VideoPrerollAdProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const skipAfterSeconds = 5; // Default, could come from placement config

  const { data: adResponse, isLoading, isError } = useAdRequest({
    placementKey: "VIDEO_PREROLL",
    postId,
  });

  const { mutate: trackEvent } = useAdEvent();
  const ad = adResponse?.ad;

  // Auto-complete if no ad available
  useEffect(() => {
    if (isError || (!isLoading && !ad)) {
      onAdComplete();
    }
  }, [isError, isLoading, ad, onAdComplete]);

  // Track impression when ad loads
  useEffect(() => {
    if (ad && !hasTrackedImpression) {
      trackEvent({
        requestId: ad.requestId,
        campaignId: ad.campaignId,
        creativeId: ad.creativeId,
        placementKey: ad.placementKey,
        eventType: "impression",
        postId,
      });
      setHasTrackedImpression(true);
    }
  }, [ad, hasTrackedImpression, trackEvent, postId]);

  // Auto-play video ad
  useEffect(() => {
    if (videoRef.current && ad?.videoUrl) {
      videoRef.current.play().catch(console.error);
    }
  }, [ad]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    
    if (video.currentTime >= skipAfterSeconds) {
      setCanSkip(true);
    }
  }, [skipAfterSeconds]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  }, []);

  const handleVideoEnded = useCallback(() => {
    if (ad) {
      trackEvent({
        requestId: ad.requestId,
        campaignId: ad.campaignId,
        creativeId: ad.creativeId,
        placementKey: ad.placementKey,
        eventType: "complete",
        postId,
      });
    }
    onAdComplete();
  }, [ad, trackEvent, postId, onAdComplete]);

  const handleSkip = useCallback(() => {
    if (ad) {
      trackEvent({
        requestId: ad.requestId,
        campaignId: ad.campaignId,
        creativeId: ad.creativeId,
        placementKey: ad.placementKey,
        eventType: "skip",
        postId,
      });
    }
    onAdSkipped();
  }, [ad, trackEvent, postId, onAdSkipped]);

  const handleClick = useCallback(() => {
    if (!ad) return;
    
    trackEvent({
      requestId: ad.requestId,
      campaignId: ad.campaignId,
      creativeId: ad.creativeId,
      placementKey: ad.placementKey,
      eventType: "click",
      postId,
    });

    window.open(ad.clickUrl, "_blank", "noopener,noreferrer");
  }, [ad, trackEvent, postId]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const seconds = Math.floor(time);
    return `0:${seconds.toString().padStart(2, "0")}`;
  };

  const timeUntilSkip = Math.max(0, Math.ceil(skipAfterSeconds - currentTime));
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (isLoading) {
    return (
      <div className={cn("relative bg-black flex items-center justify-center", className)}>
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!ad) {
    return null;
  }

  // For image ads (fallback)
  if (!ad.videoUrl && ad.imageUrl) {
    return (
      <div 
        className={cn("relative bg-black cursor-pointer", className)}
        onClick={handleClick}
      >
        <img 
          src={ad.imageUrl} 
          alt={ad.headline}
          className="w-full h-full object-contain"
        />
        
        {/* Ad overlay */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-yellow-500/90 text-black">
            Ad
          </Badge>
        </div>
        
        {/* Skip button */}
        <div className="absolute bottom-3 right-3">
          <Button onClick={(e) => { e.stopPropagation(); onAdComplete(); }} variant="secondary" size="sm">
            Skip Ad
          </Button>
        </div>

        {/* Advertiser info */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white text-sm">
          <ExternalLink className="h-4 w-4" />
          {ad.advertiserName || "Visit site"}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative bg-black overflow-hidden", className)}>
      <video
        ref={videoRef}
        src={ad.videoUrl!}
        autoPlay
        muted={isMuted}
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onClick={handleClick}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
        <div 
          className="h-full bg-yellow-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Ad badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <Badge variant="secondary" className="bg-yellow-500/90 text-black font-medium">
          Ad · {formatTime(duration - currentTime)}
        </Badge>
      </div>

      {/* Volume toggle */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-3 right-3 h-8 w-8 bg-black/60 hover:bg-black/80"
        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4 text-white" />
        ) : (
          <Volume2 className="h-4 w-4 text-white" />
        )}
      </Button>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          {/* Advertiser info */}
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => { e.stopPropagation(); handleClick(); }}
          >
            <div className="text-white">
              <p className="text-sm font-medium line-clamp-1">{ad.headline}</p>
              <p className="text-xs text-white/70 flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                {ad.advertiserName || new URL(ad.clickUrl).hostname}
              </p>
            </div>
          </div>

          {/* Skip button */}
          <div className="flex items-center gap-2">
            {ad.callToAction && (
              <Button 
                variant="default" 
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleClick(); }}
              >
                {ad.callToAction}
              </Button>
            )}
            
            {canSkip ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                Skip Ad →
              </Button>
            ) : (
              <div className="px-3 py-1.5 bg-black/60 rounded-md text-white text-sm">
                Skip in {timeUntilSkip}s
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPrerollAd;
