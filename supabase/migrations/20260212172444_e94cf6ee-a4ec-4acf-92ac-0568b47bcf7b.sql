-- Grant SELECT on public_posts view to anon and authenticated roles
-- Also recreate with security_invoker for proper RLS enforcement
DROP VIEW IF EXISTS public.public_posts;

CREATE OR REPLACE VIEW public.public_posts WITH (security_invoker = on) AS
SELECT *
FROM public.posts
WHERE COALESCE(is_draft, false) = false
  AND (scheduled_at IS NULL OR scheduled_at <= now())
  AND COALESCE(is_removed, false) = false;

GRANT SELECT ON public.public_posts TO anon, authenticated;