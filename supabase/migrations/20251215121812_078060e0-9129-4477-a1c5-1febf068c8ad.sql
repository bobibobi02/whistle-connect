-- Create community_members table
CREATE TABLE public.community_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Memberships are viewable by everyone"
ON public.community_members FOR SELECT
USING (true);

CREATE POLICY "Users can join communities"
ON public.community_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities"
ON public.community_members FOR DELETE
USING (auth.uid() = user_id);

-- Function to update member count on join
CREATE OR REPLACE FUNCTION public.increment_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.communities
  SET member_count = COALESCE(member_count, 0) + 1
  WHERE id = NEW.community_id;
  RETURN NEW;
END;
$$;

-- Function to update member count on leave
CREATE OR REPLACE FUNCTION public.decrement_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.communities
  SET member_count = GREATEST(COALESCE(member_count, 0) - 1, 0)
  WHERE id = OLD.community_id;
  RETURN OLD;
END;
$$;

-- Triggers for member count
CREATE TRIGGER on_member_join
AFTER INSERT ON public.community_members
FOR EACH ROW
EXECUTE FUNCTION public.increment_member_count();

CREATE TRIGGER on_member_leave
AFTER DELETE ON public.community_members
FOR EACH ROW
EXECUTE FUNCTION public.decrement_member_count();