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
    // Venue-only structured hall details.
    venue: {
      type: {
        sessions: [String],
        hallType: String,
        hallClass: String,
        parking: Boolean,
        powerBackup: Boolean,
        bridalRoom: Boolean,
        accommodationRooms: Number,
        cateringPolicy: String,
        stageIncluded: Boolean,
        valetService: Boolean,
      },
      default: undefined,
      _id: false,
    },
    // Decoration-only structured details.
    decoration: {
      type: {
        tier: String,
        themes: [String],
        areas: [String],
        flowers: String,
        coupleSofa: Boolean,
        mandapType: String,
        lighting: Boolean,
        functionsCovered: Number,
      },
      default: undefined,
      _id: false,
    },
    // Makeup & Beauty-only structured details.
    makeup: {
      type: {
        makeupTypes: [String],
        finish: String,
        hairstyling: Boolean,
        draping: Boolean,
        looksCount: Number,
        trialSession: Boolean,
        travelToVenue: Boolean,
        extraFamilyMembers: Number,
      },
      default: undefined,
      _id: false,
    },
    // Media (Photo/Video)-only structured details.
    media: {
      type: {
        tier: String,
        coverage: String,
        styles: [String],
        daysOrEvents: Number,
        preWedding: Boolean,
        drone: Boolean,
        crewCount: Number,
        editedPhotos: Number,
        albumPages: Number,
        teaser: Boolean,
        film4k: Boolean,
        hoursCoverage: Number,
      },
      default: undefined,
      _id: false,
    },
    // Transport-only structured details.
    transport: {
      type: {
        tier: String,
        vehicleType: String,
        pricingBasis: String,
        numVehicles: Number,
        seatsPerVehicle: Number,
        kmHoursIncluded: Number,
        driverFuel: Boolean,
        carDecoration: Boolean,
        use: String,
      },
      default: undefined,
      _id: false,
    },
    // Pujari/Priest-only structured details.
    priest: {
      type: {
        ceremonyType: String,
        community: String,
        languages: [String],
        samagriIncluded: Boolean,
        numPriests: Number,
        durationHours: Number,
        muhurthamConsult: Boolean,
      },
      default: undefined,
      _id: false,
    },
    // Invitation-only structured details.
    // Plain nested object (not the `type:` wrapper) because it has a field
    // literally named "type", which the wrapper form misreads as a Mongoose
    // type declaration. `type: { type: String }` is the correct way to declare
    // a String field named "type".
    invitation: {
      tier: String,
      type: { type: String },
      design: String,
      quantity: Number,
      revisions: Number,
      addOns: [String],
      deliveryTime: String,
      languages: [String],
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
  // Slots the vendor offers per date (map date -> [slot ids]). Empty = all slots.
  availableSlots: { type: Schema.Types.Mixed, default: {} },
  bookedDates: { type: [String], default: [] },
  // Per-date time slots already booked (e.g. { date, slot: 'morning' }).
  bookedSlots: { type: [{ date: String, slot: String, _id: false }], default: [] },
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
