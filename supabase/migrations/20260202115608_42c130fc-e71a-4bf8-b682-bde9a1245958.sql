-- Add indexes for frequently queried columns to improve performance
-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_community ON public.posts(community);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_upvotes ON public.posts(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_draft ON public.posts(is_draft) WHERE is_draft = true;
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON public.posts(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Comments indexes  
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- Votes indexes
CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON public.post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON public.post_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON public.comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_id ON public.comment_votes(user_id);

-- Follows indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Support tickets indexes for admin triage
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_karma ON public.profiles(karma DESC);

-- Communities indexes
CREATE INDEX IF NOT EXISTS idx_communities_name ON public.communities(name);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON public.community_members(community_id);

-- Bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON public.bookmarks(post_id);

-- Add a duplicate_of column to support_tickets for tracking duplicates in triage
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES public.support_tickets(id),
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS duplicate_count INTEGER DEFAULT 0;

-- Create a view for top issues by severity and recency for admin triage
CREATE OR REPLACE VIEW public.top_issues AS
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
  -- Calculate a score based on severity, duplicate count, and recency
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

-- Grant access to the view
GRANT SELECT ON public.top_issues TO authenticated;