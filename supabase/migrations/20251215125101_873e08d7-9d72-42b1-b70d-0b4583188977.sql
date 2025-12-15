-- Update the create_comment_notification function to also notify parent comment authors
CREATE OR REPLACE FUNCTION public.create_comment_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  post_owner_id uuid;
  post_title text;
  commenter_name text;
  parent_comment_owner_id uuid;
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

    -- Don't notify if replying to own comment
    IF parent_comment_owner_id IS NOT NULL AND parent_comment_owner_id != NEW.user_id THEN
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

  -- Notify post owner (only if not the commenter and not already notified as parent comment owner)
  IF post_owner_id != NEW.user_id AND (parent_comment_owner_id IS NULL OR post_owner_id != parent_comment_owner_id) THEN
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

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists (recreate to be safe)
DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_comment_notification();