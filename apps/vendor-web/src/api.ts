import { User, Vendor, Booking, Review } from '../../../packages/shared-types';

// In production this is baked in at build time from the VITE_GATEWAY_URL env
// var (set in Render). Falls back to the local gateway for `npm run dev`.
// Render exposes a service address as a bare hostname, so add https:// when the
// value has no scheme; local dev values already start with http://localhost.
const rawGatewayUrl = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8000';
export const GATEWAY_URL = /^https?:\/\//i.test(rawGatewayUrl)
  ? rawGatewayUrl
  : `https://${rawGatewayUrl}`;

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: { user: User; token: string };
}

// Free-tier services on Render sleep after ~15 min idle. The first request
// while a service wakes returns a 502/503/504 or an HTML "service is starting"
// page instead of JSON — which would otherwise surface as
// "Unexpected token '<'". We transparently retry a few times with a short
// delay so a cold start is invisible to the user. Only cold-start signals are
// retried (gateway 5xx, HTML body, or a network error); real application
// errors return JSON and are passed straight through.
// Retrying only makes sense against Render's free tier, where a sleeping
// service wakes in ~50s. Locally there is no cold start — a service is either
// up or down — so a long retry just leaves the user staring at a spinner for
// 90s when a service is off. Detect a local gateway and fail fast there
// (~6s), while keeping the long budget for the deployed cloud.
const IS_LOCAL_GATEWAY = /\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(GATEWAY_URL);
// Retry budget for a transient 502/503/network blip. The backend runs on an
// always-on VPS (pm2), so there's no ~50s cold start to wait out — a short
// budget (~12s) covers a brief restart during deploy without making every
// hiccup hang the UI for a minute and a half.
const COLD_START_RETRIES = IS_LOCAL_GATEWAY ? 3 : 6;
const COLD_START_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(
  path: string,
  options: RequestInit = {}
): Promise<{ res: Response; json: any }> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= COLD_START_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${GATEWAY_URL}${path}`, options);
    } catch (err) {
      lastError = err;
      if (attempt < COLD_START_RETRIES) {
        await sleep(COLD_START_DELAY_MS);
        continue;
      }
      throw err;
    }

    if ([502, 503, 504].includes(res.status) && attempt < COLD_START_RETRIES) {
      await sleep(COLD_START_DELAY_MS);
      continue;
    }

    const text = await res.text();
    if (text.trimStart().startsWith('<') && attempt < COLD_START_RETRIES) {
      await sleep(COLD_START_DELAY_MS);
      continue;
    }

    try {
      return { res, json: text ? JSON.parse(text) : {} };
    } catch {
      if (!res.ok) {
        throw new Error(`Server returned error ${res.status}: ${res.statusText || 'Unavailable'}. Please check if the services are running.`);
      }
      throw new Error('Server is starting up. Please try again in a moment.');
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed.');
}

async function postJson(path: string, body: unknown): Promise<AuthResponse> {
  const { res, json } = await fetchJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(json.message || 'Request failed.');
  }
  return json;
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return postJson('/api/v1/auth/login', { email, password });
}

export interface GoogleAuthResponse {
  success: boolean;
  message: string;
  data?: { user: User; token: string; isNewUser?: boolean };
}

// One-click Google Sign-In for vendors. `role` is fixed to 'vendor' so a
// first-time Google account is created as a vendor. The caller stores the token
// via the App's handleAuthSuccess (consistent with vendor `login`).
export function googleLogin(credential: string): Promise<GoogleAuthResponse> {
  return postJson('/api/v1/auth/google', { credential, role: 'vendor' }) as Promise<GoogleAuthResponse>;
}

export function sendOtp(email: string): Promise<any> {
  return postJson('/api/v1/auth/send-otp', { email });
}

// Check a typed OTP for instant signup feedback (non-consuming — register still
// verifies it).
export function verifyOtp(email: string, otp: string): Promise<{ success: boolean; valid: boolean; message?: string }> {
  return postJson('/api/v1/auth/verify-otp', { email, otp }) as any;
}

export function forgotPassword(email: string): Promise<any> {
  return postJson('/api/v1/auth/forgot-password', { email });
}

export function resetPassword(email: string, otp: string, newPassword: string): Promise<any> {
  return postJson('/api/v1/auth/reset-password', { email, otp, newPassword });
}

export function register(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  businessName: string;
  otp: string;
}): Promise<AuthResponse> {
  return postJson('/api/v1/auth/register', { ...input, role: 'vendor' });
}

async function authedFetch(path: string, token: string, options: RequestInit = {}) {
  const { res, json } = await fetchJson(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('magizhnaazh_vendor_user');
    localStorage.removeItem('magizhnaazh_vendor_token');
    window.location.reload();
    throw new Error('Session expired — please sign in again.');
  }
  if (!res.ok) {
    throw new Error(json.message || 'Request failed.');
  }
  return json;
}

export interface MyVendorResponse {
  success: boolean;
  message?: string;
  data?: { vendor: Vendor };
}

export async function fetchMyVendor(token: string): Promise<MyVendorResponse> {
  const { res, json } = await fetchJson('/api/v1/vendors/mine', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ...json, success: res.ok && json.success };
}

export function createVendor(token: string, input: Partial<Vendor>): Promise<MyVendorResponse> {
  return authedFetch('/api/v1/vendors', token, { method: 'POST', body: JSON.stringify(input) });
}

export function updateVendor(token: string, vendorId: string, input: Partial<Vendor>): Promise<MyVendorResponse> {
  return authedFetch(`/api/v1/vendors/${vendorId}`, token, { method: 'PUT', body: JSON.stringify(input) });
}

export interface BookingsResponse {
  success: boolean;
  count?: number;
  data?: { bookings: Booking[] };
}

export function fetchVendorBookings(token: string, vendorId: string): Promise<BookingsResponse> {
  return authedFetch(`/api/v1/bookings?vendorId=${encodeURIComponent(vendorId)}`, token);
}

// Silent variant for the background poll: a transient 401 (e.g. during a
// service blip) must NOT trigger authedFetch's window.location.reload(), which
// would reset the vendor's current tab and log them out. The poll just skips a
// tick; a real session expiry is still caught on the vendor's next action.
export async function fetchVendorBookingsSilent(token: string, vendorId: string): Promise<BookingsResponse> {
  const { res, json } = await fetchJson(`/api/v1/bookings?vendorId=${encodeURIComponent(vendorId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(json?.message || 'Failed to load bookings.');
  return json;
}

export function confirmBooking(token: string, bookingId: string) {
  return authedFetch(`/api/v1/bookings/${bookingId}/confirm`, token, { method: 'PUT' });
}

export function sendCounterQuote(token: string, bookingId: string, amount: number, notes?: string) {
  return authedFetch(`/api/v1/bookings/${bookingId}/quote`, token, {
    method: 'PUT',
    body: JSON.stringify({ amount, notes, sender: 'vendor' }),
  });
}

export function updateBookingStatus(token: string, bookingId: string, status: string) {
  return authedFetch(`/api/v1/bookings/${bookingId}/status`, token, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// Save the vendor's line-item breakdown of what the booking money was spent on.
// The customer sees this under the vendor in the Smart Budget drill-down.
export function updateSpendBreakdown(
  token: string,
  bookingId: string,
  spendItems: { label: string; amount: number }[]
) {
  return authedFetch(`/api/v1/bookings/${bookingId}/spend-breakdown`, token, {
    method: 'PUT',
    body: JSON.stringify({ spendItems }),
  });
}

export interface VendorReviewsResponse {
  success: boolean;
  data?: { reviews: Review[]; averageRating: number; count: number };
}

// Public reviews for this vendor — customer reviews the vendor can read on their
// dashboard. No auth needed (public endpoint), but we pass the token when we
// have it for consistency.
export async function fetchVendorReviews(vendorId: string): Promise<VendorReviewsResponse> {
  const { json } = await fetchJson(`/api/v1/reviews/vendor/${encodeURIComponent(vendorId)}`);
  return json;
}

// The vendor's private calendar-feed token, used to build the .ics subscribe URL.
export async function fetchCalendarToken(token: string, vendorId: string): Promise<{ success: boolean; data?: { token: string } }> {
  return authedFetch(`/api/v1/bookings/vendor/${vendorId}/calendar-token`, token, { method: 'GET' });
}

// Confirm a customer's claimed balance payment on a booking.
export function confirmBookingPayment(token: string, bookingId: string, paymentId: string) {
  return authedFetch(`/api/v1/bookings/${bookingId}/payments/${paymentId}/confirm`, token, { method: 'PUT' });
}

// Fetch the GST invoice for one of this vendor's bookings.
export async function fetchBookingInvoice(token: string, bookingId: string): Promise<{ success: boolean; data?: { invoice: any } }> {
  return authedFetch(`/api/v1/bookings/${bookingId}/invoice`, token, { method: 'GET' });
}

// Submit a verification request (KYC details + proof document URLs) to earn the
// Verified badge. Returns the updated vendor with verification.status === 'pending'.
export function submitVerification(
  token: string,
  vendorId: string,
  input: { legalName: string; registrationNumber: string; gstNumber: string; contactPerson: string; documents: string[] }
): Promise<MyVendorResponse> {
  return authedFetch(`/api/v1/vendors/${encodeURIComponent(vendorId)}/verification`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Post (or edit/clear) the vendor's public reply to one of its reviews.
export async function replyToReview(token: string, reviewId: string, reply: string): Promise<{ success: boolean; data?: { review: Review } }> {
  return authedFetch(`/api/v1/reviews/${encodeURIComponent(reviewId)}/reply`, token, {
    method: 'POST',
    body: JSON.stringify({ reply }),
  });
}

