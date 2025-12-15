-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'comment',
  title text NOT NULL,
  message text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  related_post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  related_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  actor_id uuid
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Function to create notification on new comment
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id uuid;
  post_title text;
  commenter_name text;
BEGIN
  -- Get the post owner and title
  SELECT user_id, title INTO post_owner_id, post_title
  FROM public.posts
  WHERE id = NEW.post_id;

  -- Don't notify if commenting on own post
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get commenter's display name
  SELECT COALESCE(display_name, username, 'Someone') INTO commenter_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, message, link, related_post_id, related_comment_id, actor_id)
  VALUES (
    post_owner_id,
    'comment',
    'New comment on your post',
    commenter_name || ' commented on "' || LEFT(post_title, 50) || CASE WHEN LENGTH(post_title) > 50 THEN '...' ELSE '' END || '"',
    '/post/' || NEW.post_id,
    NEW.post_id,
    NEW.id,
    NEW.user_id
  );

  RETURN NEW;
END;
$$;

-- Trigger for new comments
CREATE TRIGGER on_new_comment_notification
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.create_comment_notification();