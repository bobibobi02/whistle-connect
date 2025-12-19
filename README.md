# Whistle - Community Social Platform

A community-driven social platform built with React, Vite, and Supabase.

## 🚀 Quick Start (Web)

```bash
npm install
npm run dev
```

## 📱 Mobile Development with Capacitor

This project uses Capacitor for native iOS and Android builds.

### Prerequisites

- **Node.js** 18+ and npm
- **For iOS**: macOS with Xcode 15+ and Command Line Tools
- **For Android**: Android Studio with SDK 33+

### Initial Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd whistle
   npm install
   ```

2. **Add native platforms:**
   ```bash
   npx cap add ios
   npx cap add android
   ```

3. **Update native dependencies:**
   ```bash
   npx cap update
   ```

### Development Workflow

The `capacitor.config.ts` is configured to hot-reload from the Lovable preview URL during development. For local development:

1. **Build and sync:**
   ```bash
   npm run build
   npm run sync
   ```

2. **Open in IDE:**
   ```bash
   npm run open:ios     # Opens Xcode
   npm run open:android # Opens Android Studio
   ```

3. **Run on device/simulator** from Xcode or Android Studio.

### NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run sync` | Sync web build to native platforms |
| `npm run open:ios` | Open iOS project in Xcode |
| `npm run open:android` | Open Android project in Android Studio |

## 🔧 Configuration

### Deep Links

The app supports deep links with the `whistle://` scheme:

- `whistle://post/:id` - Open a specific post
- `whistle://c/:community` - Open a community
- `whistle://u/:username` - Open a user profile
- `whistle://search` - Open search
- `whistle://notifications` - Open notifications

#### iOS Deep Link Setup

1. Open `ios/App/App/Info.plist`
2. Add URL scheme:
   ```xml
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleURLSchemes</key>
       <array>
         <string>whistle</string>
       </array>
     </dict>
   </array>
   ```

3. For Universal Links, add Associated Domains in Xcode:
   - `applinks:yourdomain.com`

#### Android Deep Link Setup

1. Open `android/app/src/main/AndroidManifest.xml`
2. Add intent filter inside `<activity>`:
   ```xml
   <intent-filter>
     <action android:name="android.intent.action.VIEW" />
     <category android:name="android.intent.category.DEFAULT" />
     <category android:name="android.intent.category.BROWSABLE" />
     <data android:scheme="whistle" />
   </intent-filter>
   ```

### Splash Screen Setup

The app uses a branded splash screen with the Whistle pink (#ff5c8d) background.

#### iOS Splash Screen

1. Copy `public/splash.png` to `ios/App/App/Assets.xcassets/Splash.imageset/`
2. Update the `Contents.json` in that folder to reference your image
3. In Xcode, configure the LaunchScreen.storyboard to use the image

#### Android Splash Screen

1. Copy `public/splash.png` to these locations:
   - `android/app/src/main/res/drawable/splash.png`
   - `android/app/src/main/res/drawable-land/splash.png` (landscape)

2. Create `android/app/src/main/res/values/styles.xml` if not exists:
   ```xml
   <resources>
     <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
       <item name="android:background">@drawable/splash</item>
     </style>
   </resources>
   ```

### Push Notifications (Firebase Cloud Messaging)

The app supports native push notifications via Firebase Cloud Messaging (FCM) on iOS and Android, and Web Push for browsers.

#### Firebase Setup

1. **Create a Firebase project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use an existing one
   - Add iOS and Android apps to your project

2. **iOS Setup:**
   - Download `GoogleService-Info.plist` from Firebase Console
   - Add it to `ios/App/App/` directory
   - Enable Push Notifications capability in Xcode
   - Upload your APNs key or certificate to Firebase Console

3. **Android Setup:**
   - Download `google-services.json` from Firebase Console
   - Add it to `android/app/` directory
   - The Capacitor plugin handles the rest automatically

4. **Configure Backend:**
   - Get your FCM Server Key from Firebase Console → Project Settings → Cloud Messaging
   - Add `FCM_SERVER_KEY` to your backend secrets (Lovable Cloud)

5. **Web Push (Optional):**
   - Generate VAPID keys in Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
   - Add `VITE_FIREBASE_VAPID_KEY` to your environment variables

#### Required Capacitor Plugins

After `npx cap sync`, the push notification plugins will be configured automatically.

### Environment Variables

**Important**: Never commit secrets to the repository.

#### For Web/Development

Create a `.env.local` file (gitignored):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

#### For Native Builds

Environment variables are embedded at build time. For production builds:

1. **iOS**: Set variables in Xcode scheme environment or use a build script
2. **Android**: Use `gradle.properties` or build variants

For CI/CD, use your platform's secrets management (GitHub Secrets, etc.).

## 📦 Release Builds

### iOS Release

1. **Configure signing in Xcode:**
   - Open `ios/App/App.xcworkspace`
   - Select your team and signing certificates
   - Configure provisioning profiles

2. **Build for release:**
   ```bash
   npm run build
   npm run sync
   ```
   Then in Xcode: Product → Archive

3. **Submit to App Store:**
   - Use Xcode Organizer or Transporter app

### Android Release

1. **Generate signing key:**
   ```bash
   keytool -genkey -v -keystore whistle-release.keystore -alias whistle -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure signing in `android/app/build.gradle`:**
   ```gradle
   android {
     signingConfigs {
       release {
         storeFile file('whistle-release.keystore')
         storePassword System.getenv('KEYSTORE_PASSWORD')
         keyAlias 'whistle'
         keyPassword System.getenv('KEY_PASSWORD')
       }
     }
     buildTypes {
       release {
         signingConfig signingConfigs.release
       }
     }
   }
   ```

3. **Build APK/AAB:**
   ```bash
   npm run build
   npm run sync
   cd android
   ./gradlew assembleRelease  # APK
   ./gradlew bundleRelease    # AAB for Play Store
   ```

## 🔒 Security Notes

- Never commit `.env` files with real secrets
- Use environment variables for all sensitive configuration
- The `.env` file in the repo is auto-generated by Lovable Cloud
- For native builds, use secure storage for runtime secrets

## 📁 Project Structure

```
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── lib/            # Utilities and helpers
│   └── integrations/   # Supabase client and types
├── public/
│   ├── icons/          # PWA icons
│   └── manifest.json   # PWA manifest
├── supabase/
│   ├── functions/      # Edge functions
│   └── migrations/     # Database migrations
├── capacitor.config.ts # Capacitor configuration
└── index.html          # HTML entry point
```

## 🌐 PWA Support

The app includes PWA support for web installation:

- Manifest configured in `public/manifest.json`
- Icons in `public/icons/`
- Theme color matches the app design

Users can install from Chrome/Safari via "Add to Home Screen".

### Generating PWA Icons

Create app icons in the following sizes and place in `public/icons/`:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

You can use tools like:
- [PWA Asset Generator](https://github.com/nicubarbaros/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

## 🛠 Troubleshooting

### iOS Build Issues

- **Pod install fails**: Run `cd ios/App && pod install --repo-update`
- **Signing errors**: Ensure valid Apple Developer account and certificates

### Android Build Issues

- **SDK not found**: Set `ANDROID_HOME` environment variable
- **Gradle errors**: Try `cd android && ./gradlew clean`

### Auth Issues on Mobile

- If login loops occur, check that Capacitor Preferences is properly syncing
- Ensure the redirect URL includes your app scheme

---

## Original Lovable Documentation

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

### How can I edit this code?

**Use Lovable**: Visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

**Use your preferred IDE**: Clone this repo and push changes. The only requirement is having Node.js & npm installed.

### Technologies

- Vite, TypeScript, React, shadcn-ui, Tailwind CSS

### Deploy

Open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click Share → Publish.

### Custom Domain

Navigate to Project > Settings > Domains and click Connect Domain.

## 📄 License

MIT
