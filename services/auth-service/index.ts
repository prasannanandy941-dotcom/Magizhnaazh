import path from 'path';
import dotenv from 'dotenv';
// Loads JWT_SECRET / JWT_EXPIRES_IN (session lifetime) and MONGODB_URI.
dotenv.config({ path: path.resolve(__dirname, '.env') });

import crypto from 'crypto';
import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { connectDB } from '../../packages/shared-utils/db';
import { signToken, authMiddleware, requireRole } from '../../packages/shared-utils/auth';
import { requestLogger } from '../../packages/shared-utils/logging';
import { registerHealthRoute } from '../../packages/shared-utils/health';
import { isPasswordStrong, firstPasswordError } from '../../packages/shared-utils';
import { Role } from '../../packages/shared-types';
import { UserModel } from './models/User';
import { OtpModel } from './models/Otp';

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors());
app.use(express.json());
app.use(requestLogger('auth-service'));
registerHealthRoute(app, 'auth-service');

let rawSmtpHost = (process.env.SMTP_HOST || 'smtp.hostinger.com').trim();
// 'mail.porulontech.com' is an internal cPanel/hPanel alias that does not resolve in public DNS.
// Porulontech mail is hosted on Hostinger (MX mx1.hostinger.com), whose canonical public SMTP is smtp.hostinger.com.
if (rawSmtpHost === 'mail.porulontech.com' || rawSmtpHost === 'smtp.ethereal.email') {
  rawSmtpHost = 'smtp.hostinger.com';
}
const smtpHost = rawSmtpHost;
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

const smtpUser = process.env.SMTP_USER || 'info@porulontech.com';
const verifiedHostingerPass = 'Porulon7@4admin';
const smtpPass = process.env.SMTP_PASS || verifiedHostingerPass;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 5000, // 5s to open TCP/TLS
  greetingTimeout: 5000,   // 5s for greeting
  socketTimeout: 8000,     // 8s socket timeout
});

// Fallback transporter on alternative port (e.g. 587 if 465 is default, or 465 if 587 is default)
const fallbackPort = smtpPort === 465 ? 587 : 465;
const fallbackTransporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: fallbackPort,
  secure: fallbackPort === 465,
  auth: {
    user: smtpUser,
    pass: verifiedHostingerPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 8000,
});

// The visible "from" address on OTP/reset emails. Reuses SMTP_FROM so a single
// value drives both the SMTP and HTTP-API paths.
const EMAIL_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@porulontech.com';
const EMAIL_FROM_NAME = 'Magizhnaazh Platform';

// Single email sender used by every OTP flow. Prefers Brevo HTTPS API if key is
// present, then primary SMTP, then fallback port SMTP.
async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  // 1. Brevo HTTPS API — the reliable path on platforms blocking outbound SMTP.
  if (process.env.BREVO_API_KEY) {
    try {
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { email: EMAIL_FROM, name: EMAIL_FROM_NAME },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });
      if (resp.ok) {
        console.log(`[email] Successfully sent via Brevo API to ${to}`);
        return true;
      }
      const errBody = await resp.text().catch(() => '');
      console.error(`[email] Brevo API send failed (HTTP ${resp.status}): ${errBody}`);
    } catch (err) {
      console.error('[email] Brevo API request error:', err);
    }
  }

  // 2. Primary SMTP
  if (smtpUser) {
    try {
      const info = await transporter.sendMail({
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
        to,
        subject,
        text,
        html,
      });
      console.log(`[email] Successfully sent via primary SMTP (${smtpHost}:${smtpPort}) to ${to}: ${info.messageId}`);
      return true;
    } catch (err: any) {
      console.error(`[email] Primary SMTP (${smtpHost}:${smtpPort}) failed:`, err?.message || err);
    }

    // 3. Fallback SMTP port (e.g. if 465 is blocked by VPS provider, try 587)
    try {
      console.log(`[email] Retrying via fallback SMTP (smtp.hostinger.com:${fallbackPort})...`);
      const info = await fallbackTransporter.sendMail({
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
        to,
        subject,
        text,
        html,
      });
      console.log(`[email] Successfully sent via fallback SMTP (smtp.hostinger.com:${fallbackPort}) to ${to}: ${info.messageId}`);
      return true;
    } catch (fallbackErr: any) {
      console.error(`[email] Fallback SMTP (smtp.hostinger.com:${fallbackPort}) failed:`, fallbackErr?.message || fallbackErr);
    }
  }

  return false;
}

const EMAIL_CONFIGURED = !!(process.env.BREVO_API_KEY || process.env.SMTP_USER);

// Sends email with a hard timeout limit (~4.5s) so HTTP clients never hang.
// Returns whether the message was accepted for delivery.
async function sendEmailWithTimeout(
  to: string,
  subject: string,
  html: string,
  text: string,
  timeoutMs: number = 4500
): Promise<{ sent: boolean; reason?: string }> {
  if (!EMAIL_CONFIGURED) {
    return { sent: false, reason: 'No email provider configured.' };
  }

  const sendPromise = sendEmail(to, subject, html, text).then(
    (ok) => ({ sent: ok, reason: ok ? undefined : 'Email delivery rejected or failed by provider' }),
    (err) => ({ sent: false, reason: err?.message || 'Mail delivery exception' })
  );

  const timeoutPromise = new Promise<{ sent: boolean; reason: string }>((resolve) =>
    setTimeout(() => resolve({ sent: false, reason: 'Email delivery timed out' }), timeoutMs)
  );

  return Promise.race([sendPromise, timeoutPromise]);
}

const otpEmailHtml = (heading: string, intro: string, code: string, footer: string) => `
  <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 500px;">
    <h2 style="color: #d4af37;">${heading}</h2>
    <p>${intro}</p>
    <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 12px; background: #f3f4f6; text-align: center; border-radius: 4px; margin: 20px 0; color: #111827;">
      ${code}
    </div>
    <p style="font-size: 12px; color: #6b7280;">${footer}</p>
  </div>
`;

// Verify a Google Identity Services ID token (the `credential` the browser gets
// from the "Sign in with Google" button). We call Google's tokeninfo endpoint,
// which validates the token's signature and expiry for us, then we confirm the
// audience matches OUR client id and that the email is verified. Returns the
// decoded profile on success, or null if the token is missing/invalid or Google
// sign-in isn't configured. (Zero extra npm deps — uses global fetch on Node 18+.)
interface GoogleProfile { email: string; name?: string; picture?: string; sub: string }
async function verifyGoogleIdToken(credential: string): Promise<GoogleProfile | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.warn('[auth-service] GOOGLE_CLIENT_ID not set — Google sign-in is disabled.');
    return null;
  }
  try {
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!resp.ok) {
      console.warn(`[google] tokeninfo returned HTTP ${resp.status} — token likely invalid/expired.`);
      return null;
    }
    const data: any = await resp.json();
    // Token must have been minted for OUR app, and the email must be verified.
    if (data.aud !== clientId) {
      console.warn(`[google] audience mismatch.\n  token aud:  ${data.aud}\n  expected:   ${clientId}`);
      return null;
    }
    if (data.email_verified !== true && data.email_verified !== 'true') {
      console.warn(`[google] email not verified: ${data.email} (email_verified=${data.email_verified})`);
      return null;
    }
    if (!data.email) {
      console.warn('[google] token had no email.');
      return null;
    }
    return { email: data.email, name: data.name, picture: data.picture, sub: data.sub };
  } catch (err) {
    console.error('[auth-service] Google token verification failed:', err);
    return null;
  }
}

async function seedIfEmpty() {
  const count = await UserModel.countDocuments();
  const demoPasswordHash = await bcrypt.hash('Passw0rd!', 10);
  if (count === 0) {
    await UserModel.create([
      { id: 'usr-customer-1', name: 'Felix Kumar', email: 'customer@magizhnaazh.com', phone: '+91 9840112233', role: 'customer', isVerified: true, passwordHash: demoPasswordHash },
      { id: 'usr-vendor-1', name: 'Leela Management', email: 'vendor@magizhnaazh.com', phone: '+91 44 33661234', role: 'vendor', businessName: 'The Leela Palace Grand Ballroom', isVerified: true, passwordHash: demoPasswordHash },
      { id: 'usr-admin-1', name: 'Super Admin', email: 'admin@magizhnaazh.com', phone: '+91 9999900000', role: 'admin', isVerified: true, passwordHash: demoPasswordHash },
    ]);
    console.log('[auth-service] Seeded demo users (password: Passw0rd!).');
  } else {
    const adminUser = await UserModel.findOne({ email: 'admin@magizhnaazh.com' });
    if (!adminUser) {
      await UserModel.create({
        id: `usr-admin-1`,
        name: 'Super Admin',
        email: 'admin@magizhnaazh.com',
        phone: '+91 9999900000',
        role: 'admin',
        isVerified: true,
        passwordHash: demoPasswordHash,
      });
      console.log('[auth-service] Seeded missing super admin account (admin@magizhnaazh.com).');
    }
  }
}

// 0. Send OTP Verification Code
app.post('/api/v1/auth/send-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const emailStr = String(email).toLowerCase().trim();

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: emailStr });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await OtpModel.findOneAndUpdate(
      { email: emailStr },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    console.log(`[OTP DEBUG] Verification code for ${emailStr}: ${code}`);

    const delivery = await sendEmailWithTimeout(
      emailStr,
      'Email Verification Code',
      otpEmailHtml(
        'Email Verification',
        'Thank you for registering. Please enter the following 6-digit code to complete your signup:',
        code,
        'This code is valid for 10 minutes. If you did not request this code, please ignore this email.'
      ),
      `Your verification code is: ${code}. It is valid for 10 minutes.`,
      4500
    );

    if (delivery.sent) {
      res.json({
        success: true,
        message: 'Verification code sent to your email. (Please check your Inbox and Spam/Junk folder)',
      });
    } else {
      console.error(`[OTP] Email delivery failed for ${emailStr}: ${delivery.reason}`);
      res.status(500).json({
        success: false,
        message: 'Failed to deliver verification code to your email. Please try again in a moment.',
      });
    }

  } catch (err: any) {
    console.error('Failed to send OTP:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
});

// 0b. Check an OTP WITHOUT consuming it — lets the signup form tell the user
// immediately whether the code they typed is correct, before they submit.
// Registration / password-reset still verify (and delete) the OTP themselves,
// so this is purely for instant feedback and can't be used to bypass anything.
app.post('/api/v1/auth/verify-otp', async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, valid: false, message: 'Email and OTP are required.' });
  }
  const emailStr = String(email).toLowerCase().trim();
  const record = await OtpModel.findOne({ email: emailStr });
  // Expired codes are auto-removed by the TTL index, so a missing record = invalid.
  const valid = !!record && record.code === String(otp).trim();
  res.json({ success: true, valid, message: valid ? 'Code verified.' : 'Incorrect or expired code.' });
});

// 1. Register
app.post('/api/v1/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role, businessName, otp } = req.body;
    if (!email || !name || !password || !otp) {
      return res.status(400).json({ success: false, message: 'Name, email, password and verification code (OTP) are required.' });
    }

    const emailStr = String(email).toLowerCase().trim();

    // Verify OTP
    const otpRecord = await OtpModel.findOne({ email: emailStr });
    if (!otpRecord || otpRecord.code !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code (OTP).' });
    }

    // New accounts must use a strong password (login is exempt, so existing accounts are unaffected).
    if (!isPasswordStrong(password)) {
      return res.status(400).json({ success: false, message: firstPasswordError(password) || 'Password is too weak.' });
    }

    const existing = await UserModel.findOne({ email: emailStr });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const allowedRoles: Role[] = ['customer', 'vendor'];
    const safeRole: Role = allowedRoles.includes(role) ? role : 'customer';

    const user = await UserModel.create({
      id: `usr-${Date.now()}`,
      name,
      email: emailStr,
      phone: phone || '',
      role: safeRole,
      businessName: businessName || undefined,
      passwordHash,
      isVerified: true
    });

    // Delete the OTP once verified so it cannot be reused
    await OtpModel.deleteOne({ email: emailStr });

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    const { passwordHash: _omit, ...userSafe } = user.toObject();

    return res.status(201).json({
      success: true,
      message: `${safeRole} account registered successfully.`,
      data: { user: userSafe, token },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
});

// 1b. Forgot Password - Send OTP
app.post('/api/v1/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const emailStr = String(email).toLowerCase().trim();

    // Check if user exists
    const user = await UserModel.findOne({ email: emailStr });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account with this email address exists.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, message: 'This account has been suspended. Contact support.' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await OtpModel.findOneAndUpdate(
      { email: emailStr },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    console.log(`[OTP DEBUG] Forgot Password OTP for ${emailStr}: ${code}`);

    const delivery = await sendEmailWithTimeout(
      emailStr,
      'Password Reset Code',
      otpEmailHtml(
        'Password Reset',
        'You requested to reset your password. Please enter the following 6-digit code in the app to proceed:',
        code,
        'This code is valid for 10 minutes. If you did not request a password reset, please ignore this email.'
      ),
      `Your password reset code is: ${code}. It is valid for 10 minutes.`,
      4500
    );

    if (delivery.sent) {
      res.json({
        success: true,
        message: 'Verification code sent to your email. (Please check your Inbox and Spam/Junk folder)',
      });
    } else {
      console.error(`[OTP] Forgot-password email delivery failed for ${emailStr}: ${delivery.reason}`);
      res.status(500).json({
        success: false,
        message: 'Failed to deliver verification code to your email. Please try again in a moment.',
      });
    }

  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
});

// 1c. Reset Password
app.post('/api/v1/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, verification code (OTP), and new password are required.' });
    }

    const emailStr = String(email).toLowerCase().trim();

    // Verify OTP
    const otpRecord = await OtpModel.findOne({ email: emailStr });
    if (!otpRecord || otpRecord.code !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code (OTP).' });
    }

    // Verify password strength
    if (!isPasswordStrong(newPassword)) {
      return res.status(400).json({ success: false, message: firstPasswordError(newPassword) || 'Password is too weak.' });
    }

    // Check if user exists
    const user = await UserModel.findOne({ email: emailStr });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();

    // Delete the OTP once verified so it cannot be reused
    await OtpModel.deleteOne({ email: emailStr });

    res.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.'
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
});

// 2. Login
app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await UserModel.findOne({ email: String(email).toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, message: 'This account has been suspended. Contact platform support.' });
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    const { passwordHash: _omit, ...userSafe } = user.toObject();

    return res.json({
      success: true,
      message: 'Authentication successful.',
      data: { user: userSafe, token },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
});

// 2b. Google Sign-In — one-click login/signup with a Google account.
// The browser sends the Google-issued `credential` (an ID token) plus the
// `role` to use if this is the account's first sign-in. Returning users log in
// with their existing role; new users get an account created on the spot.
app.post('/api/v1/auth/google', async (req: Request, res: Response) => {
  try {
    const { credential, role, loginOnly } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Missing Google credential.' });
    }

    const profile = await verifyGoogleIdToken(String(credential));
    if (!profile) {
      return res.status(401).json({ success: false, message: 'Could not verify Google sign-in. Please try again.' });
    }

    const emailStr = profile.email.toLowerCase().trim();
    let user = await UserModel.findOne({ email: emailStr });
    let isNewUser = false;

    // `loginOnly` = authenticate an EXISTING account only, never create one.
    // Used by the admin portal so a stray Google account can't self-provision
    // (admin accounts are created by the platform team, not via sign-in).
    if (!user && loginOnly) {
      return res.status(401).json({ success: false, message: 'No account found for this Google email.' });
    }

    if (user) {
      if (user.isSuspended) {
        return res.status(403).json({ success: false, message: 'This account has been suspended. Contact platform support.' });
      }
      // Backfill an avatar the first time an existing account signs in via Google.
      if (!user.avatarUrl && profile.picture) {
        user.avatarUrl = profile.picture;
        await user.save();
      }
    } else {
      isNewUser = true;
      const allowedRoles: Role[] = ['customer', 'vendor'];
      const safeRole: Role = allowedRoles.includes(role) ? role : 'customer';
      // Google-managed accounts have no password the user knows. We store a
      // random, unguessable hash so the schema's required field is satisfied and
      // nobody can password-login as them; they can set a real password later
      // via Forgot Password if they ever want one.
      const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      user = await UserModel.create({
        id: `usr-${Date.now()}`,
        name: profile.name || emailStr.split('@')[0],
        email: emailStr,
        phone: '',
        role: safeRole,
        avatarUrl: profile.picture,
        authProvider: 'google',
        isVerified: true,
        passwordHash: randomPasswordHash,
      });
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    const { passwordHash: _omit, ...userSafe } = user.toObject();

    return res.json({
      success: true,
      message: 'Authentication successful.',
      data: { user: userSafe, token, isNewUser },
    });
  } catch (err: any) {
    console.error('Google sign-in error:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
});

// 3. Current user profile
app.get('/api/v1/auth/me', authMiddleware(), async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findOne({ id: req.user!.sub });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, data: { user } });
  } catch (err: any) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
});

// 4. Admin-only user directory
app.get('/api/v1/auth/admin/users', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find().limit(200);
    res.json({ success: true, data: { users, total: users.length } });
  } catch (err: any) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
});

// 5. Suspend / unsuspend a user account
app.put('/api/v1/auth/admin/users/:id/suspend', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.isSuspended = !user.isSuspended;
    await user.save();
    res.json({ success: true, message: `User ${user.isSuspended ? 'suspended' : 'reinstated'}.`, data: { user } });
  } catch (err: any) {
    console.error('Suspend user error:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
});

app.get('/api/v1/auth/email-diagnostic', async (_req: Request, res: Response) => {
  try {
    const diagnostic: any = {
      emailConfigured: EMAIL_CONFIGURED,
      emailFrom: EMAIL_FROM,
      hasBrevoKey: !!process.env.BREVO_API_KEY,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser: smtpUser ? `${smtpUser.slice(0, 3)}***` : 'not-set',
      hasSmtpPass: !!smtpPass,
    };

    if (smtpUser) {
      try {
        await transporter.verify();
        diagnostic.smtpVerifyPrimary = 'OK';
      } catch (err: any) {
        diagnostic.smtpVerifyPrimary = `FAILED: ${err?.message || err}`;
      }
      try {
        await fallbackTransporter.verify();
        diagnostic.smtpVerifyFallback = 'OK';
      } catch (err: any) {
        diagnostic.smtpVerifyFallback = `FAILED: ${err?.message || err}`;
      }
    }

    res.json({ success: true, diagnostic });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Diagnostic error' });
  }
});

async function start() {
  try {
    await connectDB(process.env.MONGODB_URI, 'auth-service');
    await seedIfEmpty();
  } catch (err: any) {
    console.error(`[Auth Microservice] Failed to connect to database:`, err.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`[Auth Microservice] Running on http://localhost:${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[Auth Microservice] Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      try {
        await mongoose.connection.close();
      } catch (err: any) {
        console.error('[Auth Microservice] Error closing MongoDB connection:', err.message);
      }
      console.log('[Auth Microservice] Shutdown complete.');
      process.exit(0);
    });

    // Force exit if graceful shutdown hangs
    setTimeout(() => {
      console.error('[Auth Microservice] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
