import { User, Event, Booking, Vendor, Invitation, Guest, City, Review, EventFeedback } from '../../../packages/shared-types';

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

export interface EventResponse {
  success: boolean;
  message?: string;
  data?: { event: Event };
}

export interface EventsListResponse {
  success: boolean;
  count?: number;
  data?: { events: Event[] };
}

export interface BookingResponse {
  success: boolean;
  message?: string;
  data?: { booking: Booking };
}

export interface BookingsListResponse {
  success: boolean;
  count?: number;
  data?: { bookings: Booking[] };
}


export interface VendorsListResponse {
  success: boolean;
  count?: number;
  data?: { vendors: Vendor[] };
}

export interface VendorResponse {
  success: boolean;
  message?: string;
  data?: { vendor: Vendor };
}

export interface InvitationResponse {
  success: boolean;
  message?: string;
  data?: { invitation: Invitation | null };
}

export interface GuestsListResponse {
  success: boolean;
  count?: number;
  data?: { guests: Guest[] };
}

export interface GuestResponse {
  success: boolean;
  message?: string;
  data?: { guest: Guest };
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
const COLD_START_RETRIES = IS_LOCAL_GATEWAY ? 3 : 18;
const COLD_START_DELAY_MS = IS_LOCAL_GATEWAY ? 2000 : 5000;

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
      // Service unreachable mid-wake — retry.
      lastError = err;
      if (attempt < COLD_START_RETRIES) {
        await sleep(COLD_START_DELAY_MS);
        continue;
      }
      throw err;
    }

    // A waking service (or the gateway proxying to one) returns 502/503/504.
    if ([502, 503, 504].includes(res.status) && attempt < COLD_START_RETRIES) {
      await sleep(COLD_START_DELAY_MS);
      continue;
    }

    const text = await res.text();
    // A waking service can return Render's HTML holding page — retry.
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

const TOKEN_KEY = 'accessToken';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Thrown by authedFetch on a non-ok response. Carries the HTTP status (and
// the server's `code`, if any) so callers can tell an expired/invalid
// session (401) apart from an ordinary validation failure — a plain
// Error(message) loses that distinction.
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Authenticated request helper — attaches the Bearer token stored at login.
async function authedFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const { res, json } = await fetchJson(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    throw new ApiError(json.message || 'Request failed.', res.status, json.code);
  }
  return json as T;
}

// Public, unauthenticated request helper — for endpoints anyone can view or submit
// (vendor marketplace, invite pages, RSVP submissions), whether or not logged in.
async function publicFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { res, json } = await fetchJson(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(json.message || 'Request failed.');
  }
  return json as T;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const result = await postJson('/api/v1/auth/login', { email, password });
  if (result.success && result.data?.token) {
    localStorage.setItem(TOKEN_KEY, result.data.token);
    localStorage.setItem('user', JSON.stringify(result.data.user));
  }
  return result;
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

export async function register(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'customer' | 'vendor';
  otp: string;
}): Promise<AuthResponse> {
  const result = await postJson('/api/v1/auth/register', input);
  if (result.success && result.data?.token) {
    localStorage.setItem(TOKEN_KEY, result.data.token);
    localStorage.setItem('user', JSON.stringify(result.data.user));
  }
  return result;
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('user');
}

// Fetch the live vendor marketplace listing — public, no auth required.
// Optional filters are forwarded to the backend as query params: `city` filters
// by serviceable city, and `lat`/`lng`/`radiusKm` do a geo "near me" search.
export function fetchVendors(filters?: {
  city?: string;
  category?: string;
  search?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}): Promise<VendorsListResponse> {
  const params = new URLSearchParams();
  if (filters?.city && filters.city !== 'All') params.set('city', filters.city);
  if (filters?.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.lat != null && filters?.lng != null) {
    params.set('lat', String(filters.lat));
    params.set('lng', String(filters.lng));
    if (filters.radiusKm != null) params.set('radiusKm', String(filters.radiusKm));
  }
  const qs = params.toString();
  return publicFetch<VendorsListResponse>(`/api/v1/vendors${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

// Serviceable cities managed in the backend (admin console) — public list used
// to populate the location dropdowns so they stay in sync with the backend.
export interface LocationsListResponse {
  success: boolean;
  data?: { locations: City[] };
}

export function fetchLocations(): Promise<LocationsListResponse> {
  return publicFetch<LocationsListResponse>('/api/v1/locations', { method: 'GET' });
}

// Public, non-sensitive platform settings — currently just the site-wide theme
// the admin chose, so the customer app matches the admin's light/dark choice.
export interface PublicSettingsResponse {
  success: boolean;
  data?: { settings: { theme?: 'light' | 'dark' } };
}

export function fetchPublicSettings(): Promise<PublicSettingsResponse> {
  return publicFetch<PublicSettingsResponse>('/api/v1/settings/public', { method: 'GET' });
}

// Fetch one vendor fresh from the backend — public, no auth required. Used to
// refresh a single vendor's detail modal so vendor-side edits (availability,
// packages, options, gallery) show up immediately without a full page reload.
export function fetchVendorById(vendorId: string): Promise<VendorResponse> {
  return publicFetch<VendorResponse>(`/api/v1/vendors/${vendorId}`, { method: 'GET' });
}

// Fetch events belonging to the logged-in user (or all events, if role is admin).
export function fetchEvents(): Promise<EventsListResponse> {
  return authedFetch<EventsListResponse>('/api/v1/events', { method: 'GET' });
}

// Create a new event — server calculates the smart budget breakdown and persists it.
export function createEvent(input: {
  title: string;
  eventType: string;
  city: string;
  date: string;
  guestCount: number;
  totalBudget: number;
}): Promise<EventResponse> {
  return authedFetch<EventResponse>('/api/v1/events', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Update the budget allocation breakdown for an existing event.
export function updateEventBudget(
  eventId: string,
  budgetBreakdown: Event['budgetBreakdown']
): Promise<EventResponse> {
  return authedFetch<EventResponse>(`/api/v1/events/${eventId}/budget`, {
    method: 'PUT',
    body: JSON.stringify({ budgetBreakdown }),
  });
}

// Create a booking quote for a vendor package — the first step of "Book & Pay Advance".
export function createBookingQuote(input: {
  vendorId: string;
  vendorName?: string;
  vendorCategory?: string;
  eventId: string;
  packageId?: string;
  packageName?: string;
  price?: number;
  eventDate?: string;
  notes?: string;
  selectedOptions?: string[];
  referenceImages?: string[];
  // True once the customer has seen the vendor's UPI ID/QR and clicked
  // Confirm Order — lands the booking in 'pending_payment' so the vendor
  // has to verify and confirm it themselves, instead of it auto-confirming.
  advancePaymentClaimed?: boolean;
}): Promise<BookingResponse> {
  return authedFetch<BookingResponse>('/api/v1/bookings/quote', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Upload a customer reference image (multipart) and return its stored URL. Used
// for images the customer attaches to a booking so the vendor can see them.
export async function uploadReferenceImage(file: File): Promise<string> {
  const token = localStorage.getItem('accessToken');
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${GATEWAY_URL}/api/v1/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.data?.fileUrl) throw new Error(json?.message || 'Upload failed.');
  return json.data.fileUrl as string;
}

// This customer's own bookings — the backend scopes GET /bookings (no vendorId)
// to the caller's own customerId, so this needs no extra params.
export function fetchMyBookings(): Promise<BookingsListResponse> {
  return authedFetch<BookingsListResponse>('/api/v1/bookings', { method: 'GET' });
}

// --- Invitations ---

// The logged-in host's invitation for a given event (or null if none created yet).
export function fetchInvitationForEvent(eventId: string): Promise<InvitationResponse> {
  return authedFetch<InvitationResponse>(`/api/v1/invitations/event/${eventId}`, { method: 'GET' });
}

// Create a new invitation document for an event — backend generates the real, unguessable inviteToken.
export function createInvitation(input: {
  eventId: string;
  eventTitle?: string;
  hostName?: string;
  date?: string;
  time?: string;
  venueName?: string;
  venueAddress?: string;
  message?: string;
  canvasData?: Invitation['canvasData'];
}): Promise<InvitationResponse> {
  return authedFetch<InvitationResponse>('/api/v1/invitations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Save canvas edits to an existing invitation.
export function updateInvitationCanvas(
  invitationId: string,
  canvasData: Invitation['canvasData']
): Promise<InvitationResponse> {
  return authedFetch<InvitationResponse>(`/api/v1/invitations/${invitationId}`, {
    method: 'PUT',
    body: JSON.stringify({ canvasData }),
  });
}

// Public invitation lookup by its unguessable share token — no auth, works for any guest.
export function fetchPublicInvitation(token: string): Promise<InvitationResponse> {
  return publicFetch<InvitationResponse>(`/api/v1/invitations/${token}`, { method: 'GET' });
}

// --- Guests / RSVP ---

// Host's guest roster for an event.
export function fetchGuestsForEvent(eventId: string): Promise<GuestsListResponse> {
  return authedFetch<GuestsListResponse>(`/api/v1/guests/event/${eventId}`, { method: 'GET' });
}

// Host manually adding a guest to the roster.
export function addGuest(input: {
  eventId: string;
  name: string;
  email?: string;
  phone?: string;
  group?: string;
  adultsCount?: number;
  childrenCount?: number;
  dietaryPreference?: string;
}): Promise<GuestResponse> {
  return authedFetch<GuestResponse>('/api/v1/guests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// --- Vendor reviews ---

export interface ReviewResponse {
  success: boolean;
  message?: string;
  data?: { review: Review };
}

// Submit a verified review for a vendor — only works on a completed booking the
// customer owns (the backend enforces this). Sub-ratings default to the overall
// score unless the caller supplies more granular values.
export function submitReview(input: {
  vendorId: string;
  bookingId: string;
  overallRating: number;
  comment?: string;
  customerName?: string;
  serviceQuality?: number;
  professionalism?: number;
  valueForMoney?: number;
  communication?: number;
  punctuality?: number;
}): Promise<ReviewResponse> {
  return authedFetch<ReviewResponse>('/api/v1/reviews', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// The signed-in customer's own reviews — used to show which orders are reviewed.
export function fetchMyReviews(): Promise<{ success: boolean; data?: { reviews: Review[] } }> {
  return authedFetch<{ success: boolean; data?: { reviews: Review[] } }>('/api/v1/reviews/mine', { method: 'GET' });
}

// --- Event guest feedback ---

export interface FeedbackResponse {
  success: boolean;
  message?: string;
  data?: { feedback: EventFeedback };
}

// Public event feedback submission — no account required. Persists to the
// backend so it appears in the admin console's Guest Feedback list.
export function submitEventFeedback(input: {
  eventId: string;
  guestName?: string;
  overallRating: number;
  venueRating?: number;
  cateringRating?: number;
  decorationRating?: number;
  organizationRating?: number;
  photographyRating?: number;
  comments?: string;
}): Promise<FeedbackResponse> {
  return publicFetch<FeedbackResponse>('/api/v1/feedback', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Public RSVP submission from a guest — no account required, works from any device.
export function submitRSVP(input: {
  eventId: string;
  name: string;
  status: 'accepted' | 'declined' | 'maybe';
  adultsCount?: number;
  childrenCount?: number;
  dietaryPreference?: string;
}): Promise<GuestResponse> {
  return publicFetch<GuestResponse>('/api/v1/guests/rsvp', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}