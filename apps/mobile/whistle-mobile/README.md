# Whistle Mobile App

React Native mobile app built with Expo for iOS and Android.

## Quick Start

```bash
cd apps/mobile/whistle-mobile
npm install
npx expo start
```

## Environment Setup

Create a `.env` file in this directory with your project credentials:

```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## EAS Build Commands

### Initial Setup

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login

# Configure EAS for this project
eas build:configure
```

### Development Builds

```bash
# iOS Simulator build
eas build -p ios --profile development

# Android emulator build
eas build -p android --profile development
```

### Preview Builds (Internal Testing)

```bash
# iOS (requires Apple Developer account)
npm run build:ios:preview

# Android APK
npm run build:android:preview
```

### Production Builds

```bash
# iOS production build
npm run build:ios:production

# Android production bundle
npm run build:android:production
```

### App Store Submission

```bash
# Submit to TestFlight/App Store
npm run submit:ios

# Submit to Google Play
npm run submit:android
```

## TestFlight / App Store Steps

### Before First Build

1. **Update `eas.json`** with your Apple credentials:

   ```json
   "submit": {
     "production": {
       "ios": {
         "appleId": "your-apple-id@email.com",
         "ascAppId": "your-app-store-connect-app-id",
         "appleTeamId": "YOUR_TEAM_ID"
       }
     }
   }
   ```

2. **Update `app.json`** EAS project ID:
   - Run `eas init` to get your project ID
   - Or create at expo.dev and add the ID

### Build & Submit to TestFlight

1. Run production build:

   ```bash
   eas build -p ios --profile production
   ```

2. Wait for build to complete (~15-30 min)

3. Submit to App Store Connect:

   ```bash
   eas submit -p ios --latest
   ```

4. In [App Store Connect](https://appstoreconnect.apple.com):
   - Go to your app > TestFlight
   - New build appears under "iOS Builds"
   - Add compliance info if prompted
   - Add test notes
   - Enable external testing or distribute to internal testers

### Google Play Submission

1. Create a service account in Google Cloud Console
2. Download JSON key, save as `google-play-service-account.json`
3. Build and submit:
   ```bash
   eas build -p android --profile production
   eas submit -p android --latest
   ```

## Features

- ✅ Supabase auth with secure token storage
- ✅ Feed with Hot/New/Top sorting + **infinite scroll pagination**
- ✅ **Offline support** - posts cached for offline viewing
- ✅ **Create posts with image & video upload** (camera & library)
- ✅ **Bookmarks/Saved posts** - dedicated tab for saved content
- ✅ Post detail with comments & pull-to-refresh
- ✅ **Optimistic updates** for upvotes/downvotes
- ✅ Full-screen video player with autoplay-next
- ✅ NSFW content toggle (18+ confirmation)
- ✅ **Push notifications** (comments, upvotes, followers)
- ✅ **Real-time notifications** with Supabase subscriptions
- ✅ Dark theme matching web app
- ✅ expo-router file-based navigation
- ✅ Custom app icons and splash screen

## Project Structure

```
apps/mobile/whistle-mobile/
├── app/                    # expo-router screens
│   ├── (auth)/            # Auth screens (login, signup)
│   ├── (tabs)/            # Main tab screens (feed, search, bookmarks, notifications, profile, settings)
│   ├── post/[id].tsx      # Post detail with pull-to-refresh
│   ├── video/[id].tsx     # Full-screen video player
│   └── create-post.tsx    # Create post with image/video upload
├── src/
│   ├── components/        # Reusable components
│   ├── hooks/             # React Query hooks
│   │   ├── useAuth.tsx
│   │   ├── usePosts.ts    # Infinite scroll + offline cache
│   │   ├── useBookmarks.ts # Saved posts
│   │   ├── useVideoUpload.ts
│   │   ├── usePushNotifications.ts
│   │   └── ...
│   ├── lib/               # Supabase client
│   └── theme/             # Theme constants
├── assets/                # App icons & splash screen
├── app.json               # Expo config
├── eas.json               # EAS Build config
└── package.json
```
