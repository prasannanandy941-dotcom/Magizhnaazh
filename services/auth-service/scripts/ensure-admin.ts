/**
 * Ensure an owner can log into the Admin portal.
 *
 * The demo admin (admin@magizhnaazh.com) is only auto-seeded when the users
 * collection is EMPTY. Once real users exist it is never created, so the
 * advertised admin login returns "Invalid credentials". This script:
 *
 *   1. Creates (or repairs) admin@magizhnaazh.com with role=admin and the
 *      password Passw0rd!  — a reliable password login for the admin portal.
 *   2. Optionally PROMOTES a Google email you own to role=admin, so you can
 *      sign into the admin portal with "Sign in with Google".
 *   3. Reports every admin account and the status of the owner emails.
 *
 * Run on the server (uses this service's own .env -> production DB):
 *   cd services/auth-service && npx tsx scripts/ensure-admin.ts
 *
 * To also make your Google email an admin, pass it as an argument:
 *   cd services/auth-service && npx tsx scripts/ensure-admin.ts you@gmail.com
 *
 * NOTE: one account has exactly ONE role. Promoting an email that is currently
 * a vendor/customer will REPLACE that role with admin (it can no longer log in
 * as a vendor/customer). The script prints the old role before changing it.
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { connectDB } from '../../../packages/shared-utils/db';
import { UserModel } from '../models/User';

const ADMIN_EMAIL = 'admin@magizhnaazh.com';
const ADMIN_PASSWORD = 'Passw0rd!';
// Emails we always report on so you can see whether your Gmail can be an admin.
const OWNER_EMAILS = ['prasannanandy941@gmail.com', 'porulontech@gmail.com'];

async function ensureDefaultAdmin() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existing = await UserModel.findOne({ email: ADMIN_EMAIL }).select('+passwordHash');
  if (existing) {
    existing.role = 'admin';
    existing.passwordHash = hash;
    existing.isVerified = true;
    existing.isSuspended = false;
    await existing.save();
    console.log(`Repaired admin account: ${ADMIN_EMAIL} (role=admin, password reset)`);
  } else {
    await UserModel.create({
      id: `usr-admin-${Date.now()}`,
      name: 'Super Admin',
      email: ADMIN_EMAIL,
      phone: '',
      role: 'admin',
      isVerified: true,
      authProvider: 'password',
      passwordHash: hash,
    });
    console.log(`Created admin account: ${ADMIN_EMAIL}`);
  }
  console.log(`\n  ==> Admin login:  ${ADMIN_EMAIL}   /   ${ADMIN_PASSWORD}\n`);
}

async function promoteToAdmin(rawEmail: string) {
  const email = rawEmail.toLowerCase().trim();
  const existing = await UserModel.findOne({ email }).select('+passwordHash');
  if (existing) {
    console.log(`Promoting ${email}: was role=${existing.role} (${existing.authProvider}) -> admin`);
    existing.role = 'admin';
    existing.isVerified = true;
    existing.isSuspended = false;
    await existing.save();
    console.log(`  ==> ${email} can now sign into the admin portal (Google or its existing password).`);
  } else {
    const randomHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    await UserModel.create({
      id: `usr-admin-${Date.now()}`,
      name: email.split('@')[0],
      email,
      phone: '',
      role: 'admin',
      authProvider: 'google',
      isVerified: true,
      passwordHash: randomHash,
    });
    console.log(`Created NEW admin (Google) account for ${email}.`);
    console.log(`  ==> Sign into the admin portal with "Sign in with Google" using ${email}.`);
  }
}

async function report() {
  const admins = await UserModel.find({ role: 'admin' }, { email: 1, id: 1, authProvider: 1, _id: 0 }).lean();
  console.log(`\nAll admin accounts (${admins.length}):`);
  admins.forEach((a: any) => console.log(`  - ${a.email}  [${a.authProvider || 'password'}]`));

  console.log('\nOwner email status:');
  for (const e of OWNER_EMAILS) {
    const u: any = await UserModel.findOne({ email: e }, { role: 1, authProvider: 1, _id: 0 }).lean();
    console.log(`  - ${e}: ${u ? `exists (role=${u.role}, ${u.authProvider || 'password'})` : 'no account'}`);
  }
}

async function run() {
  await connectDB(process.env.MONGODB_URI, 'ensure-admin');

  await ensureDefaultAdmin();

  const emailArg = process.argv[2];
  if (emailArg) await promoteToAdmin(emailArg);

  await report();
  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch((err) => {
  console.error('ensure-admin failed:', err);
  process.exit(1);
});
