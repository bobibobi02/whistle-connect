-- Drop the existing view and recreate with security_invoker=on
DROP VIEW IF EXISTS public.public_profiles;

-- Create view with security_invoker=on so it inherits RLS from profiles table
CREATE VIEW public.public_profiles
WITH (security_invoker=on) AS
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

-- Add a policy to allow authenticated users to view all profiles (for social features)
-- This replaces the old "Users can view their own profile" with a broader authenticated-only policy
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- Drop the old restrictive policy since we want authenticated users to see each other's profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;