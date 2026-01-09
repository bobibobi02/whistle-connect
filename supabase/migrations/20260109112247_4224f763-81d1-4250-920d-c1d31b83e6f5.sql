-- Fix WARN level RLS issues for public data exposure

-- 1. Fix follows table - require authentication to view follows
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;

CREATE POLICY "Authenticated users can view follows"
ON public.follows
FOR SELECT
USING (auth.role() = 'authenticated');

-- 2. Fix community_members table - require authentication to view memberships  
DROP POLICY IF EXISTS "Memberships are viewable by everyone" ON public.community_members;

CREATE POLICY "Authenticated users can view memberships"
ON public.community_members
FOR SELECT
USING (auth.role() = 'authenticated');