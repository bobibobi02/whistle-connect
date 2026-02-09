
-- Drop the overly permissive policy
DROP POLICY "Anyone can create anonymous submissions" ON public.anonymous_submissions;

-- Re-create with a tighter WITH CHECK that ensures submitters cannot set admin-only fields
CREATE POLICY "Anyone can create anonymous submissions"
ON public.anonymous_submissions
FOR INSERT
WITH CHECK (
  reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND status = 'pending'
  AND notes IS NULL
);
