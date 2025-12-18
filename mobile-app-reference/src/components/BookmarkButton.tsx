import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { useIsBookmarked, useToggleBookmark } from '@/hooks/useBookmarks';

interface BookmarkButtonProps {
  postId: string;
}

export function BookmarkButton({ postId }: BookmarkButtonProps) {
  const { data: isBookmarked } = useIsBookmarked(postId);
  const toggleBookmark = useToggleBookmark();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => toggleBookmark.mutate(postId)}
      disabled={toggleBookmark.isPending}
    >
      <Text style={[styles.icon, isBookmarked && styles.bookmarked]}>
        {isBookmarked ? '🔖' : '🏷️'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: theme.spacing.xs,
  },
  icon: {
    fontSize: 18,
    opacity: 0.7,
  },
  bookmarked: {
    opacity: 1,
  },
});
