/**
 * One-off data fix: vendor registration used to hardcode `isVerified: true` on
 * every signup, bypassing admin approval. That bug is fixed in index.ts, but
 * vendors who registered before the fix are still sitting in the DB with
 * isVerified: true despite `verification.status` never having reached
 * 'verified' via the real admin approval endpoint. This resets those vendors
 * back to unverified so the badge only shows for admin-approved vendors.
 *
 * Demo vendors (userId `usr-vendor-<n>`) are skipped — they're intentionally
 * pre-verified sample data, not affected by the real registration bug.
 *
 * Run on the server (uses this service's own .env → production DB):
 *   cd services/marketplace-service && npx tsx scripts/reset-unapproved-verification.ts
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import mongoose from 'mongoose';
import { connectDB } from '../../../packages/shared-utils/db';
import { VendorModel } from '../models/Vendor';

const FILTER = {
  isVerified: true,
  'verification.status': { $ne: 'verified' },
  userId: { $not: { $regex: /^usr-vendor-\d+$/ } },
};

async function run() {
  await connectDB(process.env.MONGODB_URI, 'reset-unapproved-verification');

  const total = await VendorModel.countDocuments();
  const affected = await VendorModel.find(FILTER).select('id businessName contactEmail');
  console.log(`Vendors in DB: ${total}`);
  console.log(`Auto-verified-but-never-admin-approved vendors to reset: ${affected.length}`);
  affected.forEach((v) => console.log(`  - ${v.id}  ${v.businessName}  (${v.contactEmail})`));

  if (affected.length === 0) {
    console.log('Nothing to reset.');
  } else {
    const res = await VendorModel.updateMany(FILTER, {
      $set: { isVerified: false, 'verification.status': 'unverified' },
    });
    console.log(`Reset ${res.modifiedCount} vendor(s) to unverified.`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
