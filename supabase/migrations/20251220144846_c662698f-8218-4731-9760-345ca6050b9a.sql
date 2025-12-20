-- Add live_url column to posts table for Live Posts feature
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS live_url text NULL;

-- Create post_boosts table for Stripe monetization
CREATE TABLE public.post_boosts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  from_user_id uuid NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'eur',
  message text NULL,
  is_public boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  stripe_checkout_session_id text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on post_boosts
ALTER TABLE public.post_boosts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_boosts

-- Anyone can read boost totals (aggregated data is public)
CREATE POLICY "Anyone can view boost totals"
ON public.post_boosts
FOR SELECT
USING (true);

-- Authenticated users can create boosts for themselves
CREATE POLICY "Authenticated users can create boosts"
ON public.post_boosts
FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

-- Only service role can update status (for webhook)
CREATE POLICY "Service role can update boost status"
ON public.post_boosts
FOR UPDATE
USING (auth.role() = 'service_role');

-- Create view for post boost totals
CREATE OR REPLACE VIEW public.post_boost_totals AS
SELECT 
  post_id,
  COUNT(*) as boost_count,
  COALESCE(SUM(amount_cents), 0) as total_amount_cents,
  currency
FROM public.post_boosts
WHERE status = 'succeeded'
GROUP BY post_id, currency;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_boosts_post_id ON public.post_boosts(post_id);
CREATE INDEX IF NOT EXISTS idx_post_boosts_status ON public.post_boosts(status);
CREATE INDEX IF NOT EXISTS idx_posts_live_url ON public.posts(live_url) WHERE live_url IS NOT NULL;