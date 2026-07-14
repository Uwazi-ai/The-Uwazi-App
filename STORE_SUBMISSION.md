# UWAZI — App Store & Play Store Submission Guide

This project is now configured for native mobile submission via Capacitor.

## What's configured

- **Bundle ID / App ID:** `ai.uwazi.app`
- **App Name:** UWAZI
- **Web build directory:** `dist/`
- **Native plugins:** SplashScreen, StatusBar, PushNotifications, App, Browser
- **Hot-reload removed** from `capacitor.config.json` — the app now loads the bundled web assets (required for store submission).

## One-time setup (on your Mac / PC)

```bash
# 1. Export the project to your GitHub → git clone
git pull

# 2. Install JS deps
npm install

# 3. Build the web app
npm run build

# 4. Add native platforms (one time only)
npx cap add ios      # macOS + Xcode required
npx cap add android  # Android Studio required

# 5. Sync web build into native projects
npx cap sync
```

Rerun `npm run build && npx cap sync` **any time you pull new code**.

## Store icons & assets

Already generated under `public/icons/` and `public/store-assets/`:

| File | Use |
|---|---|
| `public/icons/icon-1024x1024.png` | iOS App Store icon (upload in App Store Connect) |
| `public/icons/icon-512x512.png` | Google Play Store icon |
| `public/store-assets/play-feature-graphic.jpg` | Play Store feature graphic (1024×500 — crop the 1024×512 render) |
| `public/splash/splash-2732x2732.png` | Splash screen source |

Generate the full native icon/splash sets from those with:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor "#080808" --splashBackgroundColor "#080808"
```

## Push notifications

`useNativePush()` is wired into `AppLayout` and no-ops on the web. On device it requests permission, registers with APNs/FCM, and upserts the token into a `push_tokens` table.

- iOS: enable **Push Notifications** and **Background Modes → Remote notifications** in Xcode capabilities; upload an APNs auth key in App Store Connect.
- Android: create a Firebase project, download `google-services.json`, place it in `android/app/`.
- Create the `push_tokens` table in Lovable Cloud before shipping:
  - `id uuid pk default gen_random_uuid()`
  - `user_id uuid references auth.users on delete cascade`
  - `token text unique not null`
  - `platform text not null`
  - `created_at timestamptz default now()`
  - RLS: users can insert/select/delete their own rows; service_role full.

## Android universal links

`public/.well-known/assetlinks.json` has a **placeholder SHA-256 fingerprint**. After generating your release keystore, replace it:

```bash
keytool -list -v -keystore release.keystore -alias <alias> | grep SHA256
```

## iOS universal links (optional)

Create `public/.well-known/apple-app-site-association` (no extension) with your Team ID + bundle ID once enrolled in the Apple Developer Program.

## Store listing checklist

- [ ] Apple Developer Program ($99/yr) enrolled
- [ ] Google Play Console account ($25 one-time)
- [ ] Privacy Policy URL: https://uwazi.ai/privacy
- [ ] Terms of Service URL: https://uwazi.ai/terms
- [ ] Support URL / email
- [ ] Screenshots: iPhone 6.7" (1290×2796), iPad 12.9" (2048×2732), Android phone (1080×1920+)
- [ ] App Store: age rating questionnaire, App Privacy nutrition label
- [ ] Google Play: content rating, Data safety form, target API level 34+
- [ ] iOS: App Tracking Transparency disclosure (you don't track — declare accordingly)

## Build & upload

```bash
# iOS
npx cap open ios
# In Xcode: Product → Archive → Distribute → App Store Connect

# Android
cd android && ./gradlew bundleRelease
# Upload android/app/build/outputs/bundle/release/app-release.aab in Play Console
```

Full walkthrough: https://lovable.dev/blog/mobile-apps-with-capacitor
