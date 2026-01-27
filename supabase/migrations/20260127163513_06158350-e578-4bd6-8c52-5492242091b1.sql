-- Allow authenticated users to insert notifications (for mentions)
-- The actor_id must match the current user (you can only create notifications as yourself)
CREATE POLICY "Authenticated users can create notifications as actor"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);