-- Fix database views with security_invoker=true for proper RLS inheritance
-- This prevents views from bypassing RLS on underlying tables

-- Recreate public_profiles view with security_invoker
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker = on) AS
SELECT 
  p.id,
  p.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.created_at,
  p.karma,
  p.is_verified
FROM public.profiles p;

-- Recreate ad_revenue_summary view with security_invoker
DROP VIEW IF EXISTS public.ad_revenue_summary;
CREATE VIEW public.ad_revenue_summary WITH (security_invoker = on) AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.campaign_type,
  c.advertiser_id,
  a.name as advertiser_name,
  c.status,
  c.budget_cents as gross_revenue_cents,
  ROUND(c.budget_cents * 0.30) as platform_fee_cents,
  ROUND(c.budget_cents * 0.70) as net_revenue_cents,
  (SELECT COUNT(*) FROM ad_events ae WHERE ae.campaign_id = c.id AND ae.event_type = 'impression') as impressions,
  (SELECT COUNT(*) FROM ad_events ae WHERE ae.campaign_id = c.id AND ae.event_type = 'click') as clicks,
  CASE 
    WHEN (SELECT COUNT(*) FROM ad_events ae WHERE ae.campaign_id = c.id AND ae.event_type = 'impression') > 0 
    THEN ROUND(
      (SELECT COUNT(*) FROM ad_events ae WHERE ae.campaign_id = c.id AND ae.event_type = 'click')::numeric / 
      (SELECT COUNT(*) FROM ad_events ae WHERE ae.campaign_id = c.id AND ae.event_type = 'impression')::numeric * 100, 2
    )
    ELSE 0
  END as ctr
FROM campaigns c
JOIN advertisers a ON c.advertiser_id = a.id;

-- Recreate campaign_performance view with security_invoker
DROP VIEW IF EXISTS public.campaign_performance;
CREATE VIEW public.campaign_performance WITH (security_invoker = on) AS
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
  (SELECT COUNT(*) FROM ad_events ae WHERE ae.campaign_id = c.id AND ae.event_type = 'impression') as impressions,
  (SELECT COUNT(*) FROM ad_events ae WHERE ae.campaign_id = c.id AND ae.event_type = 'click') as clicks,
  CASE 
    WHEN (SELECT COUNT(*) FROM ad_events ae WHERE ae.campaign_id = c.id AND ae.event_type = 'impression') > 0 
    THEN ROUND(
      (SELECT COUNT(*) FROM ad_events ae WHERE ae.campaign_id = c.id AND ae.event_type = 'click')::numeric / 
      (SELECT COUNT(*) FROM ad_events ae WHERE ae.campaign_id = c.id AND ae.event_type = 'impression')::numeric * 100, 2
    )
    ELSE 0
  END as ctr,
  COALESCE((SELECT SUM(revenue_cents) FROM ad_events ae WHERE ae.campaign_id = c.id), 0) as total_revenue_cents
FROM campaigns c
JOIN advertisers a ON c.advertiser_id = a.id;

-- Recreate creator_earnings_summary view with security_invoker
DROP VIEW IF EXISTS public.creator_earnings_summary;
CREATE VIEW public.creator_earnings_summary WITH (security_invoker = on) AS
SELECT 
  cm.user_id,
  p.username,
  p.display_name,
  cm.enabled,
  cm.eligibility_status,
  cm.creator_share_percent,
  cm.total_earnings_cents,
  cm.pending_payout_cents,
  (SELECT COALESCE(SUM(ce.finalized_cents), 0) 
   FROM creator_earnings ce 
   WHERE ce.user_id = cm.user_id 
   AND ce.period_start >= date_trunc('month', now())) as this_month_cents,
  (SELECT COALESCE(SUM(ce.finalized_cents), 0) 
   FROM creator_earnings ce 
   WHERE ce.user_id = cm.user_id 
   AND ce.period_start >= date_trunc('month', now() - interval '1 month')
   AND ce.period_start < date_trunc('month', now())) as last_month_cents
FROM creator_monetization cm
LEFT JOIN profiles p ON cm.user_id = p.user_id;

-- Recreate post_boost_totals view with security_invoker
DROP VIEW IF EXISTS public.post_boost_totals;
CREATE VIEW public.post_boost_totals WITH (security_invoker = on) AS
SELECT 
  pb.post_id,
  COUNT(*) as boost_count,
  SUM(pb.amount_cents) as total_amount_cents,
  pb.currency
FROM post_boosts pb
WHERE pb.status = 'succeeded' AND pb.is_public = true
GROUP BY pb.post_id, pb.currency;

-- Create anonymous_submissions table for whistleblower functionality
CREATE TABLE IF NOT EXISTS public.anonymous_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  content text NOT NULL,
  file_urls text[] DEFAULT '{}',
  target_community text,
  status text NOT NULL DEFAULT 'pending',
  priority text DEFAULT 'normal',
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on anonymous_submissions
ALTER TABLE public.anonymous_submissions ENABLE ROW LEVEL SECURITY;

-- Only admins/mods can view and manage submissions
CREATE POLICY "Admins and moderators can view all submissions"
ON public.anonymous_submissions FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "Admins and moderators can update submissions"
ON public.anonymous_submissions FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Anonymous users can insert submissions (no auth required for insert)
CREATE POLICY "Anyone can create anonymous submissions"
ON public.anonymous_submissions FOR INSERT
WITH CHECK (true);

-- Create submission_responses table for moderator responses
CREATE TABLE IF NOT EXISTS public.submission_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.anonymous_submissions(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL,
  content text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.submission_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and moderators can manage responses"
ON public.submission_responses FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_anonymous_submissions_status ON public.anonymous_submissions(status);
CREATE INDEX IF NOT EXISTS idx_anonymous_submissions_category ON public.anonymous_submissions(category);
CREATE INDEX IF NOT EXISTS idx_anonymous_submissions_created_at ON public.anonymous_submissions(created_at DESC);

-- Enable leaked password protection (warning from security scan)
-- This needs to be done via Supabase dashboard, but we log the recommendation