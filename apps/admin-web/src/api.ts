import { User, Vendor, Event } from '../../../packages/shared-types';

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
  if (!res.ok) {
    throw new Error(json.message || 'Request failed.');
  }
  return json;
}

export async function fetchVendors(): Promise<{ success: boolean; data?: { vendors: Vendor[] } }> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/vendors`);
  return res.json();
}

export function toggleVendorVerification(token: string, vendorId: string) {
  return authedFetch(`/api/v1/vendors/${vendorId}/verify`, token, { method: 'PUT' });
}

export interface AdminMetrics {
  totalBookings: number;
  grossBookingVolume: number;
  totalAdvanceCollected: number;
  platformCommissionEarned: number;
}

export async function fetchAdminMetrics(token: string): Promise<{ success: boolean; data?: AdminMetrics }> {
  return authedFetch('/api/v1/bookings/admin/metrics', token);
}

export async function fetchEvents(token: string): Promise<{ success: boolean; data?: { events: Event[] } }> {
  return authedFetch('/api/v1/events', token);
}

export interface AdminUser extends User {}

export async function fetchAllUsers(token: string): Promise<{ success: boolean; data?: { users: AdminUser[]; total: number } }> {
  return authedFetch('/api/v1/auth/admin/users', token);
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
