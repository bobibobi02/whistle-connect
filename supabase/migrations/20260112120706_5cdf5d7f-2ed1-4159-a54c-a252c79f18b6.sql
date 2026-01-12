-- ============================================
-- Fix: Recreate public_profiles view with SECURITY INVOKER
-- This ensures the view uses the querying user's permissions, not the creator's
-- ============================================

-- Drop the existing view
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate with explicit SECURITY INVOKER (default, but being explicit)
CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
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

-- Re-grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;