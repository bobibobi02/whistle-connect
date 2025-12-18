-- Fix overly permissive RLS policies on email_queue table
DROP POLICY IF EXISTS "System can insert emails" ON public.email_queue;
DROP POLICY IF EXISTS "System can select emails" ON public.email_queue;
DROP POLICY IF EXISTS "System can update emails" ON public.email_queue;

-- Only allow service role (edge functions) to manage email queue
-- Regular authenticated users cannot access the email queue
CREATE POLICY "Service role can manage email queue"
ON public.email_queue FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Fix overly permissive RLS policies on push_notification_queue table
DROP POLICY IF EXISTS "System can manage push queue" ON public.push_notification_queue;

-- Only allow service role (edge functions) to manage push queue
CREATE POLICY "Service role can manage push notification queue"
ON public.push_notification_queue FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');