import { User } from '../../../packages/shared-types';

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
