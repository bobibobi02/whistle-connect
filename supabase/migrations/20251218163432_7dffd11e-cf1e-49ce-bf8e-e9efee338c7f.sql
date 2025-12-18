-- Fix RLS policy on post_votes to restrict vote visibility
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.post_votes;

-- Allow users to see only their own votes
CREATE POLICY "Users can view their own votes"
ON public.post_votes FOR SELECT
USING (auth.uid() = user_id);

-- Fix RLS policy on comment_votes to restrict vote visibility
DROP POLICY IF EXISTS "Comment votes are viewable by everyone" ON public.comment_votes;

-- Allow users to see only their own comment votes
CREATE POLICY "Users can view their own comment votes"
ON public.comment_votes FOR SELECT
USING (auth.uid() = user_id);