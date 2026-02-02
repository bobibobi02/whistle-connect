-- ====== AD PACKAGES: Admin-configurable pricing presets ======
CREATE TABLE IF NOT EXISTS public.ad_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  duration_days integer NOT NULL DEFAULT 7,
  includes_sponsored_posts integer NOT NULL DEFAULT 0,
  includes_banners integer NOT NULL DEFAULT 0,
  includes_loop_sponsorship boolean NOT NULL DEFAULT false,
  includes_reporting boolean NOT NULL DEFAULT true,
  is_exclusive boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;

-- Admins manage packages, service role reads
CREATE POLICY "Admins can manage ad packages"
  ON public.ad_packages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read active packages"
  ON public.ad_packages FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Insert default packages
INSERT INTO public.ad_packages (name, description, price_cents, currency, duration_days, includes_sponsored_posts, includes_banners, includes_reporting, sort_order)
VALUES 
  ('Starter', '€100-€300/week: 1 Sponsored Post with simple reporting', 10000, 'EUR', 7, 1, 0, true, 1),
  ('Local Business', '€200-€500/month: 1 Banner + 2 Sponsored Posts', 20000, 'EUR', 30, 2, 1, true, 2),
  ('Launch Partner', '€500-€2000/month: Exclusive slot + full reporting', 50000, 'EUR', 30, 5, 2, true, 3);

-- ====== LOOP SPONSORSHIPS: Community/Loop sponsorship tracking ======
CREATE TABLE IF NOT EXISTS public.loop_sponsorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  label_text text NOT NULL DEFAULT 'Sponsored',
  sponsor_name text,
  sponsor_logo_url text,
  start_at timestamptz,
  end_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loop_sponsorships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage loop sponsorships"
  ON public.loop_sponsorships FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active sponsorships"
  ON public.loop_sponsorships FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'active');

-- Indexes for loop sponsorships
CREATE INDEX IF NOT EXISTS idx_loop_sponsorships_community ON public.loop_sponsorships(community_id);
CREATE INDEX IF NOT EXISTS idx_loop_sponsorships_status ON public.loop_sponsorships(status) WHERE status = 'active';

-- ====== AD PAYMENTS: Track payments with 30% platform fee ======
CREATE TABLE IF NOT EXISTS public.ad_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.ad_packages(id) ON DELETE SET NULL,
  gross_amount_cents integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  net_amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  payment_method text,
  payment_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ad payments"
  ON public.ad_payments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_ad_payments_advertiser ON public.ad_payments(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_ad_payments_campaign ON public.ad_payments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_payments_status ON public.ad_payments(status);

-- ====== EXTEND CAMPAIGNS: Add campaign type for different ad products ======
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS campaign_type text DEFAULT 'sponsored_post' 
    CHECK (campaign_type IN ('sponsored_post', 'banner', 'loop_sponsorship')),
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.ad_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' 
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed'));

-- ====== EXTEND PLACEMENTS: Add more placement types ======
INSERT INTO public.placements (key, name, description, enabled, insertion_frequency)
VALUES 
  ('BANNER_TOP', 'Top Banner', 'Banner at top of feed', true, 1),
  ('BANNER_SIDEBAR', 'Sidebar Banner', 'Banner in sidebar area', true, 1),
  ('LOOP_SPONSORED', 'Loop Sponsorship', 'Community sponsorship label', true, 1)
ON CONFLICT (key) DO NOTHING;

-- ====== CREATE AD REVENUE VIEW with platform fee breakdown ======
CREATE OR REPLACE VIEW public.ad_revenue_summary WITH (security_invoker=on) AS
SELECT 
  c.id AS campaign_id,
  c.name AS campaign_name,
  a.id AS advertiser_id,
  a.name AS advertiser_name,
  c.campaign_type,
  c.status,
  c.spent_cents AS gross_revenue_cents,
  ROUND(c.spent_cents * 0.30) AS platform_fee_cents,
  ROUND(c.spent_cents * 0.70) AS net_revenue_cents,
  COALESCE(e.impressions, 0) AS impressions,
  COALESCE(e.clicks, 0) AS clicks,
  CASE WHEN COALESCE(e.impressions, 0) > 0 
    THEN ROUND((COALESCE(e.clicks, 0)::numeric / e.impressions::numeric) * 100, 2)
    ELSE 0 
  END AS ctr
FROM public.campaigns c
JOIN public.advertisers a ON c.advertiser_id = a.id
LEFT JOIN (
  SELECT 
    campaign_id,
    COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
    COUNT(*) FILTER (WHERE event_type = 'click') AS clicks
  FROM public.ad_events
  GROUP BY campaign_id
) e ON e.campaign_id = c.id;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_ad_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ad_packages_updated_at
  BEFORE UPDATE ON public.ad_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_tables_updated_at();

CREATE TRIGGER update_loop_sponsorships_updated_at
  BEFORE UPDATE ON public.loop_sponsorships
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_tables_updated_at();

CREATE TRIGGER update_ad_payments_updated_at
  BEFORE UPDATE ON public.ad_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_tables_updated_at();