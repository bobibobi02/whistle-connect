-- Create communities table
CREATE TABLE public.communities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  icon text DEFAULT '💬',
  created_by uuid NOT NULL,
  member_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Communities are viewable by everyone"
ON public.communities FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create communities"
ON public.communities FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their communities"
ON public.communities FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their communities"
ON public.communities FOR DELETE
USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_communities_updated_at
BEFORE UPDATE ON public.communities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default communities
INSERT INTO public.communities (name, display_name, description, icon, created_by, member_count)
VALUES 
  ('technology', 'Technology', 'Discuss the latest in tech, gadgets, and innovation', '🖥️', '00000000-0000-0000-0000-000000000000', 2400000),
  ('gaming', 'Gaming', 'Gaming news, reviews, and discussions', '🎮', '00000000-0000-0000-0000-000000000000', 1800000),
  ('movies', 'Movies', 'Film discussions, reviews, and recommendations', '🎬', '00000000-0000-0000-0000-000000000000', 1200000),
  ('music', 'Music', 'Share and discover music from all genres', '🎵', '00000000-0000-0000-0000-000000000000', 980000),
  ('sports', 'Sports', 'Sports news, highlights, and fan discussions', '⚽', '00000000-0000-0000-0000-000000000000', 850000),
  ('food', 'Food', 'Recipes, restaurant reviews, and foodie culture', '🍕', '00000000-0000-0000-0000-000000000000', 720000),
  ('general', 'General', 'General discussions and conversations', '💬', '00000000-0000-0000-0000-000000000000', 500000);