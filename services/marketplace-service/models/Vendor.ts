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
    images: [String],
    tiers: [{ name: String, price: Number, _id: false }],
    // Catering-only structured menu details.
    catering: {
      type: {
        menuTier: String,
        foodTypes: [String],
        cuisines: [String],
        starters: Number,
        mains: Number,
        desserts: Number,
        minGuests: Number,
        liveCounters: [String],
        serviceStyle: String,
        welcomeDrinks: Boolean,
        servingStaff: Boolean,
        freeTasting: Boolean,
      },
      default: undefined,
      _id: false,
    },
  },
  { _id: false }
);

const vendorDealSchema = new Schema(
  {
    id: String,
    title: String,
    description: String,
    discountType: { type: String, enum: ['percent', 'flat'], default: 'percent' },
    discountValue: Number,
    minOrderAmount: Number,
    startsAt: String,
    expiresAt: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
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
  isSuspended: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  galleryImages: { type: [String], default: [] },
  galleryVideos: { type: [String], default: [] },
  contactEmail: String,
  contactPhone: String,
  upiId: String,
  qrCodeImage: String,
  packages: { type: [vendorPackageSchema], default: [] },
  availableDates: { type: [String], default: [] },
  bookedDates: { type: [String], default: [] },
  policies: {
    cancellation: { type: String, default: '' },
    refund: { type: String, default: '' },
    advancePercentage: { type: Number, default: 20 },
    advanceAmount: { type: Number },
  },
  // Amenities / options a vendor offers — set in the vendor portal, shown on the
  // customer marketplace chips.
  facilities: {
    acRoom: Boolean,
    fansOnly: Boolean,
    vipRoom: Boolean,
    vipFrontChairs: Boolean,
    garlands: Boolean,
    brideGroomRoom: Boolean,
    guestRoomAttachedWashroom: Boolean,
    dormitoryHall: Boolean,
    separateGuestWashroom: Boolean,
    cookingUtensils: Boolean,
    waterFilter: Boolean,
    catering: String,
    decoration: String,
    djService: String,
    transport: String,
  },
  // Category-specific services this vendor offers (e.g. a caterer's menu sections,
  // a photographer's shoot styles) — shown on the customer vendor detail page.
  offeredOptions: { type: [String], default: [] },
  // Price the vendor set for each entry in offeredOptions, keyed by label.
  offeredOptionPrices: { type: Schema.Types.Mixed, default: {} },
  // Named priced line-items the vendor lists under each offered option, keyed
  // by label — e.g. { "Veg": [{ name, price, note }, ...] }.
  offeredOptionItems: { type: Schema.Types.Mixed, default: {} },
  // Option-level quality tier keyed by label, for options with no item list —
  // e.g. { "Live Streaming": "4K Ultra HD" }.
  offeredOptionQuality: { type: Schema.Types.Mixed, default: {} },
  // Photos per offered option, keyed by label — { "Fresh Flower Decor": [url] }.
  offeredOptionImages: { type: Schema.Types.Mixed, default: {} },
  giftCount: Number,
  giftDiscount: String,
  // Promotional deals the vendor publishes on their own listing.
  deals: { type: [vendorDealSchema], default: [] },
  // Verification request the vendor submits to earn the Verified badge; reviewed
  // by an admin. `isVerified` above mirrors verification.status === 'verified'.
  verification: {
    status: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' },
    legalName: { type: String, default: '' },
    registrationNumber: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    contactPerson: { type: String, default: '' },
    documents: { type: [String], default: [] },
    submittedAt: { type: String, default: '' },
    reviewedAt: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
  },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

vendorSchema.index({ location: '2dsphere' });
vendorSchema.index({ businessName: 'text', description: 'text' });
vendorSchema.index({ category: 1, 'location.city': 1 });

export const VendorModel = model<Vendor>('Vendor', vendorSchema);
