import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { router } from 'expo-router';
import { Post } from '@/hooks/usePosts';
import { useToggleBookmark } from '@/hooks/useBookmarks';
import { useVotes } from '@/hooks/useVotes';
import { useAuth } from '@/hooks/useAuth';
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

  const handleBookmarkPress = () => {
    toggleBookmark.mutate({ postId: post.id, isBookmarked: post.is_bookmarked ?? false });
  };

  const handleAuthorPress = () => {
    if (onAuthorPress) {
      onAuthorPress(post.user_id);
    } else {
      router.push(`/user/${post.user_id}`);
    }
  };

  const handleVote = (voteType: 1 | -1) => {
    if (!user) return;
    const newVote = post.user_vote === voteType ? 0 : voteType;
    voteOnPost.mutate({ postId: post.id, voteType: newVote as 1 | -1 | 0 });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.community}>w/{post.community}</Text>
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

        <View style={styles.commentContainer}>
          <Ionicons name="chatbubble-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.commentCount}>{post.comment_count}</Text>
        </View>

        <TouchableOpacity 
          style={styles.bookmarkButton} 
          onPress={handleBookmarkPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name={post.is_bookmarked ? 'bookmark' : 'bookmark-outline'} 
            size={18} 
            color={post.is_bookmarked ? theme.colors.primary : theme.colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    marginBottom: theme.spacing.sm,
  },
  community: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  meta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  author: {
    color: theme.colors.textSecondary,
  },
  bookmarkButton: {
    marginLeft: 'auto',
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 24,
  },
  content: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  videoThumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  duration: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  durationText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
    fontWeight: '500',
  },
  nsfwBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  nsfwText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  voteCount: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    minWidth: 20,
    textAlign: 'center',
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  commentCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});
