/**
 * Create or repair password-based vendor logins.
 *
 * Run from services/auth-service with:
 *   $env:VENDOR_LOGIN_PASSWORD='your password'
 *   npx tsx scripts/ensure-vendor-login.ts vendor@example.com
 *
 * The password is supplied through the environment so it is not committed to
 * the repository or exposed in the script source.
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { connectDB } from '../../../packages/shared-utils/db';
import { UserModel } from '../models/User';
import { firstPasswordError, isPasswordStrong } from '../../../packages/shared-utils';

const password = process.env.VENDOR_LOGIN_PASSWORD || '';
const emails = process.argv
  .slice(2)
  .map((email) => email.toLowerCase().trim())
  .filter(Boolean);

async function run() {
  if (emails.length === 0) throw new Error('Provide at least one vendor email address.');
  if (!isPasswordStrong(password)) {
    throw new Error(firstPasswordError(password) || 'VENDOR_LOGIN_PASSWORD is not strong enough.');
  }

  await connectDB(process.env.MONGODB_URI, 'ensure-vendor-login');
  const passwordHash = await bcrypt.hash(password, 10);

  for (const email of emails) {
    const existing = await UserModel.findOne({ email }).select('+passwordHash');
    if (existing) {
      existing.role = 'vendor';
      existing.authProvider = 'password';
      existing.passwordHash = passwordHash;
      existing.isVerified = true;
      existing.isSuspended = false;
      await existing.save();
      console.log(`Repaired vendor login: ${email}`);
      continue;
    }

    await UserModel.create({
      id: `usr-vendor-${crypto.randomUUID()}`,
      name: email.split('@')[0],
      email,
      phone: '',
      role: 'vendor',
      authProvider: 'password',
      isVerified: true,
      isSuspended: false,
      passwordHash,
    });
    console.log(`Created vendor login: ${email}`);
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Vendor login provisioning failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
