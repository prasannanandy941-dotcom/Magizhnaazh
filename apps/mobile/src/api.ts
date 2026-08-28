import { GATEWAY_URL } from './config';
import type { User, Vendor, Booking } from './types';

// --- low-level fetch helpers ------------------------------------------------

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = opts;
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check your connection.');
  }

  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server error ${res.status}. Please try again.`);
  }

  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status}).`);
  }
  return json as T;
}

// --- auth -------------------------------------------------------------------

interface AuthResponse {
  success: boolean;
  message?: string;
  data?: { user: User; token: string };
}

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await request<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!res.data) throw new Error(res.message || 'Login failed.');
  return res.data;
}

export function sendOtp(email: string): Promise<{ message?: string; _devOtp?: string }> {
  return request('/api/v1/auth/send-otp', { method: 'POST', body: { email } });
}

export async function register(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  otp: string;
}): Promise<{ user: User; token: string }> {
  const res = await request<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: { ...input, role: 'customer' },
  });
  if (!res.data) throw new Error(res.message || 'Registration failed.');
  return res.data;
}

// --- vendors ----------------------------------------------------------------

interface VendorsListResponse { success: boolean; data?: { vendors: Vendor[] } }
interface VendorResponse { success: boolean; data?: { vendor: Vendor } }

export async function fetchVendors(filters?: {
  city?: string;
  category?: string;
  search?: string;
}): Promise<Vendor[]> {
  const params = new URLSearchParams();
  if (filters?.city) params.set('city', filters.city);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  const res = await request<VendorsListResponse>(`/api/v1/vendors${qs ? `?${qs}` : ''}`);
  return res.data?.vendors ?? [];
}

export async function fetchVendorById(id: string): Promise<Vendor> {
  const res = await request<VendorResponse>(`/api/v1/vendors/${id}`);
  if (!res.data?.vendor) throw new Error('Vendor not found.');
  return res.data.vendor;
}

// --- bookings ---------------------------------------------------------------

interface BookingsListResponse { success: boolean; data?: { bookings: Booking[] } }

export async function fetchMyBookings(token: string): Promise<Booking[]> {
  const res = await request<BookingsListResponse>('/api/v1/bookings', { token });
  return res.data?.bookings ?? [];
}
