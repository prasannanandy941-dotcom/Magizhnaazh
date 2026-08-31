// Base URL of the API gateway.
//
// A physical phone can't reach your dev machine's `localhost`, so this defaults
// to the deployed gateway. To test against a local gateway (`npm run
// dev:gateway`), replace this with your computer's LAN IP, e.g.
//   export const GATEWAY_URL = 'http://192.168.1.5:8000';
export const GATEWAY_URL = 'https://event-api.porulontech.com';

// --- Google Sign-In ---------------------------------------------------------
// The WEB OAuth client id — this is the audience the backend verifies against
// (auth-service GOOGLE_CLIENT_ID), so it must stay this exact value.
export const GOOGLE_WEB_CLIENT_ID =
  '965066144511-qf8kg4hdrpuk86qd7tgf59a9l21hmpgt.apps.googleusercontent.com';

// The ANDROID OAuth client id for THIS app's package
// (com.porulontech.magizhnaazhvendor + your dev build's SHA-1). The vendor app
// has a different package id than the customer app, so it needs its OWN Android
// OAuth client — create it in Google Cloud and paste it here. Until it's set,
// email/password sign-in still works; native Google sign-in needs this value.
// See GOOGLE_SIGNIN_SETUP.md.
export const GOOGLE_ANDROID_CLIENT_ID = '';

// Optional: an iOS OAuth client id (only needed for iOS dev builds).
export const GOOGLE_IOS_CLIENT_ID = '';
