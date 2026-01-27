-- Add social_links column to profiles (JSONB for flexibility)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

-- Add comment to describe the structure
COMMENT ON COLUMN public.profiles.social_links IS 'Social media links: {website_url, instagram_url, x_url, youtube_url, tiktok_url}';