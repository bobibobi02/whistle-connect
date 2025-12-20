-- Fix the view to use SECURITY INVOKER instead of default SECURITY DEFINER
DROP VIEW IF EXISTS public.post_boost_totals;

CREATE VIEW public.post_boost_totals 
WITH (security_invoker = true) AS
SELECT 
  post_id,
  COUNT(*) as boost_count,
  COALESCE(SUM(amount_cents), 0) as total_amount_cents,
  currency
FROM public.post_boosts
WHERE status = 'succeeded'
GROUP BY post_id, currency;