import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Community, useJoinCommunity, useLeaveCommunity } from '@/hooks/useCommunities';

interface CommunityCardProps {
  community: Community;
  isJoined: boolean;
  onPress: () => void;
}

export function CommunityCard({ community, isJoined, onPress }: CommunityCardProps) {
  const joinCommunity = useJoinCommunity();
  const leaveCommunity = useLeaveCommunity();

  const handleToggleMembership = (e: any) => {
    e.stopPropagation?.();
    if (isJoined) {
      leaveCommunity.mutate(community.id);
    } else {
      joinCommunity.mutate(community.id);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.icon}>{community.icon}</Text>
      
      <View style={styles.info}>
        <Text style={styles.name}>r/{community.name}</Text>
        <Text style={styles.members}>
          {community.member_count?.toLocaleString() ?? 0} members
        </Text>
        {community.description && (
          <Text style={styles.description} numberOfLines={2}>
            {community.description}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.joinButton, isJoined && styles.leaveButton]}
        onPress={handleToggleMembership}
        disabled={joinCommunity.isPending || leaveCommunity.isPending}
      >
        <Text style={[styles.joinButtonText, isJoined && styles.leaveButtonText]}>
          {isJoined ? 'Joined' : 'Join'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  icon: {
    fontSize: 40,
    marginRight: theme.spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  members: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  leaveButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  joinButtonText: {
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
    fontSize: theme.fontSize.sm,
  },
  leaveButtonText: {
    color: theme.colors.textSecondary,
  },
});
