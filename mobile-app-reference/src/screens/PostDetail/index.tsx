import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { theme } from '@/theme';
import { usePost } from '@/hooks/usePosts';
import { useComments, useCreateComment } from '@/hooks/useComments';
import { VoteControls } from '@/components/VoteControls';
import { CommentItem } from '@/components/CommentItem';
import { BookmarkButton } from '@/components/BookmarkButton';
import { RootStackParamList } from '@/navigation/types';

type PostDetailRouteProp = RouteProp<RootStackParamList, 'PostDetail'>;

export function PostDetailScreen() {
  const route = useRoute<PostDetailRouteProp>();
  const { postId } = route.params;
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { data: post, isLoading: postLoading } = usePost(postId);
  const { data: comments, isLoading: commentsLoading } = useComments(postId);
  const createComment = useCreateComment();

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    await createComment.mutateAsync({
      postId,
      content: newComment,
      parentId: replyTo ?? undefined,
    });

    setNewComment('');
    setReplyTo(null);
  };

  if (postLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.postContainer}>
          {/* Post Header */}
          <View style={styles.postHeader}>
            <Text style={styles.community}>r/{post.community}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.author}>
              u/{post.author?.username || 'unknown'}
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.time}>
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </Text>
          </View>

          {/* Flair */}
          {post.flair && (
            <View
              style={[
                styles.flair,
                { backgroundColor: post.flair.background_color || theme.colors.flairBackground },
              ]}
            >
              <Text
                style={[styles.flairText, { color: post.flair.color || theme.colors.flairText }]}
              >
                {post.flair.name}
              </Text>
            </View>
          )}

          {/* Title */}
          <Text style={styles.title}>{post.title}</Text>

          {/* Content */}
          {post.content && <Text style={styles.content}>{post.content}</Text>}

          {/* Image */}
          {post.image_url && (
            <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" />
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <VoteControls
              itemId={post.id}
              itemType="post"
              upvotes={post.upvotes}
              userVote={post.user_vote}
            />
            <View style={styles.commentCount}>
              <Text style={styles.commentCountText}>💬 {post.comment_count}</Text>
            </View>
            <BookmarkButton postId={post.id} />
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>

          {commentsLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : comments?.length === 0 ? (
            <Text style={styles.noComments}>No comments yet</Text>
          ) : (
            comments?.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onReply={(commentId) => setReplyTo(commentId)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.commentInput}>
        {replyTo && (
          <View style={styles.replyIndicator}>
            <Text style={styles.replyText}>Replying to comment</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Text style={styles.cancelReply}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || createComment.isPending}
          >
            {createComment.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.text} />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.lg,
  },
  scrollView: {
    flex: 1,
  },
  postContainer: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  community: {
    color: theme.colors.link,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  dot: {
    color: theme.colors.textMuted,
    marginHorizontal: theme.spacing.xs,
  },
  author: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  time: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  flair: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  flairText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  content: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentCountText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  commentsSection: {
    padding: theme.spacing.lg,
  },
  commentsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  noComments: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    padding: theme.spacing.xl,
  },
  commentInput: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  replyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  cancelReply: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
});
