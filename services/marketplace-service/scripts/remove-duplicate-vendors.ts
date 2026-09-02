import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import mongoose from 'mongoose';
import { connectDB } from '../../../packages/shared-utils/db';
import { VendorModel } from '../models/Vendor';

function calculateScore(v: any): number {
  let score = 0;
  if (v.packages && Array.isArray(v.packages) && v.packages.length > 0) score += v.packages.length * 10;
  if (v.deals && Array.isArray(v.deals) && v.deals.length > 0) score += v.deals.length * 5;
  if (v.galleryImages && Array.isArray(v.galleryImages) && v.galleryImages.length > 1) score += v.galleryImages.length * 2;
  if (v.ratingAverage && v.ratingAverage > 0) score += v.ratingAverage * 5;
  if (v.reviewCount && v.reviewCount > 0) score += v.reviewCount * 2;
  if (v.isVerified) score += 5;
  if (v.description && v.description.length > 20) score += 3;
  if (v.contactEmail && v.contactEmail.includes('@')) score += 1;
  return score;
}

async function run() {
  await connectDB(process.env.MONGODB_URI, 'remove-duplicate-vendors');

  const totalBefore = await VendorModel.countDocuments();
  console.log(`Total vendors in database before cleanup: ${totalBefore}`);

  const allVendors = await VendorModel.find({}).sort({ createdAt: -1 }).lean();

  // Group 1: By normalized businessName + category
  const nameCategoryGroups: Record<string, any[]> = {};
  // Group 2: By userId (each vendor user account should only have 1 listing)
  const userGroups: Record<string, any[]> = {};

  allVendors.forEach((v: any) => {
    const nameKey = `${(v.businessName || '').toLowerCase().trim()}||${(v.category || '').toLowerCase().trim()}`;
    if (!nameCategoryGroups[nameKey]) nameCategoryGroups[nameKey] = [];
    nameCategoryGroups[nameKey].push(v);

    if (v.userId && !v.userId.startsWith('usr-vendor-')) {
      // For real registered users, group by userId
      if (!userGroups[v.userId]) userGroups[v.userId] = [];
      userGroups[v.userId].push(v);
    }
  });

  const idsToDelete = new Set<string>();

  // Process name + category duplicates
  for (const [key, list] of Object.entries(nameCategoryGroups)) {
    if (list.length > 1) {
      console.log(`\nFound duplicate group [${key}] with ${list.length} vendors:`);
      // Sort list: highest score first, then newest createdAt
      list.sort((a, b) => {
        const scoreA = calculateScore(a);
        const scoreB = calculateScore(b);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

      const kept = list[0];
      console.log(`  -> KEEPING: ID=${kept.id}, Name="${kept.businessName}", Created=${kept.createdAt}, Score=${calculateScore(kept)}`);

      for (let i = 1; i < list.length; i++) {
        const dup = list[i];
        console.log(`  -> REMOVING DUPLICATE: ID=${dup.id}, Name="${dup.businessName}", Created=${dup.createdAt}`);
        idsToDelete.add(dup.id);
      }
    }
  }

  // Process userId duplicates
  for (const [userId, list] of Object.entries(userGroups)) {
    if (list.length > 1) {
      // Find ones not already marked
      const remaining = list.filter((v) => !idsToDelete.has(v.id));
      if (remaining.length > 1) {
        remaining.sort((a, b) => calculateScore(b) - calculateScore(a));
        for (let i = 1; i < remaining.length; i++) {
          console.log(`  -> REMOVING SAME-USER DUPLICATE: ID=${remaining[i].id} for userId=${userId}`);
          idsToDelete.add(remaining[i].id);
        }
      }
    }
  }

  if (idsToDelete.size === 0) {
    console.log('\nNo duplicate vendors found to remove.');
  } else {
    console.log(`\nDeleting ${idsToDelete.size} duplicate vendor record(s)...`);
    const deleteResult = await VendorModel.deleteMany({ id: { $in: Array.from(idsToDelete) } });
    console.log(`Successfully deleted ${deleteResult.deletedCount} duplicate vendors.`);
  }

  const totalAfter = await VendorModel.countDocuments();
  console.log(`\nTotal vendors remaining: ${totalAfter} (Cleaned up ${totalBefore - totalAfter} duplicates)`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Failed to remove duplicate vendors:', err);
  process.exit(1);
});
