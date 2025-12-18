# Whistle Mobile App - Expo Reference

This is a complete React Native + Expo codebase for the Whistle mobile app, designed to connect to your existing Supabase backend.

## Quick Start

```bash
# Create new Expo app
npx create-expo-app whistle-mobile --template expo-template-blank-typescript

# Navigate to project
cd whistle-mobile

# Copy all files from this reference into your project

# Install dependencies
npm install @supabase/supabase-js @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs @tanstack/react-query expo-secure-store expo-image-picker expo-notifications expo-device react-native-safe-area-context react-native-screens react-native-gesture-handler

# Start development
npx expo start
```

## Environment Setup

Create a `.env` file:

```
EXPO_PUBLIC_SUPABASE_URL=https://fzgtckfxntalxrwanhdn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Z3Rja2Z4bnRhbHhyd2FuaGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODY0OTcsImV4cCI6MjA4MTM2MjQ5N30.nZA8tdYlA2MOkhD78Zn_yx8F8CqG8sL-I9MjVqcGCxc
```

## Project Structure

```
whistle-mobile/
├── app.json                 # Expo config
├── eas.json                 # EAS Build config
├── App.tsx                  # Entry point
├── src/
│   ├── config/
│   │   └── supabase.ts      # Supabase client
│   ├── theme/
│   │   └── index.ts         # Colors & spacing
│   ├── navigation/
│   │   ├── index.tsx        # Root navigator
│   │   ├── TabNavigator.tsx # Bottom tabs
│   │   └── types.ts         # Navigation types
│   ├── hooks/
│   │   ├── useAuth.tsx      # Auth context
│   │   ├── usePosts.ts      # Posts data
│   │   ├── useComments.ts   # Comments data
│   │   ├── useCommunities.ts
│   │   ├── useVotes.ts
│   │   ├── useBookmarks.ts
│   │   ├── useNotifications.ts
│   │   └── usePushNotifications.ts
│   ├── screens/
│   │   ├── Auth/
│   │   ├── Home/
│   │   ├── PostDetail/
│   │   ├── CreatePost/
│   │   ├── Communities/
│   │   ├── Community/
│   │   ├── Search/
│   │   ├── Notifications/
│   │   ├── Profile/
│   │   ├── Settings/
│   │   └── Moderation/
│   └── components/
│       ├── PostCard.tsx
│       ├── CommentItem.tsx
│       ├── VoteControls.tsx
│       ├── CommunityCard.tsx
│       └── ...
```

## EAS Build Commands

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS (requires Apple Developer account)
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Features Implemented

✅ Authentication (login/signup with Supabase)
✅ Home feed with sorting (best/hot/new)
✅ Post detail with comments
✅ Nested comment replies
✅ Upvote/downvote on posts & comments
✅ Communities list & detail
✅ Join/leave communities
✅ Create post with image upload
✅ Search posts & communities
✅ Bookmarks/saved posts
✅ Notifications center
✅ Push notifications (iOS/Android)
✅ User profile & settings
✅ Moderation screens (for mods/admins)
✅ Dark theme matching web app

## Not in v1 Mobile

- Real-time updates (planned for v2)
- Video/embed posts
- Polls
- Rich text editor
- Cross-posting
