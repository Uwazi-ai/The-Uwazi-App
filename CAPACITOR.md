# UWAZI Native Mobile App Setup

This project is configured with Capacitor to build native iOS and Android apps from your web app.

## Prerequisites

### For iOS (macOS required)
- macOS 11.0 or later
- Xcode 14.0 or later (install from Mac App Store)
- An Apple Developer account ($99/year) to publish to App Store

### For Android
- Android Studio (latest version)
- Android SDK
- A Google Play Developer account ($25 one-time fee) to publish to Play Store

## Setup Steps

### 1. Export to GitHub
First, export this project to your own GitHub repository using the **"Export to GitHub"** button in Lovable.

### 2. Clone and Install
```bash
git clone <your-github-repo-url>
cd <project-folder>
npm install
```

### 3. Build the Web App
```bash
npm run build
```

### 4. Add Native Platforms

#### iOS:
```bash
npx cap add ios
```

#### Android:
```bash
npx cap add android
```

### 5. Sync Web Assets to Native Projects
After each build, sync your web code to the native projects:
```bash
npx cap sync
```

Or sync a specific platform:
```bash
npx cap sync ios
npx cap sync android
```

## Running on Emulators/Devices

### iOS (macOS only)
Open Xcode project:
```bash
npx cap open ios
```

Or run directly on a connected device:
```bash
npx cap run ios
```

### Android
Open Android Studio project:
```bash
npx cap open android
```

Or run directly:
```bash
npx cap run android
```

## Development Workflow

When making changes to your web app:

1. Build the web app: `npm run build`
2. Sync to native: `npx cap sync`
3. Re-run the native app

For live reload during development, the capacitor.config.json is configured to use the Lovable preview URL.

## App Store Submission

### iOS App Store

1. Open the iOS project in Xcode: `npx cap open ios`
2. Configure signing with your Apple Developer account
3. Set the Bundle Identifier (currently: `app.lovable.f95162a1a53e4cec85191a8d83421a63`)
4. Update the version and build numbers in Xcode
5. Archive the app: Product → Archive
6. Submit to App Store Connect for review

### Google Play Store

1. Open the Android project in Android Studio: `npx cap open android`
2. Generate a signed APK or App Bundle
3. Update version in `android/app/build.gradle`
4. Build → Generate Signed Bundle/APK
5. Upload to Google Play Console

## Configuration Details

- **App ID**: `app.lovable.f95162a1a53e4cec85191a8d83421a63`
- **App Name**: `uwaziapp`
- **Web Dir**: `dist` (Vite build output)

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build the web app |
| `npx cap add ios` | Add iOS platform |
| `npx cap add android` | Add Android platform |
| `npx cap sync` | Sync web assets to native |
| `npx cap open ios` | Open iOS project in Xcode |
| `npx cap open android` | Open Android project in Studio |
| `npx cap run ios` | Run on iOS device/simulator |
| `npx cap run android` | Run on Android device/emulator |

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS App Store Guidelines](https://developer.apple.com/app-store/guidelines/)
- [Google Play Store Guidelines](https://developer.android.com/distribute/best-practices/launch/launch-checklist)
