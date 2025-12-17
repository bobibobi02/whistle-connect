-- PHASE 1: Community Roles, Rules, Flair, Moderation

-- 1) Community roles enum and table
CREATE TYPE public.community_role AS ENUM ('owner', 'moderator', 'member', 'banned', 'muted');

CREATE TABLE public.community_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role community_role NOT NULL DEFAULT 'member',
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id, role)
);

CREATE INDEX idx_community_roles_community ON public.community_roles(community_id);
CREATE INDEX idx_community_roles_user ON public.community_roles(user_id);
CREATE INDEX idx_community_roles_role ON public.community_roles(role);

ALTER TABLE public.community_roles ENABLE ROW LEVEL SECURITY;

-- Function to check community role
CREATE OR REPLACE FUNCTION public.has_community_role(_community_id uuid, _user_id uuid, _role community_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_roles
    WHERE community_id = _community_id
      AND user_id = _user_id
      AND role = _role
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Function to check if user is community mod (owner or moderator)
CREATE OR REPLACE FUNCTION public.is_community_mod(_community_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_roles
    WHERE community_id = _community_id
      AND user_id = _user_id
      AND role IN ('owner', 'moderator')
      AND (expires_at IS NULL OR expires_at > now())
  )
  OR EXISTS (
    SELECT 1
    FROM public.communities
    WHERE id = _community_id
      AND created_by = _user_id
  )
$$;

-- RLS for community_roles
CREATE POLICY "Anyone can view community roles"
ON public.community_roles FOR SELECT
USING (true);

CREATE POLICY "Community mods can manage roles"
ON public.community_roles FOR INSERT
WITH CHECK (
  public.is_community_mod(community_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Community mods can update roles"
ON public.community_roles FOR UPDATE
USING (
  public.is_community_mod(community_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Community mods can delete roles"
ON public.community_roles FOR DELETE
USING (
  public.is_community_mod(community_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 2) Community rules table
CREATE TABLE public.community_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  rule_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, rule_number)
);

CREATE INDEX idx_community_rules_community ON public.community_rules(community_id);

ALTER TABLE public.community_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view community rules"
ON public.community_rules FOR SELECT
USING (true);

CREATE POLICY "Community mods can create rules"
ON public.community_rules FOR INSERT
WITH CHECK (
  public.is_community_mod(community_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Community mods can update rules"
ON public.community_rules FOR UPDATE
USING (
  public.is_community_mod(community_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Community mods can delete rules"
ON public.community_rules FOR DELETE
USING (
  public.is_community_mod(community_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 3) Flair system
CREATE TABLE public.community_flairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#FF5C7A',
  background_color TEXT DEFAULT '#1E1A18',
  is_mod_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, name)
);

CREATE INDEX idx_community_flairs_community ON public.community_flairs(community_id);

ALTER TABLE public.community_flairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view flairs"
ON public.community_flairs FOR SELECT
USING (true);

CREATE POLICY "Community mods can manage flairs"
ON public.community_flairs FOR INSERT
WITH CHECK (
  public.is_community_mod(community_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Community mods can update flairs"
ON public.community_flairs FOR UPDATE
USING (
  public.is_community_mod(community_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Community mods can delete flairs"
ON public.community_flairs FOR DELETE
USING (
  public.is_community_mod(community_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- User flair per community
CREATE TABLE public.community_user_flairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  flair_text TEXT,
  flair_color TEXT DEFAULT '#34D399',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

CREATE INDEX idx_community_user_flairs_community ON public.community_user_flairs(community_id);
CREATE INDEX idx_community_user_flairs_user ON public.community_user_flairs(user_id);

ALTER TABLE public.community_user_flairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user flairs"
ON public.community_user_flairs FOR SELECT
USING (true);

CREATE POLICY "Users can set their own flair"
ON public.community_user_flairs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flair"
ON public.community_user_flairs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flair"
ON public.community_user_flairs FOR DELETE
USING (auth.uid() = user_id);

-- 4) Add moderation fields to posts
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS flair_id UUID REFERENCES public.community_flairs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_position INTEGER,
  ADD COLUMN IF NOT EXISTS is_removed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS removed_by UUID,
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removal_reason TEXT;

CREATE INDEX idx_posts_flair ON public.posts(flair_id);
CREATE INDEX idx_posts_pinned ON public.posts(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_posts_removed ON public.posts(is_removed);

-- 5) Add moderation fields to comments
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS is_distinguished BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_removed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS removed_by UUID,
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removal_reason TEXT;

CREATE INDEX idx_comments_removed ON public.comments(is_removed);

-- 6) Add community settings
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS require_post_flair BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_user_flair BOOLEAN DEFAULT true;

-- 7) Community mod log table
CREATE TABLE public.community_mod_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  mod_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_mod_log_community ON public.community_mod_log(community_id);
CREATE INDEX idx_community_mod_log_mod ON public.community_mod_log(mod_id);
CREATE INDEX idx_community_mod_log_created ON public.community_mod_log(created_at DESC);

ALTER TABLE public.community_mod_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community mods can view mod log"
ON public.community_mod_log FOR SELECT
USING (
  public.is_community_mod(community_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Community mods can create log entries"
ON public.community_mod_log FOR INSERT
WITH CHECK (
  public.is_community_mod(community_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 8) Auto-assign owner role when community is created
CREATE OR REPLACE FUNCTION public.assign_community_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_roles (community_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_community_created
  AFTER INSERT ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_community_owner();

-- 9) Update existing communities to have owner roles
INSERT INTO public.community_roles (community_id, user_id, role)
SELECT id, created_by, 'owner'
FROM public.communities
ON CONFLICT (community_id, user_id, role) DO NOTHING;