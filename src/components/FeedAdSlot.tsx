import React from "react";
import { AdSlot } from "@/components/AdSlot";

interface FeedAdSlotProps {
  loopId?: string;
  className?: string;
}

// A feed-optimized ad slot that matches PostCard styling
export function FeedAdSlot({ loopId, className }: FeedAdSlotProps) {
  return (
    <AdSlot 
      placementKey="FEED_INLINE"
      context={{ loopId }}
      variant="feed"
      className={className}
    />
  );
}

export default FeedAdSlot;
