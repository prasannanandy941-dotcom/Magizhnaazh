// Base origin for links shared OUTSIDE this browser — the public /invite/:token
// RSVP links guests open on their own devices.
//
// window.location.origin is "http://localhost:3000" during local dev, which is
// unreachable from a guest's phone (there, "localhost" is THEIR device). Set
// VITE_PUBLIC_APP_URL to an address guests can actually reach:
//   • production: the deployed customer-web domain, e.g. https://app.example.com
//   • same-WiFi testing: this machine's LAN IP, e.g. http://192.168.1.5:3000
// When it isn't set we fall back to the current origin (correct once the app is
// opened via its real deployed domain rather than localhost).
export function publicAppOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }
  return window.location.origin;
}

// Full shareable RSVP link for a given invite token.
export function inviteUrl(token: string): string {
  return `${publicAppOrigin()}/invite/${token}`;
}
