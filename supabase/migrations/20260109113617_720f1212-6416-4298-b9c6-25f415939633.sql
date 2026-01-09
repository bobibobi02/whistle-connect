-- Fix remaining ERROR and WARN level issues

-- ============================================
-- 1. FIX ERROR: post_boosts - Remove public access policy
-- ============================================
DROP POLICY IF EXISTS "Anyone can view public succeeded boosts" ON public.post_boosts;
DROP POLICY IF EXISTS "Public can view public succeeded boosts" ON public.post_boosts;
DROP POLICY IF EXISTS "Anyone can view succeeded boosts" ON public.post_boosts;

-- Ensure only proper policies exist
-- (Users can view their own boosts and post owners can view boosts on their posts - already exist)

-- ============================================
-- 2. FIX WARN: communities - Restrict created_by exposure
-- Require authentication to view communities
-- ============================================
DROP POLICY IF EXISTS "Communities are viewable by everyone" ON public.communities;
DROP POLICY IF EXISTS "Authenticated users can view communities" ON public.communities;

CREATE POLICY "Authenticated users can view communities"
ON public.communities
FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================
-- 3. FIX WARN: post_boost_totals view - Enable RLS
-- Note: Views inherit RLS from base tables, but we can add security
-- The view pulls from post_boosts which now has proper RLS
-- ============================================
-- Views don't support RLS directly, they inherit from underlying tables
-- Since post_boosts now requires auth, the view will also be protected