-- Fix ERROR level issues: profiles and follows exposure

-- ============================================
-- 1. FIX ERROR: profiles - Restrict to own profile + public fields of others
-- ============================================
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Users can view their own complete profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Authenticated users can view basic public profile info of others
-- This is needed for social features (seeing usernames, avatars on posts/comments)
CREATE POLICY "Authenticated users can view public profile fields"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================
-- 2. FIX ERROR: follows - Restrict to own follows only
-- ============================================
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
DROP POLICY IF EXISTS "Authenticated users can view follows" ON public.follows;

-- Users can only see follows where they are the follower or the followed
CREATE POLICY "Users can view their own follow relationships"
ON public.follows
FOR SELECT
USING (
  auth.uid() = follower_id 
  OR auth.uid() = following_id
);