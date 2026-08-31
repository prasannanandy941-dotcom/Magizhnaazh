import { GATEWAY_URL } from './config';
import type { User, Vendor, Booking, EventItem } from './types';

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

// Check a typed OTP for instant signup feedback (non-consuming — register still
// verifies it).
export function verifyOtp(email: string, otp: string): Promise<{ success: boolean; valid: boolean; message?: string }> {
  return request('/api/v1/auth/verify-otp', { method: 'POST', body: { email, otp } });
}

// Exchange a Google ID token (obtained on-device) for a Magizhnaazh session.
// The backend verifies the token's audience against its GOOGLE_CLIENT_ID (the
// web client id), so the id token must be minted for that web client id.
export async function googleLogin(idToken: string): Promise<{ user: User; token: string }> {
  const res = await request<AuthResponse>('/api/v1/auth/google', {
    method: 'POST',
    body: { credential: idToken, role: 'customer' },
  });
  if (!res.data) throw new Error(res.message || 'Google sign-in failed.');
  return res.data;
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
interface BookingResponse { success: boolean; message?: string; data?: { booking: Booking } }

export async function fetchMyBookings(token: string): Promise<Booking[]> {
  const res = await request<BookingsListResponse>('/api/v1/bookings', { token });
  return res.data?.bookings ?? [];
}

// --- events -----------------------------------------------------------------

interface EventsListResponse { success: boolean; data?: { events: EventItem[] } }
interface EventResponse { success: boolean; message?: string; data?: { event: EventItem } }

export async function fetchEvents(token: string): Promise<EventItem[]> {
  const res = await request<EventsListResponse>('/api/v1/events', { token });
  return res.data?.events ?? [];
}

export async function createEvent(token: string, input: {
  title: string;
  eventType: string;
  city: string;
  date: string;
  guestCount: number;
  totalBudget: number;
}): Promise<EventItem> {
  const res = await request<EventResponse>('/api/v1/events', { method: 'POST', token, body: input });
  if (!res.data?.event) throw new Error(res.message || 'Could not create event.');
  return res.data.event;
}

// Create a booking for a vendor against an event. `advancePaymentClaimed` marks
// that the customer says they've paid the advance — the vendor still verifies
// and confirms it on their side (booking lands as pending).
export async function createBooking(token: string, input: {
  vendorId: string;
  vendorName?: string;
  vendorCategory?: string;
  eventId: string;
  packageId?: string;
  packageName?: string;
  price: number;
  eventDate?: string;
  notes?: string;
  advancePaymentClaimed?: boolean;
}): Promise<Booking> {
  const res = await request<BookingResponse>('/api/v1/bookings/quote', { method: 'POST', token, body: input });
  if (!res.data?.booking) throw new Error(res.message || 'Booking failed.');
  return res.data.booking;
}
