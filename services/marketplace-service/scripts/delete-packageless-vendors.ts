/**
 * One-off cleanup: delete vendor listings that have no packages.
 *
 * A vendor that registered but never built a single package is an unfinished /
 * test listing — it shows on the customer marketplace as "0 Packages" with a
 * "Starting from ₹25,000" placeholder. This removes those. Any vendor that has
 * added at least one package is left untouched.
 *
 * Dry-run by default (prints what it would delete). Pass --apply to delete.
 *
 * Run on the server (uses this service's own .env → production DB):
 *   cd services/marketplace-service && npx tsx scripts/delete-packageless-vendors.ts          # preview
 *   cd services/marketplace-service && npx tsx scripts/delete-packageless-vendors.ts --apply  # delete
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import mongoose from 'mongoose';
import { connectDB } from '../../../packages/shared-utils/db';
import { VendorModel } from '../models/Vendor';

const APPLY = process.argv.includes('--apply');
const NO_PACKAGES_FILTER = {
  $or: [{ packages: { $exists: false } }, { packages: { $size: 0 } }],
};

async function run() {
  await connectDB(process.env.MONGODB_URI, 'packageless-vendor-cleanup');

  const total = await VendorModel.countDocuments();
  const doomed = await VendorModel.find(NO_PACKAGES_FILTER, {
    id: 1,
    businessName: 1,
    category: 1,
    userId: 1,
    _id: 0,
  }).lean();

  console.log(`Vendors in DB: ${total}`);
  console.log(`  no-package listings: ${doomed.length}`);
  console.log(`  vendors kept:        ${total - doomed.length}`);
  doomed.forEach((v: any) =>
    console.log(`  - ${v.businessName} [${v.category}] (${v.id} / ${v.userId})`)
  );

  if (doomed.length === 0) {
    console.log('Nothing to delete.');
  } else if (!APPLY) {
    console.log('\nDry run — re-run with --apply to delete the listings above.');
  } else {
    const res = await VendorModel.deleteMany(NO_PACKAGES_FILTER);
    console.log(`\nDeleted ${res.deletedCount} no-package vendor listing(s).`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
