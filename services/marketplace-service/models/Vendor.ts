import { Schema, model } from 'mongoose';
import { Vendor } from '../../../packages/shared-types';

const vendorPackageSchema = new Schema(
  {
    id: String,
    packageName: String,
    price: Number,
    description: String,
    includedServices: [String],
    durationHours: Number,
    capacityPersons: Number,
  },
  { _id: false }
);

const vendorSchema = new Schema<Vendor>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  businessName: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
    address: String,
    city: String,
    district: String,
    state: String,
    pincode: String,
  },
  startingPrice: { type: Number, default: 0 },
  yearsOfExperience: { type: Number, default: 0 },
  ratingAverage: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  galleryImages: { type: [String], default: [] },
  galleryVideos: { type: [String], default: [] },
  contactEmail: String,
  contactPhone: String,
  packages: { type: [vendorPackageSchema], default: [] },
  availableDates: { type: [String], default: [] },
  policies: {
    cancellation: { type: String, default: '' },
    refund: { type: String, default: '' },
    advancePercentage: { type: Number, default: 20 },
  },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

vendorSchema.index({ location: '2dsphere' });
vendorSchema.index({ businessName: 'text', description: 'text' });
vendorSchema.index({ category: 1, 'location.city': 1 });

export const VendorModel = model<Vendor>('Vendor', vendorSchema);
