-- Complete the remaining security fixes

-- ============================================
-- 1. FIX ERROR: post_boosts - Fix policy conflict
-- ============================================
DROP POLICY IF EXISTS "Anyone can view succeeded boosts" ON public.post_boosts;
DROP POLICY IF EXISTS "Users can view their own boosts" ON public.post_boosts;
DROP POLICY IF EXISTS "Post owners can view boosts on their posts" ON public.post_boosts;

-- Recreate with proper security - users can only see their own boosts or boosts on their posts
CREATE POLICY "Users can view their own boosts"
ON public.post_boosts
FOR SELECT
USING (auth.uid() = from_user_id);

CREATE POLICY "Post owners can view boosts on their posts"
ON public.post_boosts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_boosts.post_id 
    AND posts.user_id = auth.uid()
  )
  AND status = 'succeeded'
);

-- ============================================
-- 2. FIX ERROR: comments - Require authentication to view
-- ============================================
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;

CREATE POLICY "Authenticated users can view comments"
ON public.comments
FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================
-- 3. FIX ERROR: posts - Require authentication to view
-- ============================================
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can view posts" ON public.posts;

CREATE POLICY "Authenticated users can view posts"
ON public.posts
FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================
-- 4. FIX ERROR: community_roles - Require authentication to view
-- ============================================
DROP POLICY IF EXISTS "Anyone can view community roles" ON public.community_roles;
DROP POLICY IF EXISTS "Authenticated users can view community roles" ON public.community_roles;

CREATE POLICY "Authenticated users can view community roles"
ON public.community_roles
FOR SELECT
USING (auth.role() = 'authenticated');