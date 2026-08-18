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

async function postJson(path: string, body: unknown): Promise<AuthResponse> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Request failed.');
  }
  return json;
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return postJson('/api/v1/auth/login', { email, password });
}

export function register(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  businessName: string;
}): Promise<AuthResponse> {
  return postJson('/api/v1/auth/register', { ...input, role: 'vendor' });
}

async function authedFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
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
  const res = await fetch(`${GATEWAY_URL}/api/v1/vendors/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
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
export function fetchVendorReviews(vendorId: string): Promise<VendorReviewsResponse> {
  return fetch(`${GATEWAY_URL}/api/v1/reviews/vendor/${encodeURIComponent(vendorId)}`).then((r) => r.json());
}

