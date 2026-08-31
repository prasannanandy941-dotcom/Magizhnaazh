/**
 * One-off cleanup: delete the seeded demo vendor login account.
 *
 * The demo vendor account was seeded with id `usr-vendor-1`
 * (vendor@magizhnaazh.com). Real vendors that registered through the app get a
 * timestamp-based id (`usr-<ms>`), so matching on the `usr-vendor-<n>` pattern
 * only ever removes the seeded demo login — never a real account.
 *
 * Run on the server (uses this service's own .env → production DB):
 *   cd services/auth-service && npx tsx scripts/delete-demo-vendor-login.ts
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import mongoose from 'mongoose';
import { connectDB } from '../../../packages/shared-utils/db';
import { UserModel } from '../models/User';

const DEMO_VENDOR_LOGIN = { id: { $regex: /^usr-vendor-\d+$/ }, role: 'vendor' };

async function run() {
  await connectDB(process.env.MONGODB_URI, 'demo-login-cleanup');

  const matches = await UserModel.find(DEMO_VENDOR_LOGIN, { id: 1, email: 1, _id: 0 }).lean();
  console.log(`Demo vendor login(s) to delete: ${matches.length}`);
  matches.forEach((m: any) => console.log(`  - ${m.email} (${m.id})`));

  if (matches.length > 0) {
    const res = await UserModel.deleteMany(DEMO_VENDOR_LOGIN);
    console.log(`Deleted ${res.deletedCount} demo vendor login(s).`);
  } else {
    console.log('Nothing to delete.');
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
