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
// Budget must comfortably exceed a worst-case free-tier wake: the gateway can
// cold-start (~20s) and then wait for a sleeping upstream (~50s) within a
// single request, so ~18 attempts × 5s (~90s) leaves headroom before we give
// up and show the "starting up" message.
const COLD_START_RETRIES = 18;
const COLD_START_DELAY_MS = 5000;

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

export function sendOtp(email: string): Promise<any> {
  return postJson('/api/v1/auth/send-otp', { email });
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

