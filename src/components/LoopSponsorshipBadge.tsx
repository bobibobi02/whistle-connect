import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles } from "lucide-react";
import { useAdEvent } from "@/hooks/useAds";
import { useEffect, useRef, useState } from "react";

interface LoopSponsorshipBadgeProps {
  communityId: string;
  className?: string;
}

interface LoopSponsorship {
  id: string;
  community_id: string;
  advertiser_id: string;
  campaign_id: string | null;
  label_text: string;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
  status: string;
}

export function LoopSponsorshipBadge({ communityId, className }: LoopSponsorshipBadgeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasTracked, setHasTracked] = useState(false);
  const { mutate: trackEvent } = useAdEvent();

  const { data: sponsorship } = useQuery({
    queryKey: ["loop-sponsorship", communityId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("loop_sponsorships")
        .select("*")
        .eq("community_id", communityId)
        .eq("status", "active")
        .or(`start_at.is.null,start_at.lte.${now}`)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as LoopSponsorship | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Track impression when visible
  useEffect(() => {
    if (!sponsorship || hasTracked || !sponsorship.campaign_id) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTracked) {
            trackEvent({
              requestId: null,
              campaignId: sponsorship.campaign_id!,
              creativeId: sponsorship.id,
              placementKey: "LOOP_SPONSORED",
              eventType: "impression",
              community: communityId,
            });
            setHasTracked(true);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [sponsorship, hasTracked, trackEvent, communityId]);

  if (!sponsorship) return null;

  return (
    <div
      ref={ref}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 ${className}`}
    >
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs text-muted-foreground">{sponsorship.label_text}</span>
      {sponsorship.sponsor_logo_url && (
        <Avatar className="h-5 w-5">
          <AvatarImage src={sponsorship.sponsor_logo_url} alt={sponsorship.sponsor_name || "Sponsor"} />
          <AvatarFallback className="text-[10px]">
            {sponsorship.sponsor_name?.charAt(0) || "S"}
          </AvatarFallback>
        </Avatar>
      )}
      {sponsorship.sponsor_name && (
        <span className="text-xs font-medium text-foreground">{sponsorship.sponsor_name}</span>
      )}
      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
        Sponsored
      </Badge>
    </div>
  );
}

export default LoopSponsorshipBadge;
