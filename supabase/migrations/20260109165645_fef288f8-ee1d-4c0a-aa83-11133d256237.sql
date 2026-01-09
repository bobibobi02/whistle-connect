-- Fix security issues with views and function

-- 1. Fix the function search_path
CREATE OR REPLACE FUNCTION public.update_ad_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 2. Drop and recreate views with SECURITY INVOKER (default, not DEFINER)
-- The views were created with default settings which is SECURITY INVOKER
-- But we need to explicitly set security context

-- Drop existing views
DROP VIEW IF EXISTS public.campaign_performance;
DROP VIEW IF EXISTS public.creator_earnings_summary;

-- Recreate campaign_performance as a regular view (SECURITY INVOKER is default)
CREATE VIEW public.campaign_performance AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.advertiser_id,
  a.name as advertiser_name,
  c.status,
  c.bid_type,
  c.bid_value_cents,
  c.budget_cents,
  c.spent_cents,
  COUNT(CASE WHEN e.event_type = 'impression' THEN 1 END) as impressions,
  COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) as clicks,
  CASE 
    WHEN COUNT(CASE WHEN e.event_type = 'impression' THEN 1 END) > 0 
    THEN ROUND(COUNT(CASE WHEN e.event_type = 'click' THEN 1 END)::numeric / 
         COUNT(CASE WHEN e.event_type = 'impression' THEN 1 END) * 100, 2)
    ELSE 0 
  END as ctr,
  COALESCE(SUM(e.revenue_cents), 0) as total_revenue_cents
FROM public.campaigns c
JOIN public.advertisers a ON c.advertiser_id = a.id
LEFT JOIN public.ad_events e ON c.id = e.campaign_id
GROUP BY c.id, c.name, c.advertiser_id, a.name, c.status, c.bid_type, c.bid_value_cents, c.budget_cents, c.spent_cents;

-- Recreate creator_earnings_summary as a regular view
CREATE VIEW public.creator_earnings_summary AS
SELECT 
  cm.user_id,
  p.username,
  p.display_name,
  cm.enabled,
  cm.eligibility_status,
  cm.creator_share_percent,
  cm.total_earnings_cents,
  cm.pending_payout_cents,
  COALESCE(SUM(CASE WHEN ce.period_start >= date_trunc('month', CURRENT_DATE) THEN ce.estimated_cents ELSE 0 END), 0) as this_month_cents,
  COALESCE(SUM(CASE WHEN ce.period_start >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
                    AND ce.period_end < date_trunc('month', CURRENT_DATE) THEN ce.finalized_cents ELSE 0 END), 0) as last_month_cents
FROM public.creator_monetization cm
LEFT JOIN public.profiles p ON cm.user_id = p.user_id
LEFT JOIN public.creator_earnings ce ON cm.user_id = ce.user_id
GROUP BY cm.user_id, p.username, p.display_name, cm.enabled, cm.eligibility_status, 
         cm.creator_share_percent, cm.total_earnings_cents, cm.pending_payout_cents;