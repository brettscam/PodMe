# PuckPuck Mobile

Expo (SDK 57) client for PuckPuck. Talks to the same Vercel API and Supabase
project as the web app — no separate backend.

## Setup

```bash
cd mobile
npm install
cp .env.example .env.local   # fill in the three values
npm start                    # then press i (iOS) / a (Android), or scan the QR
```

`.env.local` needs:

| Var | Where it comes from |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | same page (anon/public key, **not** service role) |
| `EXPO_PUBLIC_API_URL` | your Vercel deployment, e.g. `https://pod-me.vercel.app` |

Only `EXPO_PUBLIC_*` vars reach the client bundle. Anything in this file ships
inside the app binary, so never put a service-role key here.

## Supabase redirect URL

OAuth returns to a deep link built from the `scheme` in `app.json` (`puckpuck`).
Add these to **Supabase → Authentication → URL Configuration → Redirect URLs**:

```
puckpuck://auth/callback
exp://127.0.0.1:8081/--/auth/callback     # Expo Go during development
```

Expo Go's host/port changes between machines; `npx uri-scheme list` prints the
exact value `Linking.createURL()` will produce on your setup.

## Structure

```
src/
  app/                 expo-router routes (auto-detected at src/app)
    _layout.tsx        root: safe area, audio session, auth gate
    login.tsx
    (tabs)/
      _layout.tsx      tab bar
      index.tsx        Today — generate + play
      library.tsx      past episodes, share sheet
      settings.tsx     plan usage, sign out
  components/          AudioPlayer, shared UI primitives
  context/AuthContext  session + redirect gate
  hooks/               useAuth, useEpisodes, useTier, useEpisodeAudio
  lib/                 supabase client, API wrapper, theme, types
```

## Background audio and lock screen

`configureAudioSession()` runs once from the root layout and sets
`interruptionMode: 'doNotMix'`. That specific value is required — expo-audio
will not bind lock screen controls to the player without it. The player then
calls `setActiveForLockScreen(true, metadata)` so the episode title shows in
Control Center, and `clearLockScreenControls()` on unmount so stale now-playing
info doesn't linger.

`UIBackgroundModes: ["audio"]` and the Android foreground-service permissions
are added by the `expo-audio` config plugin in `app.json`; they only take effect
in a development or production build, **not in Expo Go**.

## Current state

Working: Google sign-in, generate today's episode with live stage progress,
audio playback with lock screen controls, episode library with native share,
plan usage display, sign out.

Not built yet: topic management, tone/length preferences, push notifications,
custom topics. Those live on the web app for now and the Settings screen says so.

Billing is intentionally web-only. Adding in-app purchase means StoreKit and
Apple's 15–30% cut; the Settings screen points users to the web instead.

## Known issues

- **Peer dependency conflict.** `react-native-worklets@0.13` (pulled in via
  `expo-router` → `@expo/ui`) is outside the range `expo-modules-core@57.0.20`
  declares (`^0.7.4 || ^0.8.0 || ^0.9.0 || ^0.10.0`). Install and typecheck both
  succeed, but this may surface on the first native build. `npx expo-doctor`
  will diagnose it once you have network access to Expo's API.
- **Types are duplicated** from `src/lib/types.ts` on the web side rather than
  imported. Resolving that needs Metro `watchFolders` config, which should land
  with the `apps/*` monorepo migration.
- **Tab bar bottom inset** has only been checked on the web target, which has no
  safe-area inset. Confirm the labels clear the home indicator on a real device.

## Before TestFlight

1. Enroll in the Apple Developer Program ($99/yr, 24–48h approval).
2. Replace the placeholder `ios.bundleIdentifier` (`app.puckpuck.mobile`) with
   one registered to your team.
3. Add **Sign in with Apple**. Apple requires it in any app offering third-party
   social login, and this app offers Google. It needs the Apple Developer
   account first, which is why it isn't wired up yet.
4. `npx eas build --platform ios` → `npx eas submit`.

## Verification notes

This app has not been run on an iOS simulator or device. What was verified: the
Metro bundle builds (889 modules, no errors), TypeScript passes, and the login,
Today, and Settings screens render with working tab navigation — all checked
through Expo's web target in a headless browser. Native-only behavior
(lock screen controls, background audio, OAuth deep link round-trip) needs a
real device.
