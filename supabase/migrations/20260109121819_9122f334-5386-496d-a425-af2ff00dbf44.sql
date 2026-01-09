-- Fix remaining ERROR issues: filter removed content and restrict sensitive data

-- ============================================
-- 1. FIX ERROR: posts - Filter out removed posts from public view
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view posts" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

-- Users can view non-removed posts only (unless they own the post or are a moderator)
CREATE POLICY "Authenticated users can view visible posts"
ON public.posts
FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND (
    is_removed IS NOT TRUE
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  )
);

-- ============================================
-- 2. FIX ERROR: comments - Filter out removed comments from public view
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

-- Users can view non-removed comments only (unless they own the comment or are a moderator)
CREATE POLICY "Authenticated users can view visible comments"
ON public.comments
FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND (
    is_removed IS NOT TRUE
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  )
);

-- ============================================
-- 3. FIX ERROR: profiles - Already has policies, but note that
-- for a social platform, viewing other users' profiles is expected behavior
-- The allow_nsfw field is a user preference that doesn't expose sensitive data
-- ============================================
-- No additional changes needed - profiles policy is appropriate for social platform