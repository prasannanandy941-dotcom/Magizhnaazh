import { User } from '../../../packages/shared-types';

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
  role: 'customer' | 'vendor';
}): Promise<AuthResponse> {
  return postJson('/api/v1/auth/register', input);
}
