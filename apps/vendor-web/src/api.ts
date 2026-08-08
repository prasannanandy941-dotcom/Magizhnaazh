import { User, Vendor, Booking } from '../../../packages/shared-types';

export const GATEWAY_URL = 'http://localhost:8000';

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
