-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Service role can manage push notification queue" ON public.push_notification_queue;

-- Create a new policy that only allows service role access
CREATE POLICY "Service role can manage push notification queue"
ON public.push_notification_queue
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');