
-- Create function to notify post authors of upvotes
CREATE OR REPLACE FUNCTION public.create_upvote_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id uuid;
  post_title text;
  voter_name text;
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for upvote notifications
CREATE TRIGGER on_post_upvote
AFTER INSERT ON public.post_votes
FOR EACH ROW
EXECUTE FUNCTION public.create_upvote_notification();
