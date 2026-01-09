-- Properly fix posts and comments by dropping old policies and creating correct ones

-- ============================================
-- 1. FIX: posts - Drop ALL SELECT policies and create proper one
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can view visible posts" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

-- Create policy that filters removed content
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
-- 2. FIX: comments - Drop ALL SELECT policies and create proper one
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can view visible comments" ON public.comments;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

-- Create policy that filters removed content
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
-- 3. FIX: community_user_flairs - Require auth instead of public true
-- ============================================
DROP POLICY IF EXISTS "Anyone can view user flairs" ON public.community_user_flairs;

CREATE POLICY "Authenticated users can view user flairs"
ON public.community_user_flairs
FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================
-- 4. FIX: community_rules - Require auth instead of public true
-- ============================================
DROP POLICY IF EXISTS "Anyone can view community rules" ON public.community_rules;

CREATE POLICY "Authenticated users can view community rules"
ON public.community_rules
FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================
-- 5. FIX: community_flairs - Require auth instead of public true
-- ============================================
DROP POLICY IF EXISTS "Anyone can view flairs" ON public.community_flairs;

CREATE POLICY "Authenticated users can view flairs"
ON public.community_flairs
FOR SELECT
USING (auth.role() = 'authenticated');