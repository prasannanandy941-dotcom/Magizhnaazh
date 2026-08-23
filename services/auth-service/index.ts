import path from 'path';
import dotenv from 'dotenv';
// Loads JWT_SECRET / JWT_EXPIRES_IN (session lifetime) and MONGODB_URI.
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

import crypto from 'crypto';
import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
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

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
  if (count > 0) return;

  const demoPasswordHash = await bcrypt.hash('Passw0rd!', 10);
  await UserModel.create([
    { id: 'usr-customer-1', name: 'Felix Kumar', email: 'customer@magizhnaazh.com', phone: '+91 9840112233', role: 'customer', isVerified: true, passwordHash: demoPasswordHash },
    { id: 'usr-vendor-1', name: 'Leela Management', email: 'vendor@magizhnaazh.com', phone: '+91 44 33661234', role: 'vendor', businessName: 'The Leela Palace Grand Ballroom', isVerified: true, passwordHash: demoPasswordHash },
    { id: 'usr-admin-1', name: 'Super Admin', email: 'admin@magizhnaazh.com', phone: '+91 9999900000', role: 'admin', isVerified: true, passwordHash: demoPasswordHash },
  ]);
  console.log('[auth-service] Seeded demo users (password: Passw0rd!).');
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

    let emailSent = false;
    if (process.env.SMTP_USER) {
      try {
        await transporter.sendMail({
          from: `"Magizhnaazh Platform" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: emailStr,
          subject: "Email Verification Code",
          text: `Your verification code is: ${code}. It is valid for 10 minutes.`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 500px;">
              <h2 style="color: #d4af37;">Email Verification</h2>
              <p>Thank you for registering. Please enter the following 6-digit code to complete your signup:</p>
              <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 12px; background: #f3f4f6; text-align: center; border-radius: 4px; margin: 20px 0; color: #111827;">
                ${code}
              </div>
              <p style="font-size: 12px; color: #6b7280;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
            </div>
          `
        });
        emailSent = true;
      } catch (err) {
        console.error("Nodemailer failed to send email:", err);
      }
    }

    res.json({
      success: true,
      message: emailSent
        ? 'Verification code sent to your email.'
        : 'Verification code generated (printed to server console).',
      // Only expose the code in the response when we could NOT email it (local
      // dev without SMTP). Once real email works, the code goes only to the
      // inbox — never leak it over the API in production.
      ...(emailSent ? {} : { _devOtp: code }),
    });

  } catch (err: any) {
    console.error('Failed to send OTP:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
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

    let emailSent = false;
    if (process.env.SMTP_USER) {
      try {
        await transporter.sendMail({
          from: `"Magizhnaazh Platform" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: emailStr,
          subject: "Password Reset Code",
          text: `Your password reset code is: ${code}. It is valid for 10 minutes.`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 500px;">
              <h2 style="color: #d4af37;">Password Reset</h2>
              <p>You requested to reset your password. Please enter the following 6-digit code in the app to proceed:</p>
              <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 12px; background: #f3f4f6; text-align: center; border-radius: 4px; margin: 20px 0; color: #111827;">
                ${code}
              </div>
              <p style="font-size: 12px; color: #6b7280;">This code is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
            </div>
          `
        });
        emailSent = true;
      } catch (err) {
        console.error("Nodemailer failed to send email:", err);
      }
    }

    res.json({
      success: true,
      message: emailSent
        ? 'Verification code sent to your email.'
        : 'Verification code generated (printed to server console).',
      // Only expose the code when it could NOT be emailed (local dev, no SMTP).
      ...(emailSent ? {} : { _devOtp: code }),
    });

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
    const { credential, role } = req.body;
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

async function start() {
  try {
    await connectDB(process.env.MONGODB_URI, 'auth-service');
    await seedIfEmpty();
  } catch (err: any) {
    console.error(`[Auth Microservice] Failed to connect to database:`, err.message);
  }

  app.listen(PORT, () => {
    console.log(`[Auth Microservice] Running on http://localhost:${PORT}`);
  });
}

start();
