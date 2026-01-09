import { useEffect, useRef, useState } from "react";
import { useAdRequest, useAdEvent, useAdHide, AdRequestContext, AdCreative } from "@/hooks/useAds";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreHorizontal, EyeOff, HelpCircle, Flag, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdSlotProps {
  placementKey: string;
  context?: Partial<AdRequestContext>;
  className?: string;
  variant?: "feed" | "sidebar" | "banner" | "video";
}

export function AdSlot({ placementKey, context = {}, className, variant = "feed" }: AdSlotProps) {
  const { user } = useAuth();
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);

  const fullContext: AdRequestContext = {
    placementKey,
    ...context,
  };

  const { data: adResponse, isLoading } = useAdRequest(fullContext);
  const { mutate: trackEvent } = useAdEvent();
  const { mutate: hideAd, isPending: isHiding } = useAdHide();

  const ad = adResponse?.ad;

  // Track impression when ad comes into view
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
              postId: context.postId,
              community: context.loopId,
            });
            setHasTrackedImpression(true);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (adContainerRef.current) {
      observer.observe(adContainerRef.current);
    }

    return () => observer.disconnect();
  }, [ad, hasTrackedImpression, trackEvent, context]);

  const handleClick = () => {
    if (!ad) return;

    trackEvent({
      requestId: ad.requestId,
      campaignId: ad.campaignId,
      creativeId: ad.creativeId,
      placementKey: ad.placementKey,
      eventType: "click",
      postId: context.postId,
      community: context.loopId,
    });

    // Open click URL
    window.open(ad.clickUrl, "_blank", "noopener,noreferrer");
  };

  const handleHide = () => {
    if (!ad) return;

    trackEvent({
      requestId: ad.requestId,
      campaignId: ad.campaignId,
      creativeId: ad.creativeId,
      placementKey: ad.placementKey,
      eventType: "hide",
    });

    hideAd({ campaignId: ad.campaignId });
  };

  // Don't render anything if no ad or loading
  if (isLoading || !ad) {
    return null;
  }

  if (variant === "sidebar") {
    return (
      <SidebarAd
        ad={ad}
        ref={adContainerRef}
        className={className}
        onHide={handleHide}
        onWhyClick={() => setShowWhyModal(true)}
        onClick={handleClick}
        isHiding={isHiding}
        showWhyModal={showWhyModal}
        setShowWhyModal={setShowWhyModal}
      />
    );
  }

  return (
    <FeedAd
      ad={ad}
      ref={adContainerRef}
      className={className}
      onHide={handleHide}
      onWhyClick={() => setShowWhyModal(true)}
      onClick={handleClick}
      isHiding={isHiding}
      showWhyModal={showWhyModal}
      setShowWhyModal={setShowWhyModal}
    />
  );
}

interface AdCardProps {
  ad: AdCreative;
  className?: string;
  onHide: () => void;
  onWhyClick: () => void;
  onClick: () => void;
  isHiding: boolean;
  showWhyModal: boolean;
  setShowWhyModal: (show: boolean) => void;
}

const FeedAd = React.forwardRef<HTMLDivElement, AdCardProps>(
  ({ ad, className, onHide, onWhyClick, onClick, isHiding, showWhyModal, setShowWhyModal }, ref) => {
    return (
      <>
        <div
          ref={ref}
          className={cn(
            "bg-card border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer",
            className
          )}
          onClick={onClick}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                {ad.advertiserIcon ? (
                  <AvatarImage src={ad.advertiserIcon} alt={ad.advertiserName || "Advertiser"} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {ad.advertiserName?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="text-sm font-medium text-foreground">
                  {ad.advertiserName || "Promoted"}
                </span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  Promoted
                </Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onHide(); }} disabled={isHiding}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Hide ad
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onWhyClick(); }}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Why am I seeing this?
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Flag className="mr-2 h-4 w-4" />
                  Report ad
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          <h3 className="font-semibold text-foreground mb-2">{ad.headline}</h3>
          {ad.body && <p className="text-sm text-muted-foreground mb-3">{ad.body}</p>}

          {/* Media */}
          {ad.imageUrl && (
            <div className="relative mb-3 rounded-md overflow-hidden">
              <img
                src={ad.imageUrl}
                alt={ad.headline}
                className="w-full h-auto max-h-[400px] object-cover"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              {ad.displayUrl || new URL(ad.clickUrl).hostname}
            </span>
            <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); onClick(); }}>
              {ad.callToAction}
            </Button>
          </div>
        </div>

        <WhyModal open={showWhyModal} onOpenChange={setShowWhyModal} />
      </>
    );
  }
);

FeedAd.displayName = "FeedAd";

const SidebarAd = React.forwardRef<HTMLDivElement, AdCardProps>(
  ({ ad, className, onHide, onWhyClick, onClick, isHiding, showWhyModal, setShowWhyModal }, ref) => {
    return (
      <>
        <div
          ref={ref}
          className={cn(
            "bg-card border border-border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer",
            className
          )}
          onClick={onClick}
        >
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-xs">
              Sponsored
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onHide(); }} disabled={isHiding}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Hide
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onWhyClick(); }}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Why?
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {ad.imageUrl && (
            <img
              src={ad.imageUrl}
              alt={ad.headline}
              className="w-full h-auto rounded-md mb-2"
            />
          )}

          <h4 className="text-sm font-medium text-foreground mb-1 line-clamp-2">{ad.headline}</h4>
          <span className="text-xs text-muted-foreground">{ad.displayUrl || new URL(ad.clickUrl).hostname}</span>
        </div>

        <WhyModal open={showWhyModal} onOpenChange={setShowWhyModal} />
      </>
    );
  }
);

SidebarAd.displayName = "SidebarAd";

function WhyModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Why am I seeing this ad?</DialogTitle>
          <DialogDescription>
            This ad is shown based on contextual targeting:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            <strong>Contextual targeting:</strong> The advertiser chose to show this ad based on the
            content you're currently viewing, such as the community or topic.
          </p>
          <p>
            <strong>No personal tracking:</strong> By default, we don't use your personal data to
            target ads. We respect your privacy.
          </p>
          <div className="pt-2">
            <p className="font-medium text-foreground mb-2">You can:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Hide this ad to see fewer like it</li>
              <li>Report ads that seem inappropriate</li>
              <li>Manage your ad preferences in Settings</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React from "react";
