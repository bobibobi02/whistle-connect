-- Create function to send push notification via edge function
CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supabase_url text;
BEGIN
  -- Get Supabase URL from environment (set during function creation)
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- Call the edge function via pg_net extension if available
  -- For now, we'll rely on the application layer to call the edge function
  -- This function serves as a placeholder that can be enhanced with pg_net
  
  -- Log the notification attempt for debugging
  RAISE NOTICE 'Push notification queued for user %: % - %', p_user_id, p_title, p_body;
END;
$$;

-- Create trigger function for comment notifications with push
CREATE OR REPLACE FUNCTION public.trigger_push_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_owner_id uuid;
  v_post_title text;
  v_commenter_name text;
  v_parent_owner_id uuid;
  v_recipient_prefs record;
BEGIN
  -- Get post info
  SELECT user_id, title INTO v_post_owner_id, v_post_title
  FROM public.posts WHERE id = NEW.post_id;

  -- Get commenter name
  SELECT COALESCE(display_name, username, 'Someone') INTO v_commenter_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  -- Handle reply to comment
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_owner_id
    FROM public.comments WHERE id = NEW.parent_id;

    IF v_parent_owner_id IS NOT NULL AND v_parent_owner_id != NEW.user_id THEN
      -- Check if notifications are snoozed
      IF NOT public.is_notifications_snoozed(v_parent_owner_id) THEN
        -- Insert push notification record for processing
        INSERT INTO public.push_notification_queue (user_id, title, body, data)
        VALUES (
          v_parent_owner_id,
          'New reply to your comment',
          v_commenter_name || ' replied: "' || LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END || '"',
          jsonb_build_object('type', 'reply', 'post_id', NEW.post_id, 'comment_id', NEW.id)
        );
      END IF;
    END IF;
  END IF;

  -- Notify post owner (if different from commenter and parent comment owner)
  IF v_post_owner_id != NEW.user_id AND (v_parent_owner_id IS NULL OR v_post_owner_id != v_parent_owner_id) THEN
    IF NOT public.is_notifications_snoozed(v_post_owner_id) THEN
      INSERT INTO public.push_notification_queue (user_id, title, body, data)
      VALUES (
        v_post_owner_id,
        'New comment on your post',
        v_commenter_name || ' commented on "' || LEFT(v_post_title, 30) || CASE WHEN LENGTH(v_post_title) > 30 THEN '...' ELSE '' END || '"',
        jsonb_build_object('type', 'comment', 'post_id', NEW.post_id, 'comment_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger function for upvote notifications with push
CREATE OR REPLACE FUNCTION public.trigger_push_on_upvote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_owner_id uuid;
  v_post_title text;
  v_voter_name text;
BEGIN
  -- Only notify for upvotes (vote_type = 1)
  IF NEW.vote_type != 1 THEN RETURN NEW; END IF;

  -- Get post info
  SELECT user_id, title INTO v_post_owner_id, v_post_title
  FROM public.posts WHERE id = NEW.post_id;

  -- Don't notify for self-votes
  IF v_post_owner_id = NEW.user_id THEN RETURN NEW; END IF;

  -- Check if notifications are snoozed
  IF public.is_notifications_snoozed(v_post_owner_id) THEN RETURN NEW; END IF;

  -- Get voter name
  SELECT COALESCE(display_name, username, 'Someone') INTO v_voter_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  -- Queue push notification
  INSERT INTO public.push_notification_queue (user_id, title, body, data)
  VALUES (
    v_post_owner_id,
    'Your post got an upvote! 🎉',
    v_voter_name || ' upvoted "' || LEFT(v_post_title, 40) || CASE WHEN LENGTH(v_post_title) > 40 THEN '...' ELSE '' END || '"',
    jsonb_build_object('type', 'upvote', 'post_id', NEW.post_id)
  );

  RETURN NEW;
END;
$$;

-- Create trigger function for follow notifications with push
CREATE OR REPLACE FUNCTION public.trigger_push_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_follower_name text;
BEGIN
  -- Check if notifications are snoozed
  IF public.is_notifications_snoozed(NEW.following_id) THEN RETURN NEW; END IF;

  -- Get follower name
  SELECT COALESCE(display_name, username, 'Someone') INTO v_follower_name
  FROM public.profiles WHERE user_id = NEW.follower_id;

  -- Queue push notification
  INSERT INTO public.push_notification_queue (user_id, title, body, data)
  VALUES (
    NEW.following_id,
    'New follower! 👋',
    v_follower_name || ' started following you',
    jsonb_build_object('type', 'follow', 'follower_id', NEW.follower_id)
  );

  RETURN NEW;
END;
$$;

-- Create push notification queue table
CREATE TABLE public.push_notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.push_notification_queue ENABLE ROW LEVEL SECURITY;

-- Only system can manage push queue
CREATE POLICY "System can manage push queue"
ON public.push_notification_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for processing pending notifications
CREATE INDEX idx_push_queue_pending ON public.push_notification_queue(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_push_queue_user ON public.push_notification_queue(user_id);

-- Create triggers
DROP TRIGGER IF EXISTS trigger_push_comment ON public.comments;
CREATE TRIGGER trigger_push_comment
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_on_comment();

DROP TRIGGER IF EXISTS trigger_push_upvote ON public.post_votes;
CREATE TRIGGER trigger_push_upvote
AFTER INSERT ON public.post_votes
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_on_upvote();

DROP TRIGGER IF EXISTS trigger_push_follow ON public.follows;
CREATE TRIGGER trigger_push_follow
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_on_follow();