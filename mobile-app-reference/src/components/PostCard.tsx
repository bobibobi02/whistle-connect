import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { theme } from '@/theme';
import { Post } from '@/hooks/usePosts';
import { VoteControls } from './VoteControls';

interface PostCardProps {
  post: Post;
  onPress: () => void;
  showCommunity?: boolean;
}

export function PostCard({ post, onPress, showCommunity = true }: PostCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        {showCommunity && (
          <>
            <Text style={styles.communityIcon}>{post.community_icon}</Text>
            <Text style={styles.community}>r/{post.community}</Text>
            <Text style={styles.dot}>•</Text>
          </>
        )}
        <Text style={styles.author}>u/{post.author?.username || 'unknown'}</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.time}>
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </Text>
      </View>

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

      <Text style={styles.title} numberOfLines={3}>
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

      <View style={styles.footer}>
        <VoteControls
          itemId={post.id}
          itemType="post"
          upvotes={post.upvotes}
          userVote={post.user_vote}
          compact
        />
        <View style={styles.commentCount}>
          <Text style={styles.commentCountText}>💬 {post.comment_count ?? 0}</Text>
        </View>
      </View>

      {(post.is_pinned || post.is_locked || post.is_removed) && (
        <View style={styles.badges}>
          {post.is_pinned && <Text style={styles.badge}>📌</Text>}
          {post.is_locked && <Text style={styles.badge}>🔒</Text>}
          {post.is_removed && <Text style={[styles.badge, styles.removedBadge]}>Removed</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.sm,
  },
  communityIcon: {
    fontSize: 16,
    marginRight: 4,
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
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  flairText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  content: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  footer: {
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
  badges: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  badge: {
    fontSize: theme.fontSize.sm,
  },
  removedBadge: {
    color: theme.colors.error,
    fontWeight: theme.fontWeight.semibold,
  },
});
