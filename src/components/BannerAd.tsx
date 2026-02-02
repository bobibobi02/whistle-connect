import React, { useEffect, useRef, useState } from "react";
import { useAdRequest, useAdEvent, useAdHide } from "@/hooks/useAds";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface BannerAdProps {
  placementKey?: "BANNER_TOP" | "BANNER_SIDEBAR";
  loopId?: string;
  className?: string;
}

export function BannerAd({ placementKey = "BANNER_TOP", loopId, className }: BannerAdProps) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: adResponse, isLoading } = useAdRequest({
    placementKey,
    loopId,
  });

  const { mutate: trackEvent } = useAdEvent();
  const { mutate: hideAd } = useAdHide();

  const ad = adResponse?.ad;

  // Track impression when ad becomes visible
  useEffect(() => {
    if (!ad || hasTrackedImpression) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedImpression) {
            trackEvent({
              requestId: ad.requestId,
              campaignId: ad.campaignId,
              creativeId: ad.creativeId,
              placementKey: ad.placementKey,
              eventType: "impression",
              community: loopId,
            });
            setHasTrackedImpression(true);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (bannerRef.current) {
      observer.observe(bannerRef.current);
    }

    return () => observer.disconnect();
  }, [ad, hasTrackedImpression, trackEvent, loopId]);

  const handleClick = () => {
    if (!ad) return;

    trackEvent({
      requestId: ad.requestId,
      campaignId: ad.campaignId,
      creativeId: ad.creativeId,
      placementKey: ad.placementKey,
      eventType: "click",
      community: loopId,
    });

    window.open(ad.clickUrl, "_blank", "noopener,noreferrer");
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ad) return;

    trackEvent({
      requestId: ad.requestId,
      campaignId: ad.campaignId,
      creativeId: ad.creativeId,
      placementKey: ad.placementKey,
      eventType: "hide",
    });

    hideAd({ campaignId: ad.campaignId });
    setIsDismissed(true);
  };

  if (isLoading || !ad || isDismissed) {
    return null;
  }

  const isTopBanner = placementKey === "BANNER_TOP";

  return (
    <div
      ref={bannerRef}
      className={cn(
        "relative bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border rounded-lg overflow-hidden cursor-pointer transition-all hover:border-primary/30",
        isTopBanner ? "p-4" : "p-3",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-4">
        {ad.imageUrl && (
          <img
            src={ad.imageUrl}
            alt={ad.headline}
            className={cn(
              "object-cover rounded-md flex-shrink-0",
              isTopBanner ? "w-20 h-20" : "w-16 h-16"
            )}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Sponsored
            </Badge>
            {ad.advertiserName && (
              <span className="text-xs text-muted-foreground">{ad.advertiserName}</span>
            )}
          </div>
          <h4 className={cn("font-medium text-foreground truncate", isTopBanner ? "text-base" : "text-sm")}>
            {ad.headline}
          </h4>
          {ad.body && isTopBanner && (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{ad.body}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              {ad.displayUrl || new URL(ad.clickUrl).hostname}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="default"
          className="flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          {ad.callToAction}
        </Button>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss ad"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default BannerAd;
