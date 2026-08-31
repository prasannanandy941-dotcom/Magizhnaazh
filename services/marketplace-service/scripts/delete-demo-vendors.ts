/**
 * One-off cleanup: delete the seeded demo vendor listings.
 *
 * Demo vendors were seeded with userId `usr-vendor-1`, `usr-vendor-2`, … Real
 * vendors that registered through the app get a timestamp-based userId
 * (`usr-<ms>`) and id (`vnd-<ms>`), so matching on the `usr-vendor-<n>` pattern
 * only ever touches the fakes — never a real vendor.
 *
 * Run on the server (uses this service's own .env → production DB):
 *   cd services/marketplace-service && npx tsx scripts/delete-demo-vendors.ts
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import mongoose from 'mongoose';
import { connectDB } from '../../../packages/shared-utils/db';
import { VendorModel } from '../models/Vendor';

const DEMO_FILTER = { userId: { $regex: /^usr-vendor-\d+$/ } };

async function run() {
  await connectDB(process.env.MONGODB_URI, 'demo-vendor-cleanup');

  const total = await VendorModel.countDocuments();
  const demoCount = await VendorModel.countDocuments(DEMO_FILTER);
  console.log(`Vendors in DB: ${total}`);
  console.log(`  demo (usr-vendor-*) to delete: ${demoCount}`);
  console.log(`  real vendors kept:             ${total - demoCount}`);

  if (demoCount === 0) {
    console.log('Nothing to delete.');
  } else {
    const res = await VendorModel.deleteMany(DEMO_FILTER);
    console.log(`Deleted ${res.deletedCount} demo vendor listing(s).`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
