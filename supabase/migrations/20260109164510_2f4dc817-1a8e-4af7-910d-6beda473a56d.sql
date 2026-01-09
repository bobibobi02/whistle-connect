-- ============================================
-- WHISTLE AD MONETIZATION SYSTEM
-- ============================================

-- Enums for type safety
CREATE TYPE public.ad_objective AS ENUM ('awareness', 'clicks', 'engagement');
CREATE TYPE public.ad_bid_type AS ENUM ('cpm', 'cpc');
CREATE TYPE public.ad_creative_type AS ENUM ('image', 'video', 'text');
CREATE TYPE public.ad_event_type AS ENUM ('impression', 'click', 'hide', 'skip', 'complete');
CREATE TYPE public.ad_status AS ENUM ('draft', 'pending', 'active', 'paused', 'completed', 'rejected');
CREATE TYPE public.monetization_eligibility AS ENUM ('pending', 'eligible', 'ineligible', 'suspended');
CREATE TYPE public.earnings_status AS ENUM ('estimated', 'finalized', 'paid');
CREATE TYPE public.payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ============================================
-- 1. ADVERTISERS TABLE
-- ============================================
CREATE TABLE public.advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  billing_email TEXT NOT NULL,
  company_name TEXT,
  website_url TEXT,
  status public.ad_status NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;

-- Only admins can manage advertisers
CREATE POLICY "Admins can manage advertisers"
ON public.advertisers
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_advertisers_status ON public.advertisers(status);

-- ============================================
-- 2. CAMPAIGNS TABLE
-- ============================================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective public.ad_objective NOT NULL DEFAULT 'awareness',
  status public.ad_status NOT NULL DEFAULT 'draft',
  bid_type public.ad_bid_type NOT NULL DEFAULT 'cpm',
  bid_value_cents INTEGER NOT NULL DEFAULT 100, -- e.g., $1.00 CPM = 100 cents
  budget_cents INTEGER NOT NULL DEFAULT 0,
  spent_cents INTEGER NOT NULL DEFAULT 0,
  daily_cap_cents INTEGER,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns"
ON public.campaigns
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_campaigns_advertiser ON public.campaigns(advertiser_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_dates ON public.campaigns(start_at, end_at);

-- ============================================
-- 3. CREATIVES TABLE
-- ============================================
CREATE TABLE public.creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  type public.ad_creative_type NOT NULL DEFAULT 'image',
  headline TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  video_url TEXT,
  click_url TEXT NOT NULL,
  display_url TEXT,
  call_to_action TEXT DEFAULT 'Learn More',
  advertiser_name TEXT, -- Display name for the ad
  advertiser_icon TEXT, -- Icon URL
  status public.ad_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage creatives"
ON public.creatives
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role can read active creatives for ad serving
CREATE POLICY "Service role can read active creatives"
ON public.creatives
FOR SELECT
USING (auth.role() = 'service_role');

CREATE INDEX idx_creatives_campaign ON public.creatives(campaign_id);
CREATE INDEX idx_creatives_status ON public.creatives(status);

-- ============================================
-- 4. PLACEMENTS TABLE
-- ============================================
CREATE TABLE public.placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- e.g., 'FEED', 'LOOP_FEED', 'POST_VIEW_RAIL'
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  insertion_frequency INTEGER DEFAULT 10, -- Every N posts for feed placements
  rules JSONB DEFAULT '{}', -- Custom rules like max_per_page, min_content_before, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage placements"
ON public.placements
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role can read enabled placements for ad serving
CREATE POLICY "Service role can read placements"
ON public.placements
FOR SELECT
USING (auth.role() = 'service_role');

-- Insert default placements
INSERT INTO public.placements (key, name, description, insertion_frequency, rules) VALUES
('FEED', 'Main Feed', 'Promoted posts in the main home feed', 10, '{"max_per_page": 3, "min_posts_before_first": 3}'),
('LOOP_FEED', 'Community Feed', 'Promoted posts in community/loop feeds', 10, '{"max_per_page": 2, "min_posts_before_first": 5}'),
('POST_VIEW_RAIL', 'Post Detail Sidebar', 'Sponsored unit in post detail right rail', NULL, '{"position": "sidebar"}'),
('COMMENTS_INSERT', 'Comments Section', 'Sponsored unit after top comments', NULL, '{"insert_after_comment": 3}'),
('VIDEO_PREROLL', 'Video Pre-roll', 'Video ad before content', NULL, '{"skippable_after_seconds": 5, "max_duration_seconds": 30}'),
('VIDEO_MIDROLL', 'Video Mid-roll', 'Video ad during content', NULL, '{"min_content_duration_seconds": 300, "skippable_after_seconds": 5}');

-- ============================================
-- 5. TARGETING RULES TABLE
-- ============================================
CREATE TABLE public.targeting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  countries TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  communities TEXT[] DEFAULT '{}', -- Loop names for targeting
  keywords TEXT[] DEFAULT '{}',
  exclude_keywords TEXT[] DEFAULT '{}',
  nsfw_allowed BOOLEAN DEFAULT false,
  device_types TEXT[] DEFAULT '{}', -- 'desktop', 'mobile', 'tablet'
  min_account_age_days INTEGER DEFAULT 0,
  placement_keys TEXT[] DEFAULT '{}', -- Which placements this campaign can appear in
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.targeting_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage targeting rules"
ON public.targeting_rules
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can read targeting rules"
ON public.targeting_rules
FOR SELECT
USING (auth.role() = 'service_role');

CREATE INDEX idx_targeting_campaign ON public.targeting_rules(campaign_id);

-- ============================================
-- 6. AD REQUESTS TABLE (for deduplication)
-- ============================================
CREATE TABLE public.ad_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_key TEXT NOT NULL,
  user_id UUID,
  session_id TEXT,
  context JSONB DEFAULT '{}',
  campaign_id UUID REFERENCES public.campaigns(id),
  creative_id UUID REFERENCES public.creatives(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage ad requests"
ON public.ad_requests
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_ad_requests_user ON public.ad_requests(user_id, created_at);
CREATE INDEX idx_ad_requests_session ON public.ad_requests(session_id, created_at);
CREATE INDEX idx_ad_requests_created ON public.ad_requests(created_at);

-- ============================================
-- 7. AD EVENTS TABLE
-- ============================================
CREATE TABLE public.ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_request_id UUID REFERENCES public.ad_requests(id),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id),
  creative_id UUID NOT NULL REFERENCES public.creatives(id),
  placement_key TEXT NOT NULL,
  event_type public.ad_event_type NOT NULL,
  user_id UUID,
  post_id UUID REFERENCES public.posts(id),
  community TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  revenue_cents INTEGER DEFAULT 0, -- Revenue generated by this event
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage ad events"
ON public.ad_events
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Admins can view ad events for analytics
CREATE POLICY "Admins can view ad events"
ON public.ad_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ad_events_campaign ON public.ad_events(campaign_id, created_at);
CREATE INDEX idx_ad_events_creative ON public.ad_events(creative_id, created_at);
CREATE INDEX idx_ad_events_type ON public.ad_events(event_type, created_at);
CREATE INDEX idx_ad_events_post ON public.ad_events(post_id) WHERE post_id IS NOT NULL;

-- ============================================
-- 8. CREATOR MONETIZATION TABLE
-- ============================================
CREATE TABLE public.creator_monetization (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  eligibility_status public.monetization_eligibility NOT NULL DEFAULT 'pending',
  eligibility_reason TEXT,
  payout_method TEXT, -- 'paypal', 'bank_transfer', etc.
  payout_details JSONB DEFAULT '{}', -- Encrypted/hashed payout info
  min_payout_cents INTEGER DEFAULT 10000, -- $100 minimum payout
  creator_share_percent INTEGER DEFAULT 55, -- 55% to creator by default
  total_earnings_cents INTEGER DEFAULT 0,
  pending_payout_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_monetization ENABLE ROW LEVEL SECURITY;

-- Users can view/update their own monetization settings
CREATE POLICY "Users can view own monetization"
ON public.creator_monetization
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own monetization"
ON public.creator_monetization
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monetization"
ON public.creator_monetization
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all monetization
CREATE POLICY "Admins can manage all monetization"
ON public.creator_monetization
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role for edge functions
CREATE POLICY "Service role can manage monetization"
ON public.creator_monetization
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 9. CREATOR EARNINGS TABLE
-- ============================================
CREATE TABLE public.creator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  estimated_cents INTEGER DEFAULT 0,
  finalized_cents INTEGER DEFAULT 0,
  status public.earnings_status NOT NULL DEFAULT 'estimated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_start, period_end)
);

ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own earnings"
ON public.creator_earnings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all earnings"
ON public.creator_earnings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage earnings"
ON public.creator_earnings
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_creator_earnings_user ON public.creator_earnings(user_id, period_start);
CREATE INDEX idx_creator_earnings_status ON public.creator_earnings(status);

-- ============================================
-- 10. AD REVENUE ALLOCATIONS TABLE
-- ============================================
CREATE TABLE public.ad_revenue_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_event_id UUID NOT NULL REFERENCES public.ad_events(id) ON DELETE CASCADE,
  creator_user_id UUID NOT NULL REFERENCES auth.users(id),
  post_id UUID REFERENCES public.posts(id),
  amount_cents INTEGER NOT NULL,
  status public.earnings_status NOT NULL DEFAULT 'estimated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_revenue_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own allocations"
ON public.ad_revenue_allocations
FOR SELECT
USING (auth.uid() = creator_user_id);

CREATE POLICY "Admins can manage all allocations"
ON public.ad_revenue_allocations
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage allocations"
ON public.ad_revenue_allocations
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_allocations_creator ON public.ad_revenue_allocations(creator_user_id, created_at);
CREATE INDEX idx_allocations_event ON public.ad_revenue_allocations(ad_event_id);

-- ============================================
-- 11. PAYOUTS TABLE
-- ============================================
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.payout_status NOT NULL DEFAULT 'pending',
  provider TEXT, -- 'paypal', 'stripe', etc.
  provider_ref TEXT, -- External reference ID
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payouts"
ON public.payouts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can request payouts"
ON public.payouts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payouts"
ON public.payouts
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_payouts_user ON public.payouts(user_id, created_at);
CREATE INDEX idx_payouts_status ON public.payouts(status);

-- ============================================
-- 12. USER AD PREFERENCES TABLE
-- ============================================
CREATE TABLE public.user_ad_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  personalized_ads_consent BOOLEAN DEFAULT false,
  hidden_campaign_ids UUID[] DEFAULT '{}',
  hidden_advertiser_ids UUID[] DEFAULT '{}',
  ad_topics_interest TEXT[] DEFAULT '{}',
  ad_topics_exclude TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ad_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ad preferences"
ON public.user_ad_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can read ad preferences"
ON public.user_ad_preferences
FOR SELECT
USING (auth.role() = 'service_role');

-- ============================================
-- 13. AD REPORTS TABLE
-- ============================================
CREATE TABLE public.ad_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  campaign_id UUID REFERENCES public.campaigns(id),
  creative_id UUID REFERENCES public.creatives(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create ad reports"
ON public.ad_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own ad reports"
ON public.ad_reports
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all ad reports"
ON public.ad_reports
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 14. PLATFORM SETTINGS TABLE
-- ============================================
CREATE TABLE public.ad_platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform settings"
ON public.ad_platform_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can read platform settings"
ON public.ad_platform_settings
FOR SELECT
USING (auth.role() = 'service_role');

-- Insert default settings
INSERT INTO public.ad_platform_settings (key, value, description) VALUES
('default_creator_share', '{"percent": 55}', 'Default creator revenue share percentage'),
('min_payout_amount', '{"cents": 10000}', 'Minimum payout amount in cents ($100)'),
('feed_ad_frequency', '{"posts_between": 10}', 'Number of posts between feed ads'),
('impression_dedup_seconds', '{"seconds": 60}', 'Seconds to deduplicate impressions'),
('eligibility_requirements', '{"min_posts": 10, "min_followers": 100, "min_account_age_days": 30}', 'Requirements for monetization eligibility');

-- ============================================
-- 15. AGGREGATED VIEWS FOR ANALYTICS
-- ============================================
CREATE OR REPLACE VIEW public.campaign_performance AS
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

CREATE OR REPLACE VIEW public.creator_earnings_summary AS
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

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION public.update_ad_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_advertisers_updated_at
  BEFORE UPDATE ON public.advertisers
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_updated_at();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_updated_at();

CREATE TRIGGER update_creatives_updated_at
  BEFORE UPDATE ON public.creatives
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_updated_at();

CREATE TRIGGER update_placements_updated_at
  BEFORE UPDATE ON public.placements
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_updated_at();

CREATE TRIGGER update_targeting_rules_updated_at
  BEFORE UPDATE ON public.targeting_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_updated_at();

CREATE TRIGGER update_creator_monetization_updated_at
  BEFORE UPDATE ON public.creator_monetization
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_updated_at();

CREATE TRIGGER update_creator_earnings_updated_at
  BEFORE UPDATE ON public.creator_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_updated_at();

CREATE TRIGGER update_user_ad_preferences_updated_at
  BEFORE UPDATE ON public.user_ad_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_updated_at();