// Normalizes an inter-service base URL so it always carries a scheme.
//
// Render (and most PaaS blueprints) expose a sibling service's address as a
// bare hostname, e.g. "magizh-auth.onrender.com", with no "https://". Our
// gateway proxy targets and service-to-service fetch() calls both require a
// full URL. Local dev values already look like "http://localhost:8001" and
// pass through untouched.
export function serviceUrl(value: string | undefined, fallback: string): string {
  const raw = (value ?? fallback).trim();
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}
