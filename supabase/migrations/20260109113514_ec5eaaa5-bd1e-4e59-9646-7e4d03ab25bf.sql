-- Complete remaining storage policies (thumbnails)

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own thumbnails with type validation" ON storage.objects;

-- Recreate videos delete policy
CREATE POLICY "Users can delete their own videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'post-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own thumbnails
CREATE POLICY "Users can update their own thumbnails with type validation"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'post-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'post-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp'))
);

-- Users can delete their own thumbnails
CREATE POLICY "Users can delete their own thumbnails"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'post-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
);