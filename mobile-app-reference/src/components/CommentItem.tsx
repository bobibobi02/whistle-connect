import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { theme } from '@/theme';
import { Comment } from '@/hooks/useComments';
import { VoteControls } from './VoteControls';

interface CommentItemProps {
  comment: Comment;
  postId: string;
  onReply: (commentId: string) => void;
  depth?: number;
}

const MAX_DEPTH = 5;

export function CommentItem({ comment, postId, onReply, depth = 0 }: CommentItemProps) {
  const [collapsed, setCollapsed] = useState(false);

  const hasReplies = comment.replies && comment.replies.length > 0;
  const shouldIndent = depth < MAX_DEPTH;

  return (
    <View style={[styles.container, shouldIndent && depth > 0 && styles.indented]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setCollapsed(!collapsed)}
        activeOpacity={0.7}
      >
        <View style={styles.authorRow}>
          <Text style={styles.author}>u/{comment.author?.username || 'unknown'}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.time}>
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </Text>
          {comment.is_distinguished && (
            <>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.modBadge}>MOD</Text>
            </>
          )}
        </View>
        {collapsed && (
          <Text style={styles.collapsedIndicator}>[+]</Text>
        )}
      </TouchableOpacity>

      {!collapsed && (
        <>
          <Text style={styles.content}>{comment.content}</Text>

          <View style={styles.actions}>
            <VoteControls
              itemId={comment.id}
              itemType="comment"
              upvotes={comment.upvotes}
              userVote={comment.user_vote}
              postId={postId}
              compact
            />
            <TouchableOpacity
              style={styles.replyButton}
              onPress={() => onReply(comment.id)}
            >
              <Text style={styles.replyText}>Reply</Text>
            </TouchableOpacity>
          </View>

          {/* Render replies */}
          {hasReplies && (
            <View style={styles.replies}>
              {comment.replies!.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  onReply={onReply}
                  depth={depth + 1}
                />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border,
    paddingLeft: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  indented: {
    marginLeft: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  author: {
    color: theme.colors.link,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  dot: {
    color: theme.colors.textMuted,
    marginHorizontal: theme.spacing.xs,
  },
  time: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
  },
  modBadge: {
    color: theme.colors.success,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  collapsedIndicator: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  content: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  replyButton: {
    padding: theme.spacing.xs,
  },
  replyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  replies: {
    marginTop: theme.spacing.md,
  },
});
