-- Add policy to allow anyone to view succeeded boosts (for displaying boost amounts above comments)
CREATE POLICY "Anyone can view succeeded boosts"
ON public.post_boosts
FOR SELECT
USING (status = 'succeeded');