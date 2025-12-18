-- Add sanitization function for safe display text (removes HTML tags and encodes special chars)
CREATE OR REPLACE FUNCTION public.sanitize_for_display(text_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF text_input IS NULL THEN
    RETURN NULL;
  END IF;
  -- Remove HTML tags and encode special characters
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(text_input, '<[^>]*>', '', 'g'),  -- Remove HTML tags
        '&', '&amp;', 'g'
      ),
      '<', '&lt;', 'g'
    ),
    '>', '&gt;', 'g'
  );
END;
$$;

-- Update create_comment_notification to sanitize user data
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  post_owner_id uuid;
  post_title text;
  commenter_name text;
  parent_comment_owner_id uuid;
  recipient_prefs record;
  safe_commenter_name text;
  safe_post_title text;
BEGIN
  SELECT user_id, title INTO post_owner_id, post_title
  FROM public.posts WHERE id = NEW.post_id;

  SELECT COALESCE(display_name, username, 'Someone') INTO commenter_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  -- Sanitize user-controlled data
  safe_commenter_name := public.sanitize_for_display(commenter_name);
  safe_post_title := public.sanitize_for_display(LEFT(post_title, 40));

  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_comment_owner_id
    FROM public.comments WHERE id = NEW.parent_id;

    IF parent_comment_owner_id IS NOT NULL AND parent_comment_owner_id != NEW.user_id THEN
      -- Check snooze and preferences
      IF NOT public.is_notifications_snoozed(parent_comment_owner_id) THEN
        SELECT inapp_comment INTO recipient_prefs
        FROM public.email_preferences WHERE user_id = parent_comment_owner_id;
        
        IF recipient_prefs.inapp_comment IS NOT FALSE THEN
          INSERT INTO public.notifications (user_id, type, title, message, link, related_post_id, related_comment_id, actor_id)
          VALUES (parent_comment_owner_id, 'reply', 'New reply to your comment',
            safe_commenter_name || ' replied to your comment on "' || safe_post_title || CASE WHEN LENGTH(post_title) > 40 THEN '...' ELSE '' END || '"',
            '/post/' || NEW.post_id, NEW.post_id, NEW.id, NEW.user_id);
        END IF;
      END IF;
    END IF;
  END IF;

  IF post_owner_id != NEW.user_id AND (parent_comment_owner_id IS NULL OR post_owner_id != parent_comment_owner_id) THEN
    IF NOT public.is_notifications_snoozed(post_owner_id) THEN
      SELECT inapp_comment INTO recipient_prefs
      FROM public.email_preferences WHERE user_id = post_owner_id;
      
      IF recipient_prefs.inapp_comment IS NOT FALSE THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, related_post_id, related_comment_id, actor_id)
        VALUES (post_owner_id, 'comment', 'New comment on your post',
          safe_commenter_name || ' commented on "' || safe_post_title || CASE WHEN LENGTH(post_title) > 40 THEN '...' ELSE '' END || '"',
          '/post/' || NEW.post_id, NEW.post_id, NEW.id, NEW.user_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Update create_upvote_notification to sanitize user data
CREATE OR REPLACE FUNCTION public.create_upvote_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  post_owner_id uuid;
  post_title text;
  voter_name text;
  recipient_prefs record;
  safe_voter_name text;
  safe_post_title text;
BEGIN
  IF NEW.vote_type != 1 THEN RETURN NEW; END IF;

  SELECT user_id, title INTO post_owner_id, post_title
  FROM public.posts WHERE id = NEW.post_id;

  IF post_owner_id = NEW.user_id THEN RETURN NEW; END IF;

  -- Check snooze first
  IF public.is_notifications_snoozed(post_owner_id) THEN RETURN NEW; END IF;

  SELECT inapp_post_upvote INTO recipient_prefs
  FROM public.email_preferences WHERE user_id = post_owner_id;
  
  IF recipient_prefs.inapp_post_upvote IS NOT FALSE THEN
    SELECT COALESCE(display_name, username, 'Someone') INTO voter_name
    FROM public.profiles WHERE user_id = NEW.user_id;

    -- Sanitize user-controlled data
    safe_voter_name := public.sanitize_for_display(voter_name);
    safe_post_title := public.sanitize_for_display(LEFT(post_title, 40));

    INSERT INTO public.notifications (user_id, type, title, message, link, related_post_id, actor_id)
    VALUES (post_owner_id, 'upvote', 'New upvote on your post',
      safe_voter_name || ' upvoted "' || safe_post_title || CASE WHEN LENGTH(post_title) > 40 THEN '...' ELSE '' END || '"',
      '/post/' || NEW.post_id, NEW.post_id, NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Update create_follow_notification to sanitize user data
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  follower_name text;
  recipient_prefs record;
  safe_follower_name text;
BEGIN
  -- Check snooze first
  IF public.is_notifications_snoozed(NEW.following_id) THEN RETURN NEW; END IF;

  SELECT inapp_new_follower INTO recipient_prefs
  FROM public.email_preferences WHERE user_id = NEW.following_id;
  
  IF recipient_prefs.inapp_new_follower IS NOT FALSE THEN
    SELECT COALESCE(display_name, username, 'Someone') INTO follower_name
    FROM public.profiles WHERE user_id = NEW.follower_id;

    -- Sanitize user-controlled data
    safe_follower_name := public.sanitize_for_display(follower_name);

    INSERT INTO public.notifications (user_id, type, title, message, link, actor_id)
    VALUES (NEW.following_id, 'follow', 'New follower',
      safe_follower_name || ' started following you', '/profile/' || NEW.follower_id, NEW.follower_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Update push notification triggers to also sanitize data
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
  v_safe_commenter_name text;
  v_safe_post_title text;
  v_safe_content text;
BEGIN
  -- Get post info
  SELECT user_id, title INTO v_post_owner_id, v_post_title
  FROM public.posts WHERE id = NEW.post_id;

  -- Get commenter name
  SELECT COALESCE(display_name, username, 'Someone') INTO v_commenter_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  -- Sanitize user-controlled data
  v_safe_commenter_name := public.sanitize_for_display(v_commenter_name);
  v_safe_post_title := public.sanitize_for_display(LEFT(v_post_title, 30));
  v_safe_content := public.sanitize_for_display(LEFT(NEW.content, 50));

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
          v_safe_commenter_name || ' replied: "' || v_safe_content || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END || '"',
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
        v_safe_commenter_name || ' commented on "' || v_safe_post_title || CASE WHEN LENGTH(v_post_title) > 30 THEN '...' ELSE '' END || '"',
        jsonb_build_object('type', 'comment', 'post_id', NEW.post_id, 'comment_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

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
  v_safe_voter_name text;
  v_safe_post_title text;
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

  -- Sanitize user-controlled data
  v_safe_voter_name := public.sanitize_for_display(v_voter_name);
  v_safe_post_title := public.sanitize_for_display(LEFT(v_post_title, 40));

  -- Queue push notification
  INSERT INTO public.push_notification_queue (user_id, title, body, data)
  VALUES (
    v_post_owner_id,
    'Your post got an upvote! 🎉',
    v_safe_voter_name || ' upvoted "' || v_safe_post_title || CASE WHEN LENGTH(v_post_title) > 40 THEN '...' ELSE '' END || '"',
    jsonb_build_object('type', 'upvote', 'post_id', NEW.post_id)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_push_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_follower_name text;
  v_safe_follower_name text;
BEGIN
  -- Check if notifications are snoozed
  IF public.is_notifications_snoozed(NEW.following_id) THEN RETURN NEW; END IF;

  -- Get follower name
  SELECT COALESCE(display_name, username, 'Someone') INTO v_follower_name
  FROM public.profiles WHERE user_id = NEW.follower_id;

  -- Sanitize user-controlled data
  v_safe_follower_name := public.sanitize_for_display(v_follower_name);

  -- Queue push notification
  INSERT INTO public.push_notification_queue (user_id, title, body, data)
  VALUES (
    NEW.following_id,
    'New follower! 👋',
    v_safe_follower_name || ' started following you',
    jsonb_build_object('type', 'follow', 'follower_id', NEW.follower_id)
  );

  RETURN NEW;
END;
$$;