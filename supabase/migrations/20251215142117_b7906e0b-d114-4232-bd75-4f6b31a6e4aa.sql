
-- Create email preferences table
CREATE TABLE public.email_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email_new_follower boolean NOT NULL DEFAULT true,
  email_post_upvote boolean NOT NULL DEFAULT false,
  email_comment boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own preferences" 
ON public.email_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.email_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
ON public.email_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_email_preferences_updated_at
BEFORE UPDATE ON public.email_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create email queue table for processing
CREATE TABLE public.email_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email_type text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

-- Enable RLS (only system can access)
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Only allow inserts from triggers (no user access)
CREATE POLICY "System can insert emails" 
ON public.email_queue 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can select emails" 
ON public.email_queue 
FOR SELECT 
USING (true);

CREATE POLICY "System can update emails" 
ON public.email_queue 
FOR UPDATE 
USING (true);
