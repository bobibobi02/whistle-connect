-- Fix overly permissive INSERT policies that use WITH CHECK (true)

-- 1. Fix notifications table - only service role should create notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Service role can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- 2. Fix moderation_logs table - only service role should insert moderation logs
DROP POLICY IF EXISTS "System can insert moderation logs" ON public.moderation_logs;

CREATE POLICY "Service role can insert moderation logs"
ON public.moderation_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');