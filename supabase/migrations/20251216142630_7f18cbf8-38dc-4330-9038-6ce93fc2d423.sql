-- Allow moderators/admins to delete posts
CREATE POLICY "Moderators can delete posts"
ON public.posts
FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Allow moderators/admins to delete comments
CREATE POLICY "Moderators can delete comments"
ON public.comments
FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));