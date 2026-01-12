-- Enable RLS on the public_profiles view
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Note: Views with security_invoker = true inherit RLS from the underlying table (profiles)
-- The profiles table already has RLS enabled with appropriate policies
-- This ensures the view respects the same access controls as the base table