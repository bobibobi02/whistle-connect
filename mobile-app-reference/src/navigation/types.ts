import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// Root Stack
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  PostDetail: { postId: string; highlightCommentId?: string };
  Community: { communityName: string };
  UserProfile: { userId: string };
  Search: { query?: string };
  Settings: undefined;
  EditProfile: undefined;
  Moderation: { communityId: string };
  ModQueue: undefined;
  AdminSettings: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Communities: undefined;
  CreatePost: { communityName?: string };
  Notifications: undefined;
  Profile: undefined;
};

// Screen props types
export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = 
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
