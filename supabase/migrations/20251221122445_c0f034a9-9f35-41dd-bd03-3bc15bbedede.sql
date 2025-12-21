-- Add boost_id column to comments to link boost messages as special comments
ALTER TABLE public.comments
ADD COLUMN boost_id uuid REFERENCES public.post_boosts(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX idx_comments_boost_id ON public.comments(boost_id) WHERE boost_id IS NOT NULL;

-- Create unique constraint to prevent duplicate boost comments
CREATE UNIQUE INDEX idx_unique_boost_comment ON public.comments(boost_id) WHERE boost_id IS NOT NULL;