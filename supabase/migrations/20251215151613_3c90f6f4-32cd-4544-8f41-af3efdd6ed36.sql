-- Add snooze_until column to email_preferences table
ALTER TABLE public.email_preferences
ADD COLUMN IF NOT EXISTS snooze_until timestamp with time zone DEFAULT NULL;