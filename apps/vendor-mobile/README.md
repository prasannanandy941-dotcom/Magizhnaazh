# Magizhnaazh Vendor (mobile)

A dedicated Android/iOS app for **vendor partners** — the counterpart to the
customer app in `apps/mobile`. Same hybrid architecture:

1. The vendor signs in **natively** (email/OTP or Google), which is validated to
   be a `vendor` (or `admin`) account.
2. The app then loads the live **vendor portal** (`event-vendor.porulontech.com`)
   inside a `WebView`, pre-seeding the site's session
   (`magizhnaazh_vendor_token` / `magizhnaazh_vendor_user` in `localStorage`) so
   it opens already logged in — full parity with the web, always in sync.

## Run it

```bash
npm run dev:vendor-mobile
```

(from the repo root — or `npm run start --prefix apps/vendor-mobile`). Open in
Expo Go / a dev build.

## Two things needed before a store build

1. **EAS project** — this app has no `extra.eas.projectId` yet (it must be its
   own project, separate from the customer app). Run `eas init` in this folder
   on first build to create one.
2. **Android Google OAuth client** — the package id is
   `com.porulontech.magizhnaazhvendor` (distinct from the customer app), so it
   needs its **own** Android OAuth client id (package + dev-build SHA-1). Paste
   it into `GOOGLE_ANDROID_CLIENT_ID` in `src/config.ts`. Until then,
   email/OTP sign-in works; native Google sign-in needs that value. The backend
   still verifies Google tokens against the shared **web** client id, which is
   already set.

Everything else (bookings, quotes, offers, verification, payments, invoices,
calendar) comes straight from the vendor web app rendered in the WebView, so it
stays in sync with the site with no extra native work.
