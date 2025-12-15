-- Add in-app notification preference columns to email_preferences table
ALTER TABLE public.email_preferences
ADD COLUMN IF NOT EXISTS inapp_new_follower boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS inapp_post_upvote boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS inapp_comment boolean NOT NULL DEFAULT true;