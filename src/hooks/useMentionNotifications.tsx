import { supabase } from "@/integrations/supabase/client";
import { extractMentions } from "@/components/MentionText";

/**
 * Create mention notifications for users mentioned in content.
 * - Skips self-mentions
 * - Deduplicates mentions
 * - Respects blocked users (won't notify if blocked relationship exists)
 */
export const createMentionNotifications = async ({
  content,
  authorId,
  authorUsername,
  postId,
  commentId,
  contentType,
}: {
  content: string;
  authorId: string;
  authorUsername: string | null;
  postId: string;
  commentId?: string;
  contentType: "post" | "comment";
}) => {
  const mentionedUsernames = extractMentions(content);
  
  if (mentionedUsernames.length === 0) return;

  // Get the user IDs for mentioned usernames
  const { data: mentionedUsers } = await supabase
    .from("profiles")
    .select("user_id, username")
    .in("username", mentionedUsernames);

  if (!mentionedUsers || mentionedUsers.length === 0) return;

  // Get blocked relationships (both directions)
  const mentionedUserIds = mentionedUsers.map((u) => u.user_id);
  
  const [blockedByAuthor, blockedAuthor] = await Promise.all([
    supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", authorId)
      .in("blocked_id", mentionedUserIds),
    supabase
      .from("blocked_users")
      .select("blocker_id")
      .eq("blocked_id", authorId)
      .in("blocker_id", mentionedUserIds),
  ]);

  const blockedIds = new Set<string>([
    ...(blockedByAuthor.data?.map((b) => b.blocked_id) || []),
    ...(blockedAuthor.data?.map((b) => b.blocker_id) || []),
  ]);

  // Filter out self-mentions and blocked users
  const usersToNotify = mentionedUsers.filter(
    (u) => u.user_id !== authorId && !blockedIds.has(u.user_id)
  );

  if (usersToNotify.length === 0) return;

  // Create notifications
  const notifications = usersToNotify.map((user) => ({
    user_id: user.user_id,
    type: "mention",
    title: `${authorUsername || "Someone"} mentioned you`,
    message: `You were mentioned in a ${contentType}`,
    link: `/post/${postId}${commentId ? `#comment-${commentId}` : ""}`,
    related_post_id: postId,
    related_comment_id: commentId || null,
    actor_id: authorId,
  }));

  await supabase.from("notifications").insert(notifications);
};
