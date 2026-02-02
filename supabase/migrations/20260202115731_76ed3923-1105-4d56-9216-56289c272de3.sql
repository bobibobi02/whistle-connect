-- Fix security issue: recreate view with security_invoker=on
DROP VIEW IF EXISTS public.top_issues;

CREATE VIEW public.top_issues
WITH (security_invoker=on) AS
SELECT 
  t.id,
  t.subject,
  t.category,
  t.description,
  t.status,
  t.priority,
  t.severity,
  t.duplicate_count,
  t.created_at,
  t.updated_at,
  t.email,
  t.user_id,
  t.route,
  (
    CASE t.severity 
      WHEN 'critical' THEN 100 
      WHEN 'high' THEN 75 
      WHEN 'medium' THEN 50 
      WHEN 'low' THEN 25 
      ELSE 50 
    END
    + COALESCE(t.duplicate_count, 0) * 10
    + (100 - LEAST(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 86400, 30) * 3.33)::integer
  ) AS triage_score
FROM public.support_tickets t
WHERE t.status IN ('open', 'in_progress')
  AND t.duplicate_of IS NULL
ORDER BY triage_score DESC
LIMIT 20;