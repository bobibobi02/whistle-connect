-- Create function to check if user owns the post
CREATE OR REPLACE FUNCTION public.is_post_owner(_post_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts
    WHERE id = _post_id AND user_id = _user_id
  )
$$;

-- Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view boost totals" ON public.post_boosts;

-- Users can view their own boosts
CREATE POLICY "Users can view their own boosts"
ON public.post_boosts
FOR SELECT
USING (auth.uid() = from_user_id);

-- Post owners can view all boosts on their posts
CREATE POLICY "Post owners can view boosts on their posts"
ON public.post_boosts
FOR SELECT
USING (public.is_post_owner(post_id, auth.uid()));

-- Anyone can view public succeeded boosts (for supporter messages feature)
CREATE POLICY "Anyone can view public succeeded boosts"
ON public.post_boosts
FOR SELECT
USING (is_public = true AND status = 'succeeded');