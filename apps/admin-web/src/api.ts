import {
  User,
  Vendor,
  VendorDeal,
  Event,
  Booking,
  Review,
  EventFeedback,
  Complaint,
  Category,
  City,
  Banner,
  Coupon,
  InvitationTemplateDoc,
  PlatformSettings,
} from '../../../packages/shared-types';

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
// Always-on VPS (pm2): a short retry budget (~12s) covers a brief deploy
// restart without hanging the UI for the better part of a minute.
const COLD_START_RETRIES = 6;
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

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    // 502/503/504 usually mean the upstream service is booting up on Render.
    // Retry so the user doesn't see a momentary failure.
    if (!res.ok && (res.status === 502 || res.status === 503 || res.status === 504) && attempt < COLD_START_RETRIES) {
      await sleep(COLD_START_DELAY_MS);
      continue;
    }

    if (!isJson) {
      const text = await res.text().catch(() => '');
      // If the body is HTML (e.g. Render 502 page), retry instead of crashing JSON.parse.
      if (text.trim().startsWith('<') && attempt < COLD_START_RETRIES) {
        await sleep(COLD_START_DELAY_MS);
        continue;
      }
      throw new Error(text || `Server returned ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    return { res, json };
  }
  throw lastError || new Error('Request timed out while waiting for server to start.');
}

async function authedFetch(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<any> {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const { json } = await fetchJson(path, { ...options, headers });
  return json;
}

// --- Auth ---

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { json } = await fetchJson('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return json;
}

export async function googleLogin(credential: string): Promise<AuthResponse> {
  const { json } = await fetchJson('/api/v1/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential, loginOnly: true }),
  });
  return json;
}

// --- Dashboard ---

export async function fetchVendors(): Promise<{ success: boolean; data?: { vendors: Vendor[] } }> {
  const { json } = await fetchJson('/api/v1/vendors');
  return json;
}

export function toggleVendorVerification(token: string, vendorId: string) {
  return authedFetch(`/api/v1/vendors/${vendorId}/verify`, token, { method: 'PUT' });
}

// Record an explicit verification decision on a vendor's pending request.
export function decideVendorVerification(token: string, vendorId: string, decision: 'approve' | 'reject', reason?: string) {
  return authedFetch(`/api/v1/vendors/${vendorId}/verify`, token, {
    method: 'PUT',
    body: JSON.stringify({ decision, reason }),
  });
}

export function toggleVendorSuspension(token: string, vendorId: string) {
  return authedFetch(`/api/v1/vendors/${vendorId}/suspend`, token, { method: 'PUT' });
}

export function updateVendorDeals(token: string, vendorId: string, deals: VendorDeal[]) {
  return authedFetch(`/api/v1/vendors/${vendorId}`, token, {
    method: 'PUT',
    body: JSON.stringify({ deals }),
  });
}

export interface AdminMetrics {
  totalBookings: number;
  grossBookingVolume: number;
  totalAdvanceCollected: number;
  platformCommissionEarned: number;
}

export function fetchAdminMetrics(token: string): Promise<{ success: boolean; data?: AdminMetrics }> {
  return authedFetch('/api/v1/bookings/admin/metrics', token);
}

export function fetchEvents(token: string): Promise<{ success: boolean; data?: { events: Event[] } }> {
  return authedFetch('/api/v1/events', token);
}

export function fetchBookings(token: string): Promise<{ success: boolean; data?: { bookings: Booking[] } }> {
  return authedFetch('/api/v1/bookings', token);
}

export interface ServiceHealth {
  name: string;
  port: number;
  up: boolean;
}

const MONITORED_SERVICES = [
  { name: 'API Gateway', port: 8000 },
  { name: 'Auth Service', port: 8001 },
  { name: 'Marketplace', port: 8002 },
  { name: 'Event & Budget', port: 8003 },
  { name: 'Booking & Pay', port: 8004 },
  { name: 'Invitation', port: 8005 },
  { name: 'Guest & Feedback', port: 8006 },
];

export async function pingAllServices(): Promise<ServiceHealth[]> {
  return Promise.all(
    MONITORED_SERVICES.map(async (svc) => {
      try {
        const res = await fetch(`http://localhost:${svc.port}/health`, { signal: AbortSignal.timeout(3000) });
        return { name: svc.name, port: svc.port, up: res.ok };
      } catch {
        return { name: svc.name, port: svc.port, up: false };
      }
    })
  );
}

// --- Ecosystem monitor (monitor-service, via the gateway) ---

export interface MonitorSample {
  t: number;
  up: boolean;
  responseMs: number | null;
}

export interface MonitorService {
  key: string;
  name: string;
  port: number;
  dependsOn: string[];
  up: boolean;
  responseMs: number | null;
  lastChangeAt: number;
  lastCheckedAt: number;
  restartCommand: string;
  history: MonitorSample[];
}

export interface MonitorDependencies {
  nodes: { key: string; name: string; port: number; up: boolean; responseMs: number | null }[];
  edges: { from: string; to: string }[];
}

export interface MonitorAlert {
  id: string;
  at: number;
  service: string;
  kind: 'down' | 'recovered';
  message: string;
  channels: string[];
}

export interface MonitorStatus {
  services: MonitorService[];
  summary: { up: number; total: number; allUp: boolean };
  dependencies: MonitorDependencies;
  alerts: { recent: MonitorAlert[]; channels: { slack: boolean; email: boolean; inApp: boolean } };
  restart: { enabled: boolean };
  polledEveryMs: number;
}

// Robust GET that never throws on a non-JSON body (e.g. a rate-limiter's
// plain-text 429) — returns { success:false } instead so the caller can treat
// it as a transient miss rather than crashing the poll loop.
async function safeGetJson<T>(path: string): Promise<{ success: boolean; data?: T }> {
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`);
    if (!res.ok) return { success: false };
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false };
    }
  } catch {
    return { success: false };
  }
}

// One call returns everything the dashboard renders: live status, per-service
// history (sparklines), dependency graph, alerts, and restart availability.
export function fetchMonitorStatus(): Promise<{ success: boolean; data?: MonitorStatus }> {
  return safeGetJson<MonitorStatus>('/api/v1/monitor/status');
}

export function restartService(token: string, key: string) {
  return authedFetch(`/api/v1/monitor/restart/${key}`, token, { method: 'POST' });
}

// --- Users ---

export interface AdminUser extends User {}

export function fetchAllUsers(token: string): Promise<{ success: boolean; data?: { users: AdminUser[]; total: number } }> {
  return authedFetch('/api/v1/auth/admin/users', token);
}

export function toggleUserSuspension(token: string, userId: string) {
  return authedFetch(`/api/v1/auth/admin/users/${userId}/suspend`, token, { method: 'PUT' });
}

// --- Categories ---

export async function fetchCategories(): Promise<{ success: boolean; data?: { categories: Category[] } }> {
  const { json } = await fetchJson('/api/v1/categories');
  return json;
}

export function addCategory(token: string, name: string) {
  return authedFetch('/api/v1/categories', token, { method: 'POST', body: JSON.stringify({ name }) });
}

export function deleteCategory(token: string, id: string) {
  return authedFetch(`/api/v1/categories/${id}`, token, { method: 'DELETE' });
}

// --- Locations ---

export async function fetchLocations(): Promise<{ success: boolean; data?: { locations: City[] } }> {
  const { json } = await fetchJson('/api/v1/locations');
  return json;
}

export function addLocation(token: string, name: string, state: string) {
  return authedFetch('/api/v1/locations', token, { method: 'POST', body: JSON.stringify({ name, state }) });
}

export function addLocationsBulk(token: string, locations: { name: string; state: string }[]) {
  return authedFetch('/api/v1/locations', token, {
    method: 'POST',
    body: JSON.stringify({ locations }),
  });
}

export function deleteLocation(token: string, id: string) {
  return authedFetch(`/api/v1/locations/${id}`, token, { method: 'DELETE' });
}

// --- Banners ---

export async function fetchBanners(): Promise<{ success: boolean; data?: { banners: Banner[] } }> {
  const { json } = await fetchJson('/api/v1/banners');
  return json;
}

export function addBanner(token: string, input: { title: string; imageUrl: string; linkUrl?: string }) {
  return authedFetch('/api/v1/banners', token, { method: 'POST', body: JSON.stringify(input) });
}

export function deleteBanner(token: string, id: string) {
  return authedFetch(`/api/v1/banners/${id}`, token, { method: 'DELETE' });
}

// --- Coupons ---

export function fetchCoupons(token: string): Promise<{ success: boolean; data?: { coupons: Coupon[] } }> {
  return authedFetch('/api/v1/coupons', token);
}

export function addCoupon(token: string, input: { code: string; discountPercent: number; expiresAt?: string }) {
  return authedFetch('/api/v1/coupons', token, { method: 'POST', body: JSON.stringify(input) });
}

export function deleteCoupon(token: string, id: string) {
  return authedFetch(`/api/v1/coupons/${id}`, token, { method: 'DELETE' });
}

// --- Platform settings ---

export function fetchSettings(token: string): Promise<{ success: boolean; data?: { settings: PlatformSettings } }> {
  return authedFetch('/api/v1/settings', token);
}

export function updateSettings(token: string, input: { commissionRate?: number; advanceDepositRate?: number; gstRate?: number; theme?: 'light' | 'dark' }) {
  return authedFetch('/api/v1/settings', token, { method: 'PUT', body: JSON.stringify(input) });
}

// --- Settlements (vendor payouts) ---

export interface Settlement {
  bookingId: string;
  bookingNumber: string;
  vendorId: string;
  vendorName: string;
  agreedPrice: number;
  collected: number;
  commission: number;
  vendorPayout: number;
  paidInFull: boolean;
  settlementStatus: 'pending' | 'settled';
  settledAt: string | null;
  eventDate: string;
}

export interface SettlementTotals { commission: number; payout: number; collected: number; pendingPayout: number; }

export function fetchSettlements(token: string): Promise<{ success: boolean; data?: { settlements: Settlement[]; totals: SettlementTotals } }> {
  return authedFetch('/api/v1/settlements', token);
}

export function markSettlement(token: string, bookingId: string, settled: boolean) {
  return authedFetch(`/api/v1/bookings/${bookingId}/settle`, token, { method: 'PUT', body: JSON.stringify({ settled }) });
}

// --- Reviews ---

export function fetchReviews(token: string): Promise<{ success: boolean; data?: { reviews: Review[] } }> {
  return authedFetch('/api/v1/reviews', token);
}

export function deleteReview(token: string, id: string) {
  return authedFetch(`/api/v1/reviews/${id}`, token, { method: 'DELETE' });
}

// --- Guest feedback ---

export function fetchFeedback(token: string): Promise<{ success: boolean; data?: { feedback: EventFeedback[] } }> {
  return authedFetch('/api/v1/feedback', token);
}

export function deleteFeedback(token: string, id: string) {
  return authedFetch(`/api/v1/feedback/${id}`, token, { method: 'DELETE' });
}

// --- Complaints ---

export function fetchComplaints(token: string): Promise<{ success: boolean; data?: { complaints: Complaint[] } }> {
  return authedFetch('/api/v1/complaints', token);
}

export function updateComplaintStatus(token: string, id: string, status: string) {
  return authedFetch(`/api/v1/complaints/${id}`, token, { method: 'PUT', body: JSON.stringify({ status }) });
}

// --- Invitation templates ---

export async function fetchInvitationTemplates(): Promise<{ success: boolean; data?: { templates: InvitationTemplateDoc[] } }> {
  const { json } = await fetchJson('/api/v1/invitation-templates');
  return json;
}

export function addInvitationTemplate(token: string, input: { name: string; category: string; backgroundColor: string }) {
  return authedFetch('/api/v1/invitation-templates', token, { method: 'POST', body: JSON.stringify({ ...input, elements: [] }) });
}

export function deleteInvitationTemplate(token: string, id: string) {
  return authedFetch(`/api/v1/invitation-templates/${id}`, token, { method: 'DELETE' });
}
