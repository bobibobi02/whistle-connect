-- Update comment notification trigger to check preferences
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
  -- Get the post owner and title
  SELECT user_id, title INTO post_owner_id, post_title
  FROM public.posts
  WHERE id = NEW.post_id;

  -- Get commenter's display name
  SELECT COALESCE(display_name, username, 'Someone') INTO commenter_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- If this is a reply to another comment, notify the parent comment owner
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_comment_owner_id
    FROM public.comments
    WHERE id = NEW.parent_id;

    -- Check if recipient has in-app comment notifications enabled
    IF parent_comment_owner_id IS NOT NULL AND parent_comment_owner_id != NEW.user_id THEN
      SELECT inapp_comment INTO recipient_prefs
      FROM public.email_preferences
      WHERE user_id = parent_comment_owner_id;
      
      -- Only create notification if preference is enabled (default true if no record)
      IF recipient_prefs.inapp_comment IS NOT FALSE THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, related_post_id, related_comment_id, actor_id)
        VALUES (
          parent_comment_owner_id,
          'reply',
          'New reply to your comment',
          commenter_name || ' replied to your comment on "' || LEFT(post_title, 40) || CASE WHEN LENGTH(post_title) > 40 THEN '...' ELSE '' END || '"',
          '/post/' || NEW.post_id,
          NEW.post_id,
          NEW.id,
          NEW.user_id
        );
      END IF;
    END IF;
  END IF;

  -- Notify post owner (only if not the commenter and not already notified as parent comment owner)
  IF post_owner_id != NEW.user_id AND (parent_comment_owner_id IS NULL OR post_owner_id != parent_comment_owner_id) THEN
    -- Check if recipient has in-app comment notifications enabled
    SELECT inapp_comment INTO recipient_prefs
    FROM public.email_preferences
    WHERE user_id = post_owner_id;
    
    -- Only create notification if preference is enabled (default true if no record)
    IF recipient_prefs.inapp_comment IS NOT FALSE THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, related_post_id, related_comment_id, actor_id)
      VALUES (
        post_owner_id,
        'comment',
        'New comment on your post',
        commenter_name || ' commented on "' || LEFT(post_title, 40) || CASE WHEN LENGTH(post_title) > 40 THEN '...' ELSE '' END || '"',
        '/post/' || NEW.post_id,
        NEW.post_id,
        NEW.id,
        NEW.user_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Update upvote notification trigger to check preferences
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
  -- Only notify on upvotes (vote_type = 1), not downvotes
  IF NEW.vote_type != 1 THEN
    RETURN NEW;
  END IF;

  -- Get the post owner and title
  SELECT user_id, title INTO post_owner_id, post_title
  FROM public.posts
  WHERE id = NEW.post_id;

  -- Don't notify if user upvotes their own post
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check if recipient has in-app upvote notifications enabled
  SELECT inapp_post_upvote INTO recipient_prefs
  FROM public.email_preferences
  WHERE user_id = post_owner_id;
  
  -- Only create notification if preference is enabled (default true if no record)
  IF recipient_prefs.inapp_post_upvote IS NOT FALSE THEN
    -- Get voter's display name
    SELECT COALESCE(display_name, username, 'Someone') INTO voter_name
    FROM public.profiles
    WHERE user_id = NEW.user_id;

    -- Create the notification
    INSERT INTO public.notifications (user_id, type, title, message, link, related_post_id, actor_id)
    VALUES (
      post_owner_id,
      'upvote',
      'New upvote on your post',
      voter_name || ' upvoted "' || LEFT(post_title, 40) || CASE WHEN LENGTH(post_title) > 40 THEN '...' ELSE '' END || '"',
      '/post/' || NEW.post_id,
      NEW.post_id,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Update follow notification trigger to check preferences
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
  -- Check if recipient has in-app follower notifications enabled
  SELECT inapp_new_follower INTO recipient_prefs
  FROM public.email_preferences
  WHERE user_id = NEW.following_id;
  
  -- Only create notification if preference is enabled (default true if no record)
  IF recipient_prefs.inapp_new_follower IS NOT FALSE THEN
    -- Get follower's display name
    SELECT COALESCE(display_name, username, 'Someone') INTO follower_name
    FROM public.profiles
    WHERE user_id = NEW.follower_id;

    -- Create the notification
    INSERT INTO public.notifications (user_id, type, title, message, link, actor_id)
    VALUES (
      NEW.following_id,
      'follow',
      'New follower',
      follower_name || ' started following you',
      '/profile/' || NEW.follower_id,
      NEW.follower_id
    );
  END IF;

  RETURN NEW;
END;
$$;