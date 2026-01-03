-- =============================================
-- Feature: NSFW Content Controls
-- =============================================

-- Add NSFW flag to posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN DEFAULT false;

-- Add NSFW preferences to profiles  
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS allow_nsfw BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS nsfw_confirmed_at TIMESTAMPTZ;

-- Add processing_status to posts for video processing tracking
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS video_processing_status TEXT DEFAULT 'ready' CHECK (video_processing_status IN ('pending', 'processing', 'ready', 'failed'));

-- =============================================
-- Feature: For You Feed - Event Tracking
-- =============================================

-- Create feed events table for tracking user engagement
CREATE TABLE IF NOT EXISTS public.feed_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'impression', 'view_start', 'view_complete', 'watch_time',
    'like', 'comment', 'share', 'save', 'follow_creator',
    'not_interested', 'report', 'skip'
  )),
  watch_time_ms INTEGER,
  video_duration_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_feed_events_user_id ON public.feed_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_events_post_id ON public.feed_events(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_events_created_at ON public.feed_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_events_event_type ON public.feed_events(event_type);
CREATE INDEX IF NOT EXISTS idx_feed_events_user_event ON public.feed_events(user_id, event_type, created_at DESC);

-- Create user feed profile for personalization
CREATE TABLE IF NOT EXISTS public.user_feed_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  avg_watch_time_ms REAL DEFAULT 0,
  completion_rate REAL DEFAULT 0,
  short_video_preference REAL DEFAULT 0.33,
  mid_video_preference REAL DEFAULT 0.34,
  long_video_preference REAL DEFAULT 0.33,
  top_communities JSONB DEFAULT '[]'::jsonb,
  top_creators JSONB DEFAULT '[]'::jsonb,
  last_computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_feed_profiles_user_id ON public.user_feed_profiles(user_id);

-- Enable RLS on new tables
ALTER TABLE public.feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feed_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for feed_events
CREATE POLICY "Users can insert their own feed events"
ON public.feed_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feed events"
ON public.feed_events
FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for user_feed_profiles
CREATE POLICY "Users can view their own feed profile"
ON public.user_feed_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feed profile"
ON public.user_feed_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feed profile"
ON public.user_feed_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_feed_profiles_updated_at
BEFORE UPDATE ON public.user_feed_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index on posts for NSFW filtering
CREATE INDEX IF NOT EXISTS idx_posts_is_nsfw ON public.posts(is_nsfw);

-- Create index on posts for video content filtering (for For You feed)
CREATE INDEX IF NOT EXISTS idx_posts_video_url ON public.posts(video_url) WHERE video_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_created_video ON public.posts(created_at DESC) WHERE video_url IS NOT NULL;

-- Enable realtime for feed_events (for analytics)
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_events;