# Google Sign-In on the Magizhnaazh mobile app

Google sign-in can't run inside **Expo Go** — it needs a **development build** of the
app (built with EAS) plus a **Google Cloud Android OAuth client**. This is a one-time
setup. Until it's done, the Google button shows "not set up yet" and **email/password +
Sign Up keep working** normally.

The code is already wired up. You only need to do the steps below.

---

## What you'll need
- A free **Expo account** (https://expo.dev/signup)
- Access to the **Google Cloud Console** for the project that owns the OAuth client
  `965066144511-…apps.googleusercontent.com` (the same one the website uses)
- Node installed (you already have it)

---

## Step 1 — Log in to EAS and start a development build

In the `apps/mobile` folder:

```
npx eas-cli login
```
(enter your Expo account email + password)

```
npx eas-cli build --profile development --platform android
```

- When it asks to **create a new Android Keystore**, answer **Yes** (EAS manages it for you).
- The build runs on Expo's servers (~10–20 min). When done, it gives you a **URL / QR to
  install the APK** on your phone. Install it — this "Magizhnaazh (dev)" app **replaces
  Expo Go** for this project.

## Step 2 — Get your app's SHA-1 fingerprint

```
npx eas-cli credentials
```
- Choose **Android** → your project → **Keystore** → **Show/Download**.
- Copy the **SHA-1 Fingerprint** (looks like `AB:CD:12:…`).

## Step 3 — Create the Android OAuth client in Google Cloud

1. Go to **Google Cloud Console → APIs & Services → Credentials**.
2. **+ Create Credentials → OAuth client ID → Application type: Android**.
3. Fill in:
   - **Package name:** `com.porulontech.magizhnaazh`
   - **SHA-1 certificate fingerprint:** the SHA-1 from Step 2
4. **Create**. Copy the new **Android client ID** (`…apps.googleusercontent.com`).

> You do NOT change the existing Web client id — the app still sends its Google token to
> the backend, which verifies it against that web client id. The Android client just
> authorizes the app on the device.

## Step 4 — Paste the Android client ID into the app

Open `apps/mobile/src/config.ts` and set:

```ts
export const GOOGLE_ANDROID_CLIENT_ID = 'PASTE-YOUR-ANDROID-CLIENT-ID-HERE.apps.googleusercontent.com';
```

Save.

## Step 5 — Run the dev app with the new config

```
npx expo start --dev-client
```

Open the **Magizhnaazh (dev)** app you installed in Step 1 (not Expo Go), and it will
connect. The **Continue with Google** button now works.

---

## Notes
- After the first dev build, day-to-day you just run `npx expo start --dev-client` and
  open the installed dev app — no rebuild needed for normal JS changes (including the
  `config.ts` client-id paste).
- You only need a new build if you change native config (plugins, package name, etc.).
- For iOS you'd repeat Step 3 with an **iOS** OAuth client and set `GOOGLE_IOS_CLIENT_ID`.
- To ship to the Play Store later: `npx eas-cli build --profile production --platform android`.
