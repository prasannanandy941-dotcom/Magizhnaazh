import { GATEWAY_URL } from './config';
import type { User } from './types';

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

// --- auth (vendor) ----------------------------------------------------------

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

// Exchange a Google ID token for a vendor session. The backend verifies the
// token's audience against its GOOGLE_CLIENT_ID (the web client id).
export async function googleLogin(idToken: string): Promise<{ user: User; token: string }> {
  const res = await request<AuthResponse>('/api/v1/auth/google', {
    method: 'POST',
    body: { credential: idToken, role: 'vendor' },
  });
  if (!res.data) throw new Error(res.message || 'Google sign-in failed.');
  return res.data;
}

export async function register(input: {
  name: string; // business name for a vendor
  email: string;
  phone?: string;
  password: string;
  otp: string;
}): Promise<{ user: User; token: string }> {
  const res = await request<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: { ...input, businessName: input.name, role: 'vendor' },
  });
  if (!res.data) throw new Error(res.message || 'Registration failed.');
  return res.data;
}
