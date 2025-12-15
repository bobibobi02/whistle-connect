-- Helper function to check if user has snoozed notifications
CREATE OR REPLACE FUNCTION public.is_notifications_snoozed(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.email_preferences
    WHERE user_id = _user_id
      AND snooze_until IS NOT NULL
      AND snooze_until > now()
  )
$$;

-- Update comment notification trigger to check snooze
CREATE OR REPLACE FUNCTION public.create_comment_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
  post_owner_id uuid;
  post_title text;
  commenter_name text;
  parent_comment_owner_id uuid;
  recipient_prefs record;
BEGIN
  SELECT user_id, title INTO post_owner_id, post_title
  FROM public.posts WHERE id = NEW.post_id;

  SELECT COALESCE(display_name, username, 'Someone') INTO commenter_name
  FROM public.profiles WHERE user_id = NEW.user_id;

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
            commenter_name || ' replied to your comment on "' || LEFT(post_title, 40) || CASE WHEN LENGTH(post_title) > 40 THEN '...' ELSE '' END || '"',
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
          commenter_name || ' commented on "' || LEFT(post_title, 40) || CASE WHEN LENGTH(post_title) > 40 THEN '...' ELSE '' END || '"',
          '/post/' || NEW.post_id, NEW.post_id, NEW.id, NEW.user_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Update upvote notification trigger to check snooze
CREATE OR REPLACE FUNCTION public.create_upvote_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
  post_owner_id uuid;
  post_title text;
  voter_name text;
  recipient_prefs record;
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

    INSERT INTO public.notifications (user_id, type, title, message, link, related_post_id, actor_id)
    VALUES (post_owner_id, 'upvote', 'New upvote on your post',
      voter_name || ' upvoted "' || LEFT(post_title, 40) || CASE WHEN LENGTH(post_title) > 40 THEN '...' ELSE '' END || '"',
      '/post/' || NEW.post_id, NEW.post_id, NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Update follow notification trigger to check snooze
CREATE OR REPLACE FUNCTION public.create_follow_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
  follower_name text;
  recipient_prefs record;
BEGIN
  -- Check snooze first
  IF public.is_notifications_snoozed(NEW.following_id) THEN RETURN NEW; END IF;

  SELECT inapp_new_follower INTO recipient_prefs
  FROM public.email_preferences WHERE user_id = NEW.following_id;
  
  IF recipient_prefs.inapp_new_follower IS NOT FALSE THEN
    SELECT COALESCE(display_name, username, 'Someone') INTO follower_name
    FROM public.profiles WHERE user_id = NEW.follower_id;

    INSERT INTO public.notifications (user_id, type, title, message, link, actor_id)
    VALUES (NEW.following_id, 'follow', 'New follower',
      follower_name || ' started following you', '/profile/' || NEW.follower_id, NEW.follower_id);
  END IF;

  RETURN NEW;
END;
$$;