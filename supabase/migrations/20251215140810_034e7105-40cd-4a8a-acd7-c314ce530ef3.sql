
-- Create function to notify users when they get followed
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
  follower_name text;
BEGIN
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for follow notifications
CREATE TRIGGER on_new_follow
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.create_follow_notification();
