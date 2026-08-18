import path from 'path';
import dotenv from 'dotenv';
// Loads JWT_SECRET / JWT_EXPIRES_IN (session lifetime) and MONGODB_URI.
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { connectDB } from '../../packages/shared-utils/db';
import { signToken, authMiddleware, requireRole } from '../../packages/shared-utils/auth';
import { requestLogger } from '../../packages/shared-utils/logging';
import { registerHealthRoute } from '../../packages/shared-utils/health';
import { Role } from '../../packages/shared-types';
import { UserModel } from './models/User';

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors());
app.use(express.json());
app.use(requestLogger('auth-service'));
registerHealthRoute(app, 'auth-service');

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

// 1. Register
app.post('/api/v1/auth/register', async (req: Request, res: Response) => {
  const { name, email, phone, password, role, businessName } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  }

  const existing = await UserModel.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const allowedRoles: Role[] = ['customer', 'vendor'];
  const safeRole: Role = allowedRoles.includes(role) ? role : 'customer';

  const user = await UserModel.create({
    id: `usr-${Date.now()}`,
    name,
    email,
    phone: phone || '',
    role: safeRole,
    businessName: businessName || undefined,
    passwordHash,
  });

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  const { passwordHash: _omit, ...userSafe } = user.toObject();

  return res.status(201).json({
    success: true,
    message: `${safeRole} account registered successfully.`,
    data: { user: userSafe, token },
  });
});

// 2. Login
app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
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
});

// 3. Current user profile — requires a valid token, returns the caller, not a fixed user.
app.get('/api/v1/auth/me', authMiddleware(), async (req: Request, res: Response) => {
  const user = await UserModel.findOne({ id: req.user!.sub });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }
  res.json({ success: true, data: { user } });
});

// 4. Admin-only user directory
app.get('/api/v1/auth/admin/users', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  const users = await UserModel.find().limit(200);
  res.json({ success: true, data: { users, total: users.length } });
});

// 5. Suspend / unsuspend a user account
app.put('/api/v1/auth/admin/users/:id/suspend', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  const user = await UserModel.findOne({ id: req.params.id });
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  user.isSuspended = !user.isSuspended;
  await user.save();
  res.json({ success: true, message: `User ${user.isSuspended ? 'suspended' : 'reinstated'}.`, data: { user } });
});

async function start() {
  await connectDB(process.env.MONGODB_URI, 'auth-service');
  await seedIfEmpty();
  app.listen(PORT, () => {
    console.log(`[Auth Microservice] Running on http://localhost:${PORT}`);
  });
}

start();
