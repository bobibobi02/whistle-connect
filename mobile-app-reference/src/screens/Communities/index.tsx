import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/theme';
import { useCommunities, useUserJoinedCommunities } from '@/hooks/useCommunities';
import { CommunityCard } from '@/components/CommunityCard';
import { RootStackParamList } from '@/navigation/types';

export function CommunitiesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: allCommunities, isLoading: loadingAll } = useCommunities();
  const { data: joinedCommunities, isLoading: loadingJoined } = useUserJoinedCommunities();

  if (loadingAll || loadingJoined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={allCommunities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CommunityCard
            community={item}
            isJoined={joinedCommunities?.some((c) => c.id === item.id) ?? false}
            onPress={() => navigation.navigate('Community', { communityName: item.name })}
          />
        )}
        ListHeaderComponent={
          joinedCommunities && joinedCommunities.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Communities</Text>
              {joinedCommunities.map((community) => (
                <TouchableOpacity
                  key={community.id}
                  style={styles.joinedItem}
                  onPress={() => navigation.navigate('Community', { communityName: community.name })}
                >
                  <Text style={styles.joinedIcon}>{community.icon}</Text>
                  <View style={styles.joinedInfo}>
                    <Text style={styles.joinedName}>r/{community.name}</Text>
                    <Text style={styles.joinedMembers}>
                      {community.member_count?.toLocaleString() ?? 0} members
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              <Text style={[styles.sectionTitle, { marginTop: theme.spacing.xl }]}>
                Discover Communities
              </Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Discover Communities</Text>
            </View>
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No communities yet</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
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
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  joinedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  joinedIcon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  joinedInfo: {
    flex: 1,
  },
  joinedName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  joinedMembers: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  emptyContainer: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
  },
});
