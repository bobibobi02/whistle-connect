
-- =====================================================
-- FEATURE: Direct Messaging
-- =====================================================

-- Conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conversation participants
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- =====================================================
-- FEATURE: Polls
-- =====================================================

CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE,
  allow_multiple BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id)
);

CREATE TABLE public.poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, option_id, user_id)
);

-- =====================================================
-- FEATURE: Bookmark Folders
-- =====================================================

CREATE TABLE public.bookmark_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Add folder_id to bookmarks
ALTER TABLE public.bookmarks ADD COLUMN folder_id UUID REFERENCES public.bookmark_folders(id) ON DELETE SET NULL;

-- =====================================================
-- FEATURE: Karma System
-- =====================================================

-- Add karma column to profiles
ALTER TABLE public.profiles ADD COLUMN karma INTEGER DEFAULT 0;

-- Create karma history for tracking
CREATE TABLE public.karma_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  related_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  related_comment_id UUID REFERENCES public.comments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- FEATURE: Verified Badges
-- =====================================================

ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN verification_type TEXT; -- 'creator', 'official', 'notable'

-- =====================================================
-- FEATURE: Post Scheduling
-- =====================================================

ALTER TABLE public.posts ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.posts ADD COLUMN is_draft BOOLEAN DEFAULT false;

-- =====================================================
-- FEATURE: Edit History
-- =====================================================

ALTER TABLE public.posts ADD COLUMN is_edited BOOLEAN DEFAULT false;
ALTER TABLE public.posts ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.comments ADD COLUMN is_edited BOOLEAN DEFAULT false;
ALTER TABLE public.comments ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;

-- Edit history table
CREATE TABLE public.edit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL, -- 'post' or 'comment'
  content_id UUID NOT NULL,
  previous_content TEXT NOT NULL,
  previous_title TEXT, -- Only for posts
  edited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- FEATURE: Cross-posting
-- =====================================================

ALTER TABLE public.posts ADD COLUMN crosspost_of UUID REFERENCES public.posts(id) ON DELETE SET NULL;

-- =====================================================
-- RLS Policies
-- =====================================================

-- Conversations RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT
  USING (id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()));

CREATE POLICY "Participants can view conversation participants"
  ON public.conversation_participants FOR SELECT
  USING (conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users can join conversations they're invited to"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users can send messages to their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can edit their own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Polls RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view polls"
  ON public.polls FOR SELECT USING (true);

CREATE POLICY "Post authors can create polls"
  ON public.polls FOR INSERT
  WITH CHECK (post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view poll options"
  ON public.poll_options FOR SELECT USING (true);

CREATE POLICY "Poll creators can add options"
  ON public.poll_options FOR INSERT
  WITH CHECK (poll_id IN (SELECT id FROM public.polls WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid())));

CREATE POLICY "Anyone can view votes count"
  ON public.poll_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their vote"
  ON public.poll_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Bookmark folders RLS
ALTER TABLE public.bookmark_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their folders"
  ON public.bookmark_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create folders"
  ON public.bookmark_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their folders"
  ON public.bookmark_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their folders"
  ON public.bookmark_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Karma history RLS
ALTER TABLE public.karma_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their karma history"
  ON public.karma_history FOR SELECT
  USING (auth.uid() = user_id);

-- Edit history RLS
ALTER TABLE public.edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view edit history"
  ON public.edit_history FOR SELECT USING (true);

CREATE POLICY "Users can create edit history entries"
  ON public.edit_history FOR INSERT
  WITH CHECK (auth.uid() = edited_by);

-- =====================================================
-- Functions and Triggers
-- =====================================================

-- Function to update karma when posts/comments are voted
CREATE OR REPLACE FUNCTION public.update_karma_on_vote()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  karma_change INTEGER;
BEGIN
  -- Determine karma change
  IF TG_OP = 'INSERT' THEN
    karma_change := NEW.vote_type;
  ELSIF TG_OP = 'DELETE' THEN
    karma_change := -OLD.vote_type;
  ELSIF TG_OP = 'UPDATE' THEN
    karma_change := NEW.vote_type - OLD.vote_type;
  END IF;

  -- Get the user who owns the content
  IF TG_TABLE_NAME = 'post_votes' THEN
    SELECT user_id INTO target_user_id FROM public.posts WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  ELSE
    SELECT user_id INTO target_user_id FROM public.comments WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);
  END IF;

  -- Don't give karma for self-votes
  IF target_user_id = COALESCE(NEW.user_id, OLD.user_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Update karma
  UPDATE public.profiles
  SET karma = COALESCE(karma, 0) + karma_change
  WHERE user_id = target_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for karma updates
CREATE TRIGGER update_karma_on_post_vote
  AFTER INSERT OR UPDATE OR DELETE ON public.post_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_karma_on_vote();

CREATE TRIGGER update_karma_on_comment_vote
  AFTER INSERT OR UPDATE OR DELETE ON public.comment_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_karma_on_vote();

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- Create index for better performance
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX idx_karma_history_user_id ON public.karma_history(user_id);
CREATE INDEX idx_posts_scheduled_at ON public.posts(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_posts_is_draft ON public.posts(is_draft) WHERE is_draft = true;
