import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { router } from 'expo-router';
import { Post } from '@/hooks/usePosts';
import { useToggleBookmark } from '@/hooks/useBookmarks';
import { useVotes } from '@/hooks/useVotes';
import { useAuth } from '@/hooks/useAuth';
import { useShare } from '@/hooks/useShare';
import { ReportModal } from './ReportModal';
import { theme } from '@/theme';

interface PostCardProps {
  post: Post;
  onPress: () => void;
  onAuthorPress?: (userId: string) => void;
}

export function PostCard({ post, onPress, onAuthorPress }: PostCardProps) {
  const toggleBookmark = useToggleBookmark();
  const { voteOnPost } = useVotes();
  const { user } = useAuth();
  const { sharePost } = useShare();
  const [showReportModal, setShowReportModal] = useState(false);

  const handleBookmarkPress = () => {
    toggleBookmark.mutate({ postId: post.id, isBookmarked: post.is_bookmarked ?? false });
  };

  const handleSharePress = () => {
    sharePost(post.id, post.title);
  };

  const handleAuthorPress = () => {
    if (onAuthorPress) {
      onAuthorPress(post.user_id);
    } else {
      router.push(`/user/${post.user_id}`);
    }
  };

  const handleCommunityPress = () => {
    router.push(`/community/${post.community}`);
  };

  const handleVote = (voteType: 1 | -1) => {
    if (!user) return;
    const newVote = post.user_vote === voteType ? 0 : voteType;
    voteOnPost.mutate({ postId: post.id, voteType: newVote as 1 | -1 | 0 });
  };

  const handleReportPress = () => {
    setShowReportModal(true);
  };

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCommunityPress}>
            <Text style={styles.community}>w/{post.community}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAuthorPress}>
            <Text style={styles.meta}>
              <Text style={styles.author}>u/{post.author_username}</Text> •{' '}
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>

        {post.content && (
          <Text style={styles.content} numberOfLines={3}>
            {post.content}
          </Text>
        )}

        {post.image_url && (
          <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" />
        )}

        {post.video_url && (
          <View style={styles.videoThumbnail}>
            {post.poster_image_url ? (
              <Image source={{ uri: post.poster_image_url }} style={styles.videoImage} />
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons name="videocam" size={32} color={theme.colors.textMuted} />
              </View>
            )}
            <View style={styles.playIcon}>
              <Ionicons name="play" size={24} color={theme.colors.text} />
            </View>
            {post.video_duration_seconds && (
              <View style={styles.duration}>
                <Text style={styles.durationText}>
                  {Math.floor(post.video_duration_seconds / 60)}:
                  {(post.video_duration_seconds % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            )}
          </View>
        )}

        {post.is_nsfw && (
          <View style={styles.nsfwBadge}>
            <Text style={styles.nsfwText}>NSFW</Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.voteContainer}>
            <TouchableOpacity
              onPress={() => handleVote(1)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={post.user_vote === 1 ? 'arrow-up' : 'arrow-up-outline'}
                size={20}
                color={post.user_vote === 1 ? theme.colors.upvote : theme.colors.textSecondary}
              />
            </TouchableOpacity>
            <Text style={styles.voteCount}>{post.upvotes}</Text>
            <TouchableOpacity
              onPress={() => handleVote(-1)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={post.user_vote === -1 ? 'arrow-down' : 'arrow-down-outline'}
                size={20}
                color={post.user_vote === -1 ? theme.colors.downvote : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.actionContainer}>
            <View style={styles.commentCount}>
              <Ionicons name="chatbubble-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.countText}>{post.comment_count}</Text>
            </View>

            <TouchableOpacity onPress={handleSharePress} style={styles.actionButton}>
              <Ionicons name="share-outline" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleBookmarkPress} style={styles.actionButton}>
              <Ionicons
                name={post.is_bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={post.is_bookmarked ? theme.colors.primary : theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {user && user.id !== post.user_id && (
              <TouchableOpacity onPress={handleReportPress} style={styles.actionButton}>
                <Ionicons name="flag-outline" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="post"
        postId={post.id}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  header: {
    marginBottom: theme.spacing.sm,
  },
  community: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  meta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  author: {
    color: theme.colors.textSecondary,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  content: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 22,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  videoThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  duration: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  durationText: {
    fontSize: theme.fontSize.xs,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  nsfwBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  nsfwText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  voteCount: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  countText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  actionButton: {
    padding: theme.spacing.xs,
  },
});
