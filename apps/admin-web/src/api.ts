import {
  User,
  Vendor,
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

export const GATEWAY_URL = 'http://localhost:8000';

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: { user: User; token: string };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Request failed.');
  }
  return json;
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
    localStorage.removeItem('magizhnaazh_admin_user');
    localStorage.removeItem('magizhnaazh_admin_token');
    window.location.reload();
    throw new Error('Session expired — please sign in again.');
  }
  if (!res.ok) {
    throw new Error(json.message || 'Request failed.');
  }
  return json;
}

// --- Dashboard ---

export async function fetchVendors(): Promise<{ success: boolean; data?: { vendors: Vendor[] } }> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/vendors`);
  return res.json();
}

export function toggleVendorVerification(token: string, vendorId: string) {
  return authedFetch(`/api/v1/vendors/${vendorId}/verify`, token, { method: 'PUT' });
}

export function toggleVendorSuspension(token: string, vendorId: string) {
  return authedFetch(`/api/v1/vendors/${vendorId}/suspend`, token, { method: 'PUT' });
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

// --- Users ---

export interface AdminUser extends User {}

export function fetchAllUsers(token: string): Promise<{ success: boolean; data?: { users: AdminUser[]; total: number } }> {
  return authedFetch('/api/v1/auth/admin/users', token);
}

export function toggleUserSuspension(token: string, userId: string) {
  return authedFetch(`/api/v1/auth/admin/users/${userId}/suspend`, token, { method: 'PUT' });
}

// --- Categories ---

export function fetchCategories(): Promise<{ success: boolean; data?: { categories: Category[] } }> {
  return fetch(`${GATEWAY_URL}/api/v1/categories`).then((r) => r.json());
}

export function addCategory(token: string, name: string) {
  return authedFetch('/api/v1/categories', token, { method: 'POST', body: JSON.stringify({ name }) });
}

export function deleteCategory(token: string, id: string) {
  return authedFetch(`/api/v1/categories/${id}`, token, { method: 'DELETE' });
}

// --- Locations ---

export function fetchLocations(): Promise<{ success: boolean; data?: { locations: City[] } }> {
  return fetch(`${GATEWAY_URL}/api/v1/locations`).then((r) => r.json());
}

export function addLocation(token: string, name: string, state: string) {
  return authedFetch('/api/v1/locations', token, { method: 'POST', body: JSON.stringify({ name, state }) });
}

export function deleteLocation(token: string, id: string) {
  return authedFetch(`/api/v1/locations/${id}`, token, { method: 'DELETE' });
}

// --- Banners ---

export function fetchBanners(): Promise<{ success: boolean; data?: { banners: Banner[] } }> {
  return fetch(`${GATEWAY_URL}/api/v1/banners`).then((r) => r.json());
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

export function updateSettings(token: string, input: { commissionRate?: number; advanceDepositRate?: number }) {
  return authedFetch('/api/v1/settings', token, { method: 'PUT', body: JSON.stringify(input) });
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

export function fetchInvitationTemplates(): Promise<{ success: boolean; data?: { templates: InvitationTemplateDoc[] } }> {
  return fetch(`${GATEWAY_URL}/api/v1/invitation-templates`).then((r) => r.json());
}

export function addInvitationTemplate(token: string, input: { name: string; category: string; backgroundColor: string }) {
  return authedFetch('/api/v1/invitation-templates', token, { method: 'POST', body: JSON.stringify({ ...input, elements: [] }) });
}

export function deleteInvitationTemplate(token: string, id: string) {
  return authedFetch(`/api/v1/invitation-templates/${id}`, token, { method: 'DELETE' });
}
