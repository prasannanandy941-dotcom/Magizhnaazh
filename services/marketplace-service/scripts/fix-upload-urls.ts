/**
 * One-off migration: repair image URLs that were saved pointing at an
 * unreachable host (e.g. http://localhost:8002/uploads/...) so they resolve to
 * the public uploads domain instead. Host-agnostic — it rewrites the host of
 * any `.../uploads/...` URL to PUBLIC base and leaves external URLs
 * (Unsplash, etc.) untouched.
 *
 * Set the same public base the service uses, then run on the server:
 *   PUBLIC_UPLOADS_BASE_URL=https://event-api.porulontech.com \
 *     npx tsx scripts/fix-upload-urls.ts
 * (from services/marketplace-service)
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import mongoose from 'mongoose';
import { connectDB } from '../../../packages/shared-utils/db';
import { serviceUrl } from '../../../packages/shared-utils/serviceUrl';
import { VendorModel } from '../models/Vendor';

const PUBLIC_BASE = serviceUrl(
  process.env.PUBLIC_UPLOADS_BASE_URL || process.env.MARKETPLACE_SERVICE_URL,
  'http://localhost:8002',
);

// Rewrite the host of a `.../uploads/...` URL to PUBLIC_BASE; pass anything else
// through unchanged.
function fixUrl(u: unknown): unknown {
  if (typeof u !== 'string') return u;
  const m = u.match(/^https?:\/\/[^/]+(\/uploads\/.*)$/);
  return m ? `${PUBLIC_BASE}${m[1]}` : u;
}
const fixArr = (a: any): any => (Array.isArray(a) ? a.map(fixUrl) : a);

async function run() {
  if (/localhost|127\.0\.0\.1/.test(PUBLIC_BASE)) {
    console.error(`Refusing to run: PUBLIC base is "${PUBLIC_BASE}". Set PUBLIC_UPLOADS_BASE_URL to the public API URL first.`);
    process.exit(1);
  }
  await connectDB(process.env.MONGODB_URI, 'fix-upload-urls');
  console.log(`Rewriting upload URLs to base: ${PUBLIC_BASE}`);

  const vendors = await VendorModel.find();
  let changed = 0;

  for (const v of vendors) {
    const before = JSON.stringify(v.toObject());

    v.galleryImages = fixArr(v.galleryImages);
    (v as any).galleryVideos = fixArr((v as any).galleryVideos);
    if (v.qrCodeImage) v.qrCodeImage = fixUrl(v.qrCodeImage) as string;

    if (Array.isArray(v.packages)) {
      v.packages.forEach((p: any) => { if (Array.isArray(p.images)) p.images = fixArr(p.images); });
      v.markModified('packages');
    }

    const optImgs = (v as any).offeredOptionImages;
    if (optImgs && typeof optImgs === 'object') {
      for (const k of Object.keys(optImgs)) optImgs[k] = fixArr(optImgs[k]);
      v.markModified('offeredOptionImages');
    }

    const optItems = (v as any).offeredOptionItems;
    if (optItems && typeof optItems === 'object') {
      for (const k of Object.keys(optItems)) {
        if (Array.isArray(optItems[k])) optItems[k].forEach((it: any) => { if (it && it.photo) it.photo = fixUrl(it.photo); });
      }
      v.markModified('offeredOptionItems');
    }

    if (JSON.stringify(v.toObject()) !== before) {
      await v.save();
      changed++;
    }
  }

  console.log(`Vendors scanned: ${vendors.length}. Vendors updated: ${changed}.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
