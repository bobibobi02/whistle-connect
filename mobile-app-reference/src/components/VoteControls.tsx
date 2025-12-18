import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { usePostVote, useCommentVote } from '@/hooks/useVotes';

interface VoteControlsProps {
  itemId: string;
  itemType: 'post' | 'comment';
  upvotes: number;
  userVote?: number | null;
  postId?: string; // Required for comment votes
  compact?: boolean;
}

export function VoteControls({
  itemId,
  itemType,
  upvotes,
  userVote,
  postId,
  compact = false,
}: VoteControlsProps) {
  const postVote = usePostVote();
  const commentVote = useCommentVote();

  const handleVote = (voteType: 1 | -1) => {
    if (itemType === 'post') {
      postVote.mutate({ postId: itemId, voteType });
    } else if (postId) {
      commentVote.mutate({ commentId: itemId, postId, voteType });
    }
  };

  const isUpvoted = userVote === 1;
  const isDownvoted = userVote === -1;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <TouchableOpacity
        style={[styles.voteButton, compact && styles.voteButtonCompact]}
        onPress={() => handleVote(1)}
      >
        <Text style={[styles.voteIcon, isUpvoted && styles.upvoted]}>
          {isUpvoted ? '▲' : '△'}
        </Text>
      </TouchableOpacity>

      <Text
        style={[
          styles.voteCount,
          compact && styles.voteCountCompact,
          isUpvoted && styles.upvotedText,
          isDownvoted && styles.downvotedText,
        ]}
      >
        {upvotes}
      </Text>

      <TouchableOpacity
        style={[styles.voteButton, compact && styles.voteButtonCompact]}
        onPress={() => handleVote(-1)}
      >
        <Text style={[styles.voteIcon, isDownvoted && styles.downvoted]}>
          {isDownvoted ? '▼' : '▽'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  containerCompact: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  voteButton: {
    padding: theme.spacing.sm,
  },
  voteButtonCompact: {
    padding: theme.spacing.xs,
  },
  voteIcon: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  upvoted: {
    color: theme.colors.upvote,
  },
  downvoted: {
    color: theme.colors.downvote,
  },
  voteCount: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
  voteCountCompact: {
    fontSize: theme.fontSize.sm,
    minWidth: 24,
  },
  upvotedText: {
    color: theme.colors.upvote,
  },
  downvotedText: {
    color: theme.colors.downvote,
  },
});
