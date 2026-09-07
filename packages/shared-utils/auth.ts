import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { Role } from '../shared-types';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set. Copy .env.example to .env and set a shared secret.');
  }
  return secret;
}

// A short, non-reversible fingerprint of the runtime JWT secret. Logged so we can
// confirm every service is verifying with the SAME secret (matching .env files do
// not guarantee matching *runtime* env if a process was started before a sync).
// It reveals nothing about the secret itself.
function secretFingerprint(): string {
  try {
    return crypto.createHash('sha256').update(getJwtSecret()).digest('hex').slice(0, 10);
  } catch {
    return 'MISSING';
  }
}

export function signToken(payload: AuthTokenPayload): string {
  // Default to a 7-day session so tokens don't expire mid-use. A very short
  // lifetime (the old 2h default) silently logs users out and — before the
  // client learned to re-auth on 401 — left them stuck with a dead token.
  return jwt.sign(payload, getJwtSecret(), { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/**
 * Verifies the Authorization: Bearer token independently in each service
 * (stateless JWT, shared secret) rather than trusting gateway-forwarded headers.
 */
let loggedFingerprint = false;

export function authMiddleware(required = true) {
  // Log the runtime secret fingerprint once per service process, so the logs show
  // whether the signing service (auth) and the verifying service share a secret.
  if (!loggedFingerprint) {
    loggedFingerprint = true;
    console.log(`[auth] JWT secret fingerprint at startup: ${secretFingerprint()}`);
  }
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      if (required) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      return next();
    }

    try {
      req.user = verifyToken(token);
      next();
    } catch (err: any) {
      // Surface the real reason (invalid signature vs expired vs malformed) plus the
      // verifying secret's fingerprint — swallowing this is what made the failure
      // impossible to diagnose.
      console.warn(
        `[auth] token rejected on ${req.method} ${req.originalUrl}: ${err?.name || 'Error'} — ${err?.message || 'verify failed'} (verify secret ${secretFingerprint()})`
      );
      return res.status(401).json({ success: false, message: 'Invalid or expired token.', code: err?.name });
    }
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions for this action.' });
    }
    next();
  };
}
