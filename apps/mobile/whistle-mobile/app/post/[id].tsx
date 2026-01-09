import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { usePost } from '@/hooks/usePosts';
import { useComments, useCreateComment, Comment } from '@/hooks/useComments';
import { useVotes } from '@/hooks/useVotes';
import { useAuth } from '@/hooks/useAuth';
import { ReportModal } from '@/components/ReportModal';
import { theme } from '@/theme';

function CommentItem({ comment, postId, level = 0 }: { comment: Comment; postId: string; level?: number }) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const createComment = useCreateComment();
  const { voteOnComment } = useVotes();
  const { user } = useAuth();

  const handleReply = async () => {
    if (!replyText.trim()) return;
    await createComment.mutateAsync({
      postId,
      content: replyText,
      parentId: comment.id,
    });
    setReplyText('');
    setShowReplyInput(false);
  };

  const handleVote = (voteType: 1 | -1) => {
    if (!user) return;
    const newVote = comment.user_vote === voteType ? 0 : voteType;
    voteOnComment.mutate({ commentId: comment.id, voteType: newVote as 1 | -1 | 0, postId });
  };

  return (
    <>
      <View style={[styles.commentContainer, { marginLeft: level * 16 }]}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>
            {comment.author_display_name || comment.author_username}
          </Text>
          <Text style={styles.commentTime}>
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </Text>
        </View>
        <Text style={styles.commentContent}>{comment.content}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => handleVote(1)}
          >
            <Ionicons
              name={comment.user_vote === 1 ? 'arrow-up' : 'arrow-up-outline'}
              size={16}
              color={comment.user_vote === 1 ? theme.colors.upvote : theme.colors.textMuted}
            />
          </TouchableOpacity>
          <Text style={styles.voteCount}>{comment.upvotes}</Text>
          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => handleVote(-1)}
          >
            <Ionicons
              name={comment.user_vote === -1 ? 'arrow-down' : 'arrow-down-outline'}
              size={16}
              color={comment.user_vote === -1 ? theme.colors.downvote : theme.colors.textMuted}
            />
          </TouchableOpacity>
          {user && level < 3 && (
            <TouchableOpacity
              style={styles.replyButton}
              onPress={() => setShowReplyInput(!showReplyInput)}
            >
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
          )}
          {user && user.id !== comment.user_id && (
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => setShowReportModal(true)}
            >
              <Ionicons name="flag-outline" size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {showReplyInput && (
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Write a reply..."
              placeholderTextColor={theme.colors.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />
            <TouchableOpacity
              style={styles.replySubmitButton}
              onPress={handleReply}
              disabled={!replyText.trim() || createComment.isPending}
            >
              <Ionicons name="send" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}
        {comment.replies?.map((reply) => (
          <CommentItem key={reply.id} comment={reply} postId={postId} level={level + 1} />
        ))}
      </View>
      
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="comment"
        commentId={comment.id}
      />
    </>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: post, isLoading: postLoading, refetch: refetchPost } = usePost(id);
  const { data: comments, isLoading: commentsLoading, refetch: refetchComments } = useComments(id);
  const createComment = useCreateComment();
  const { voteOnPost } = useVotes();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchPost(), refetchComments()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchPost, refetchComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;
    await createComment.mutateAsync({
      postId: id,
      content: newComment,
    });
    setNewComment('');
  };

  const handleVote = (voteType: 1 | -1) => {
    if (!user || !post) return;
    const newVote = post.user_vote === voteType ? 0 : voteType;
    voteOnPost.mutate({ postId: post.id, voteType: newVote as 1 | -1 | 0 });
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
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Post Header */}
        <View style={styles.postHeader}>
          <Text style={styles.community}>w/{post.community}</Text>
          <Text style={styles.postMeta}>
            Posted by u/{post.author_username} •{' '}
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </Text>
        </View>

        {/* Post Content */}
        <Text style={styles.postTitle}>{post.title}</Text>
        {post.content && <Text style={styles.postContent}>{post.content}</Text>}
        {post.image_url && (
          <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
        )}
        {post.video_url && (
          <TouchableOpacity
            style={styles.videoThumbnail}
            onPress={() => router.push(`/video/${post.id}`)}
          >
            {post.poster_image_url ? (
              <Image source={{ uri: post.poster_image_url }} style={styles.videoThumbnailImage} />
            ) : (
              <View style={styles.videoThumbnailPlaceholder}>
                <Ionicons name="play-circle" size={64} color={theme.colors.text} />
              </View>
            )}
            <View style={styles.playOverlay}>
              <Ionicons name="play" size={32} color={theme.colors.text} />
            </View>
          </TouchableOpacity>
        )}

        {/* Post Actions */}
        <View style={styles.postActions}>
          <TouchableOpacity style={styles.voteButton} onPress={() => handleVote(1)}>
            <Ionicons
              name={post.user_vote === 1 ? 'arrow-up' : 'arrow-up-outline'}
              size={24}
              color={post.user_vote === 1 ? theme.colors.upvote : theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <Text style={styles.postVoteCount}>{post.upvotes}</Text>
          <TouchableOpacity style={styles.voteButton} onPress={() => handleVote(-1)}>
            <Ionicons
              name={post.user_vote === -1 ? 'arrow-down' : 'arrow-down-outline'}
              size={24}
              color={post.user_vote === -1 ? theme.colors.downvote : theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={styles.actionSpacer} />
          <Ionicons name="chatbubble-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.actionCount}>{post.comment_count}</Text>
          {user && user.id !== post.user_id && (
            <TouchableOpacity 
              style={styles.reportPostButton}
              onPress={() => setShowReportModal(true)}
            >
              <Ionicons name="flag-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          {commentsLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : comments?.length === 0 ? (
            <Text style={styles.noCommentsText}>No comments yet</Text>
          ) : (
            comments?.map((comment) => (
              <CommentItem key={comment.id} comment={comment} postId={id} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Comment Input */}
      {user && (
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={theme.colors.textMuted}
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!newComment.trim() || createComment.isPending) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || createComment.isPending}
          >
            <Ionicons
              name="send"
              size={20}
              color={newComment.trim() ? theme.colors.primary : theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      )}

      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="post"
        postId={post.id}
      />
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
    fontSize: theme.fontSize.lg,
    color: theme.colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  postHeader: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  community: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  postMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  postTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  postContent: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 24,
    marginBottom: theme.spacing.md,
  },
  postImage: {
    width: '100%',
    height: 300,
    marginBottom: theme.spacing.md,
  },
  videoThumbnail: {
    width: '100%',
    height: 220,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoThumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  voteButton: {
    padding: theme.spacing.xs,
  },
  postVoteCount: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginHorizontal: theme.spacing.sm,
  },
  actionSpacer: {
    flex: 1,
  },
  actionCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  reportPostButton: {
    marginLeft: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  commentsSection: {
    padding: theme.spacing.lg,
  },
  commentsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  noCommentsText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
  commentContainer: {
    marginBottom: theme.spacing.lg,
    paddingLeft: theme.spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  commentAuthor: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  commentTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  commentContent: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  voteCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginHorizontal: theme.spacing.xs,
  },
  replyButton: {
    marginLeft: theme.spacing.md,
  },
  replyButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  reportButton: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  replyInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    maxHeight: 80,
  },
  replySubmitButton: {
    padding: theme.spacing.sm,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    maxHeight: 100,
  },
  submitButton: {
    padding: theme.spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
});
