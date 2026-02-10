
-- Create a view that pre-filters out drafts, not-yet-scheduled, and removed posts.
-- This eliminates the complex nested and() filter that causes PostgREST 400 errors.
CREATE OR REPLACE VIEW public.public_posts WITH (security_invoker = on) AS
SELECT *
FROM public.posts
WHERE (is_draft IS NULL OR is_draft = false)
  AND (scheduled_at IS NULL OR scheduled_at <= now())
  AND (is_removed IS NULL OR is_removed = false);
