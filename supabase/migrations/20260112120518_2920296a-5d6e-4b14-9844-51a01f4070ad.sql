-- ============================================
-- Fix: Restrict sensitive profile fields from public access
-- Users can see their own complete profile
-- Other users can only see public fields (no NSFW prefs, verification details)
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view public profile fields" ON public.profiles;

-- Create a more restrictive policy that uses column-level security via a function
-- Users can see their own full profile OR other users' non-sensitive fields

-- Create a security definer function to fetch public profile data
CREATE OR REPLACE FUNCTION public.get_public_profile(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz,
  karma integer,
  is_verified boolean
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at,
    p.karma,
    p.is_verified
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

-- Create a view for public profile data (excludes sensitive fields)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  created_at,
  karma,
  is_verified
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- The existing "Users can view their own profile" policy already allows full access to own profile
-- We just need to ensure other users can only access via the public_profiles view or function

-- Create a new policy that allows viewing other profiles but only returns non-sensitive data
-- This is achieved by keeping the SELECT policy restrictive (own profile only)
-- and using the public_profiles view for viewing other users