# Fixing "Error 400: origin_mismatch" for Google Sign-In

## Why this error happens
Google OAuth 2.0 strictly validates the web page origin (`protocol + domain + port`, e.g. `http://localhost:3000`) against the **Authorized JavaScript origins** registered in Google Cloud Console.

If the origin from which the user initiates Google Sign-In is not listed under the OAuth Client ID (`965066144511-qf8kg4hdrpuk86qd7tgf59a9l21hmpgt.apps.googleusercontent.com`), Google blocks the popup with:
> **Error 400: origin_mismatch**
> *You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy. If you're the app developer, register the JavaScript origin in the Google Cloud Console.*

---

## How to fix it in Google Cloud Console

1. Open **[Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)**.
2. Sign in with the account owning the project (`prasannanandy941@gmail.com`).
3. Under **OAuth 2.0 Client IDs**, select your **Web application** client ID (`965066144511-qf8kg4hdrpuk86qd7tgf59a9l21hmpgt.apps.googleusercontent.com`).
4. Find the section **Authorized JavaScript origins**.
5. Click **+ ADD URI** and add each of these URIs (do **NOT** add a trailing slash `/`):
   - `http://localhost:3000` *(Customer web local dev)*
   - `http://localhost` *(Localhost root)*
   - `http://localhost:3001` *(Vendor web local dev)*
   - `http://localhost:3002` *(Admin web local dev)*
   - `https://event.porulontech.com` *(Production unified portal)*
   - `https://event-customer.porulontech.com` *(Production customer portal)*
   - `https://event-vendor.porulontech.com` *(Production vendor portal)*
   - `https://event-admin.porulontech.com` *(Production admin portal)*
6. Under **Authorized redirect URIs** (if required):
   - `http://localhost:3000/customer`
   - `https://event.porulontech.com/customer`
7. Click **Save**.
8. Wait **2–5 minutes** for Google's edge servers to update, then refresh `http://localhost:3000/customer/` and try again.

---

## Important Rules from Google
- **Never use private IP addresses**: Google OAuth disallows `http://192.168.x.x:3000` or `http://10.x.x.x:3000`. Always browse via `http://localhost:3000/customer/`.
- **No trailing slash**: `http://localhost:3000` is valid; `http://localhost:3000/` will be rejected by Google.
- **Protocol matters**: Local development must use `http://`, production must use `https://`.
