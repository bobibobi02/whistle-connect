-- Create moderation logs table to track AI moderation results
CREATE TABLE public.moderation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL, -- 'post' or 'comment'
  content_text TEXT NOT NULL,
  user_id UUID NOT NULL,
  allowed BOOLEAN NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view logs (you may want to restrict to admins later)
CREATE POLICY "Authenticated users can view moderation logs"
ON public.moderation_logs
FOR SELECT
TO authenticated
USING (true);

-- Policy: System can insert logs
CREATE POLICY "System can insert moderation logs"
ON public.moderation_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_moderation_logs_created_at ON public.moderation_logs(created_at DESC);
CREATE INDEX idx_moderation_logs_allowed ON public.moderation_logs(allowed);