-- Add public read access for guests to browse posts, comments, and profiles
-- Posts: allow anon users to read public (non-draft, non-scheduled) posts
DROP POLICY IF EXISTS "Public read posts" ON public.posts;
CREATE POLICY "Public read posts"
ON public.posts
FOR SELECT
TO anon, authenticated
USING (
  coalesce(is_draft, false) = false
  AND coalesce(is_removed, false) = false
  AND (scheduled_at IS NULL OR scheduled_at <= now())
);

-- Comments: allow anon users to read non-removed comments  
DROP POLICY IF EXISTS "Public read comments" ON public.comments;
CREATE POLICY "Public read comments"
ON public.comments
FOR SELECT
TO anon, authenticated
USING (
  coalesce(is_removed, false) = false
);

-- Profiles: allow anon users to read public profile info (username, display_name, avatar)
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Communities: allow anon users to view communities
DROP POLICY IF EXISTS "Public read communities" ON public.communities;
CREATE POLICY "Public read communities"
ON public.communities
FOR SELECT
TO anon, authenticated
USING (true);