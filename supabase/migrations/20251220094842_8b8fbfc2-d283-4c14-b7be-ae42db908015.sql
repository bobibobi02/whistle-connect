-- Add video support fields to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_mime_type TEXT,
ADD COLUMN IF NOT EXISTS video_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS video_duration_seconds REAL,
ADD COLUMN IF NOT EXISTS poster_image_url TEXT;

-- Create post-videos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-videos', 'post-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create post-thumbnails bucket for video posters
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-thumbnails', 'post-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload videos
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-videos');

-- Allow public read access to videos
CREATE POLICY "Public can view videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'post-videos');

-- Allow users to delete their own videos
CREATE POLICY "Users can delete their own videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'post-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to upload thumbnails
CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-thumbnails');

-- Allow public read access to thumbnails
CREATE POLICY "Public can view thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'post-thumbnails');

-- Allow users to delete their own thumbnails
CREATE POLICY "Users can delete their own thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'post-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create index for posts with videos for faster filtering
CREATE INDEX IF NOT EXISTS idx_posts_video_url ON public.posts (video_url) WHERE video_url IS NOT NULL;