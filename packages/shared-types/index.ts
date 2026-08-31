export type Role = 'customer' | 'vendor' | 'event_manager' | 'admin' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  avatarUrl?: string;
  // How the account signs in. 'password' is the default email+password account;
  // 'google' is created/linked via "Sign in with Google" and has no usable password
  // until the user sets one through Forgot Password.
  authProvider?: 'password' | 'google';
  isVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
}

export interface LocationPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

export interface VendorPackage {
  id: string;
  packageName: string;
  price: number;
  description: string;
  includedServices: string[];
  durationHours?: number;
  capacityPersons?: number;
  // Photos of this package / hall (URLs on the storage service), shown to
  // customers on the package card.
  images?: string[];
  // Optional vendor-defined price tiers (named however the vendor likes —
  // Normal / HD / Premium, Silver / Gold, …). When present the customer picks
  // one and its price is used; when empty the flat `price` applies.
  tiers?: PackageTier[];
}

// A named price tier within a package.
export interface PackageTier {
  name: string;
  price: number;
}

export type FacilityTier = 'included' | 'extra_cost' | 'not_offered';

export type CateringMenuCategoryType =
  | 'veg'
  | 'non-veg'
  | 'starters-veg'
  | 'starters-non-veg'
  | 'cool-drinks'
  | 'desserts'
  | 'mocktails'
  | 'snacks';

// A single dish/drink on a menu card — the vendor sets a real photo, price,
// and availability for each one individually.
export interface CateringMenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  available: boolean;
}

// A single page of a caterer's menu (Veg, Non-Veg, Starters (Veg/Non-Veg),
// Cool Drinks, Desserts, Mocktails, Snacks) — a card title plus the list of
// individually-priced, individually-photographed items on that page.
export interface CateringMenuCategory {
  id: string;
  title: string;
  type: CateringMenuCategoryType;
  image: string;
  items: CateringMenuItem[];
  pricePerPerson?: number; // optional per-plate summary price, shown alongside individual item prices
}

export interface VendorFacilities {
  acRoom: boolean;
  fansOnly: boolean;
  vipRoom: boolean;
  vipFrontChairs: boolean;
  garlands: boolean;
  brideGroomRoom: boolean;
  guestRoomAttachedWashroom: boolean;
  dormitoryHall: boolean;
  separateGuestWashroom: boolean;
  cookingUtensils: boolean;
  waterFilter: boolean;
  catering: FacilityTier;
  decoration: FacilityTier;
  djService: FacilityTier;
  transport: FacilityTier;
}

export interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  category: VendorCategory;
  description: string;
  location: LocationPoint;
  startingPrice: number;
  yearsOfExperience: number;
  ratingAverage: number;
  reviewCount: number;
  isVerified: boolean;
  isSuspended: boolean;
  featured: boolean;
  galleryImages: string[];
  galleryVideos?: string[];
  contactEmail: string;
  contactPhone: string;
  // Real UPI payment details the vendor supplies so a customer can pay the
  // advance directly, plus a scanner (QR code) image for the same purpose.
  upiId?: string;
  qrCodeImage?: string;
  packages: VendorPackage[];
  availableDates: string[]; // ISO date strings the vendor opened for booking
  // Dates that have been booked — moved here from availableDates when a
  // customer confirms a booking, so the customer listing can show them as
  // "Booked" (visible but not selectable) rather than silently disappearing.
  bookedDates?: string[];
  policies: {
    cancellation: string;
    refund: string;
    advancePercentage: number;
    // Flat rupee advance that overrides the percentage-based calculation
    // when set — lets a vendor quote a fixed advance instead of a %.
    advanceAmount?: number;
  };
  facilities?: VendorFacilities;
  offeredOptions?: string[];
  // Price the vendor set for each of their own offeredOptions (keyed by the
  // exact option label) — lets customers see what a specific service costs
  // at this vendor, not just that they offer it.
  offeredOptionPrices?: Record<string, number>;
  // Line-items the vendor lists under each offered option (keyed by the exact
  // option label). E.g. under "Veg" a caterer lists individual dishes with a
  // rate each; under "Candid" a photographer lists specific shoot add-ons.
  // Applies to every category — whatever the option, the vendor can break it
  // down into named priced items customers see before booking.
  offeredOptionItems?: Record<string, OfferedOptionItem[]>;
  // Option-level quality tier (keyed by option label), for options that have
  // no per-item breakdown — e.g. a Media vendor's "Live Streaming" or "LED
  // Screens" is offered at a single quality (4K, Full HD, …) rather than as a
  // list of priced items.
  offeredOptionQuality?: Record<string, string>;
  // Photos the vendor uploaded for each offered option (keyed by option label),
  // shown to customers alongside that option/service.
  offeredOptionImages?: Record<string, string[]>;
  // Return Gifts vendors only: how many gift pieces they supply and any
  // quantity-based discount, shown to customers on the listing.
  giftCount?: number;
  giftDiscount?: string;
  // Verification request the vendor submits to earn the Verified badge. `status`
  // drives the admin review queue; `isVerified` above stays in sync (true only
  // when status === 'verified') for backward compatibility.
  verification?: VendorVerification;
  // Promotional deals/offers the vendor publishes on their own listing.
  deals?: VendorDeal[];
  createdAt: string;
}

// A discount/offer a vendor publishes on their listing. Percentage or flat rupee
// off, optionally gated by a minimum order value and a validity window.
export interface VendorDeal {
  id: string;
  title: string;
  description?: string;
  discountType: 'percent' | 'flat';
  discountValue: number; // percent (1–100) or flat rupees off
  minOrderAmount?: number; // only applies when the subtotal reaches this
  startsAt?: string; // ISO date; empty = live immediately
  expiresAt?: string; // ISO date; empty = no expiry
  isActive: boolean;
  createdAt: string;
}

// Whether a deal is currently live: active, started, and not expired.
export function isDealLive(deal: VendorDeal, now: Date = new Date()): boolean {
  if (!deal.isActive) return false;
  if (deal.startsAt && new Date(deal.startsAt) > now) return false;
  if (deal.expiresAt) {
    // Treat expiry as end-of-day so a deal valid "until the 5th" works all day.
    const end = new Date(deal.expiresAt);
    end.setHours(23, 59, 59, 999);
    if (end < now) return false;
  }
  return true;
}

// The vendor's deals that are live right now.
export function getLiveDeals(vendor: Pick<Vendor, 'deals'>): VendorDeal[] {
  return (vendor.deals || []).filter((d) => isDealLive(d));
}

// Rupees a single deal takes off a given subtotal (0 if the subtotal doesn't
// meet the deal's minimum). Percentage discounts are capped at the subtotal.
export function dealDiscountAmount(deal: VendorDeal, subtotal: number): number {
  if (subtotal <= 0) return 0;
  if (deal.minOrderAmount && subtotal < deal.minOrderAmount) return 0;
  const raw = deal.discountType === 'percent'
    ? (subtotal * Math.min(deal.discountValue, 100)) / 100
    : deal.discountValue;
  return Math.max(0, Math.min(Math.round(raw), subtotal));
}

// The live deal that saves the customer the most on this subtotal, with its
// rupee discount — or null when nothing applies.
export function bestDealForAmount(vendor: Pick<Vendor, 'deals'>, subtotal: number): { deal: VendorDeal; discount: number } | null {
  let best: { deal: VendorDeal; discount: number } | null = null;
  for (const deal of getLiveDeals(vendor)) {
    const discount = dealDiscountAmount(deal, subtotal);
    if (discount > 0 && (!best || discount > best.discount)) best = { deal, discount };
  }
  return best;
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface VendorVerification {
  status: VerificationStatus;
  // Legal / KYC details the vendor supplies to prove the business is real.
  legalName?: string;
  registrationNumber?: string;
  gstNumber?: string;
  contactPerson?: string;
  // URLs of proof documents (business registration, GST certificate, ID) the
  // vendor uploaded via the existing vendor upload endpoint.
  documents?: string[];
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

// A trust signal shown to shoppers. `tone` maps to a colour treatment in the UI.
export interface VendorTrustBadge {
  key: string;
  label: string;
  tone: 'verified' | 'rating' | 'experience' | 'popular' | 'tenure';
}

// Derive the trust badges a vendor has earned from its public stats. Pure and
// deterministic so the customer web, compare modal, and vendor dashboard all
// show the same set without duplicating the rules.
export function getVendorTrustBadges(vendor: Pick<Vendor, 'isVerified' | 'ratingAverage' | 'reviewCount' | 'yearsOfExperience' | 'createdAt'>): VendorTrustBadge[] {
  const badges: VendorTrustBadge[] = [];
  if (vendor.isVerified) {
    badges.push({ key: 'verified', label: 'Verified Business', tone: 'verified' });
  }
  if (vendor.ratingAverage >= 4.5 && vendor.reviewCount >= 5) {
    badges.push({ key: 'top-rated', label: 'Top Rated', tone: 'rating' });
  }
  if (vendor.reviewCount >= 20) {
    badges.push({ key: 'popular', label: 'Highly Booked', tone: 'popular' });
  }
  if (vendor.yearsOfExperience >= 5) {
    badges.push({ key: 'experienced', label: `${vendor.yearsOfExperience}+ Yrs Experience`, tone: 'experience' });
  }
  const joinedYear = vendor.createdAt ? new Date(vendor.createdAt).getFullYear() : NaN;
  if (!Number.isNaN(joinedYear)) {
    badges.push({ key: 'since', label: `On Magizhnaazh since ${joinedYear}`, tone: 'tenure' });
  }
  return badges;
}

// A single priced item a vendor lists under one of their offered options —
// a dish, a package add-on, a specific service line. `note` is optional free
// text (portion size, description, terms) the vendor can write for each item.
export interface OfferedOptionItem {
  name: string;
  price: number;
  note?: string;
  // Media-only (Photography/Videography) extras. Depending on the option, a
  // Media item carries either an equipments note (photo shoots) or a delivery
  // quality tier (video/other), plus an optional extra charge for outstation /
  // other-area coverage. All left undefined for every other category.
  equipments?: string;
  quality?: string;
  areaCharge?: number;
  photo?: string;
}

// Quality tiers a Media vendor can tag an item with (dropdown in the vendor
// portal, badge on the customer listing).
export const MEDIA_QUALITY_OPTIONS = ['4K Ultra HD', '2K', 'Full HD (1080p)', 'HD (720p)'];

// Equipment presets a Media vendor can tag a shoot item with (dropdown in the
// vendor portal, badge on the customer listing).
export const MEDIA_EQUIPMENT_OPTIONS = [
  'DSLR Camera',
  'Mirrorless Camera',
  'Cinema Camera',
  'Drone',
  'Gimbal / Stabilizer',
  'Tripod',
  'Lighting Kit',
  'External Mic',
  'Slider / Crane',
];

// Which extra field a given Media option collects: capture work (shoots,
// photography, videography, cinematic) lists the equipment used; delivery work
// (drone, live streaming, edits, highlight reel, LED screens) picks a quality
// tier instead.
export function mediaExtraField(optionLabel: string): 'equipments' | 'quality' {
  return /shoot|photography|videography|cinematic/i.test(optionLabel) ? 'equipments' : 'quality';
}

export type VendorCategory =
  | 'Catering'
  | 'Venue'
  | 'Decoration'
  | 'Makeup & Beauty'
  | 'Media'
  | 'Transport'
  | 'Pujari/Priest'
  | 'Invitation'
  | 'Printing'
  | 'Return Gifts'
  | 'Entertainment'
  | 'Music/DJ'
  | 'Lighting'
  | 'Flowers'
  | 'Mehendi'
  | 'Event Host/Anchor'
  | 'Security'
  | 'Cleaning'
  | 'Rental Equipment'
  | 'Utensils for Rent'
  | 'Wedding Planner'
  | 'Corporate Event Services'
  | 'Other';

// Category-specific service options a vendor can offer, and that customers can
// browse/select on the marketplace. Every entry in VENDOR_CATEGORIES (except
// 'Venue', which uses VendorFacilities' amenities/event-service tiers instead)
// should have a list here so no vendor or customer sees a blank panel. Shared
// between vendor-web (Facilities & Options tab) and customer-web (marketplace
// category chips) so both stay in sync.
export const CATEGORY_OPTIONS: Record<string, string[]> = {
  Catering: ['Veg', 'Non-Veg', 'Starters (Veg)', 'Starters (Non-Veg)', 'Cool Drinks', 'Desserts', 'Mocktails', 'Snacks'],
  Decoration: ['South Indian Traditional', 'Royal Mandap', 'Reception Stage', 'Haldi & Mehndi', 'Christian Wedding', 'Birthday & Baby Shower', 'Garlands & Floral Strings'],
  'Makeup & Beauty': ['Bridal Makeup', 'Reception & Engagement', 'Party & Guest', 'Haldi & Mehndi', 'Hair & Saree Draping', 'Ornaments & Jewellery', 'Pre-Bridal Skin & Hair'],
  // Photography + Videography merged into one "Media" category.
  Media: ['Candid Photography', 'Traditional Photography', 'Pre-Wedding Shoot', 'Post-Wedding Shoot', 'Cinematic Films', 'Candid Videography', 'Traditional Videography', 'Drone Coverage', 'Live Streaming', 'Same-Day Edit', 'Highlight Reel', 'Full-Length Edit', 'LED Screens'],
  Transport: ['Airport Pickup', 'Railway Station Pickup', 'Bride & Groom Vehicle', 'Guest Vehicle', 'Bus Stop Pickup'],
  'Pujari/Priest': ['Wedding (Vivaham)', 'Engagement (Nichayam)', 'Griha Pravesh', 'Naming & Cradle', 'Seemantham (Baby Shower)', 'Satyanarayan & Homam', 'Upanayanam'],
  Invitation: ['Digital E-Invites', 'Printed Cards', 'Video Invitations', 'WhatsApp Invites', 'Custom Illustrations', 'Multi-language Invites'],
  Printing: ['Wedding Cards', 'Banners & Flex', 'Photo Albums', 'Standees', 'Stickers & Tags', 'Menu Cards', 'Discount for Bulk'],
  'Return Gifts': ['Traditional (Silver & Brass)', 'Sweets & Dry Fruits', 'Eco-Friendly Plants', 'Personalized Gifts', 'Hampers & Favors', 'Kids Gifts'],
  Entertainment: ['Live Band', 'Dance Troupe', 'Magic Show', 'Stand-up Comedy', 'Fireworks & Pyrotechnics', 'Games & Activities'],
  'Music/DJ': ['DJ Package', 'Live Band', 'Anchor / MC', 'Sound & Lighting Setup', 'Nadaswaram & Thavil', 'Dhol & Band Baaja', 'Carnatic / Classical', 'Bhajan / Devotional'],
  Lighting: ['Stage Lighting', 'Fairy Lights', 'Laser Show', 'LED Wall', 'Chandeliers', 'Outdoor Lighting'],
  Flowers: ['Fresh Flower Decor', 'Garlands', 'Bouquets', 'Floral Backdrop', 'Car Decoration', 'Flower Rangoli'],
  Mehendi: ['Bridal Mehendi', 'Guest Mehendi', 'Arabic Design', 'Rajasthani Design', 'Contemporary Design', 'Mehendi Party Setup'],
  'Event Host/Anchor': ['Wedding Anchor', 'Corporate Emcee', 'Bilingual Hosting', 'Game Coordination', 'Stage Management'],
  Security: ['Event Security Guards', 'Bouncers', 'Parking Management', 'Crowd Control', 'VIP Escort'],
  Cleaning: ['Pre-Event Cleaning', 'Post-Event Cleanup', 'Waste Disposal', 'Deep Cleaning', 'Sanitization Services'],
  'Rental Equipment': ['Chairs & Tables', 'Tents & Canopies', 'Sound Systems', 'Generators', 'AC Units', 'Crockery & Cutlery'],
  'Utensils for Rent': ['Cooking Vessels (Anda)', 'Serving Utensils', 'Steel Plates & Tumblers', 'Buffet Counters', 'Gas Stoves & Burners', 'Water Dispensers', 'Steel Dining Sets', 'Traditional Brass & Copper'],
  'Wedding Planner': ['Full Wedding Planning', 'Day-of Coordination', 'Destination Wedding', 'Budget Planning', 'Vendor Management', 'Guest Management'],
  'Corporate Event Services': ['Conference Setup', 'Product Launch', 'Team Building', 'Award Ceremony', 'AV & Tech Support', 'Corporate Catering Coordination'],
  Other: [],
};

// Colour-coded dot + badge styling for Catering's options specifically (the
// only category with a fixed, universally-recognised colour convention —
// green for veg, red for non-veg, etc.). Keyed by the exact label strings in
// CATEGORY_OPTIONS.Catering above; every other category renders its options
// as plain chips with no colour coding.
export const CATERING_OPTION_STYLE: Record<string, { dot: string; badge: string }> = {
  Veg: { dot: 'bg-emerald-400', badge: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' },
  'Non-Veg': { dot: 'bg-rose-500', badge: 'bg-rose-950/80 text-rose-300 border border-rose-500/40' },
  'Starters (Veg)': { dot: 'bg-amber-400', badge: 'bg-amber-950/80 text-amber-300 border border-amber-500/40' },
  'Starters (Non-Veg)': { dot: 'bg-orange-500', badge: 'bg-orange-950/80 text-orange-300 border border-orange-500/40' },
  'Cool Drinks': { dot: 'bg-cyan-400', badge: 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40' },
  Desserts: { dot: 'bg-pink-400', badge: 'bg-pink-950/80 text-pink-300 border border-pink-500/40' },
  Mocktails: { dot: 'bg-fuchsia-400', badge: 'bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-500/40' },
  Snacks: { dot: 'bg-lime-400', badge: 'bg-lime-950/80 text-lime-300 border border-lime-500/40' },
};

export const VENDOR_CATEGORIES: VendorCategory[] = [
  'Catering',
  'Venue',
  'Decoration',
  'Makeup & Beauty',
  'Media',
  'Transport',
  'Pujari/Priest',
  'Invitation',
  'Printing',
  'Return Gifts',
  'Entertainment',
  'Music/DJ',
  'Lighting',
  'Flowers',
  'Mehendi',
  'Event Host/Anchor',
  'Security',
  'Cleaning',
  'Rental Equipment',
  'Utensils for Rent',
  'Wedding Planner',
  'Corporate Event Services',
  'Other',
];

export interface EventType {
  id: string;
  name: string;
  icon: string;
  description: string;
  defaultCategoryPercentages: Record<string, number>;
}

export interface EventBudgetItem {
  id: string;
  category: VendorCategory;
  allocatedPercentage: number;
  allocatedAmount: number;
  actualSpent: number;
  notes?: string;
}

export interface EventTask {
  id: string;
  title: string;
  category?: VendorCategory;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface EventScheduleItem {
  id: string;
  time: string;
  activity: string;
  location?: string;
  notes?: string;
}

export interface Event {
  id: string;
  userId: string;
  title: string;
  eventType: string;
  date: string;
  location: {
    city: string;
    venueName?: string;
    address?: string;
  };
  guestCount: number;
  totalBudget: number;
  spentBudget: number;
  status: 'planning' | 'ongoing' | 'completed' | 'cancelled';
  budgetBreakdown: EventBudgetItem[];
  tasks: EventTask[];
  schedule: EventScheduleItem[];
  bookedVendorIds: string[];
  createdAt: string;
}

export type BookingStatus =
  | 'enquiry'
  | 'quote_requested'
  | 'quote_received'
  | 'quote_sent'
  | 'negotiation'
  | 'pending_payment'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface Booking {
  id: string;
  bookingNumber: string;
  eventId: string;
  customerId: string;
  vendorId: string;
  vendorName: string;
  vendorCategory: VendorCategory;
  // Customer's display name, captured for invoices (bookings predate this field,
  // so it may be absent on older records).
  customerName?: string;
  packageId?: string;
  packageName?: string;
  agreedPrice: number;
  advanceAmountPaid: number;
  remainingAmount: number;
  status: BookingStatus;
  eventDate: string;
  specialInstructions?: string;
  quotesHistory?: {
    sender: 'customer' | 'vendor';
    amount: number;
    notes?: string;
    timestamp: string;
  }[];
  // Service-type options the customer picked on the vendor detail page before
  // booking (e.g. a photographer's "Candid" + "Drone", a decorator's "Royal
  // Mandap") — plain labels, works the same way for every vendor category.
  selectedOptions?: string[];
  // Reference images the customer uploaded for this booking (e.g. a decoration
  // style they want) — shown to the vendor so they know exactly what's expected.
  referenceImages?: string[];
  // Vendor-entered itemisation of what the agreed money was spent on — e.g. a
  // decorator's "Mandap flowers ₹40,000", "Stage lighting ₹20,000". Purely a
  // breakdown of the total; the customer sees it under this vendor in the Smart
  // Budget "Where Your Money Went" drill-down. Works for every vendor category.
  spendItems?: { label: string; amount: number }[];
  // Ledger of payments made against this booking (advance + balance). Each entry
  // is a customer claim the vendor confirms, mirroring the manual-UPI flow.
  payments?: BookingPayment[];
  // True once confirmed payments cover the full agreed price.
  paidInFull?: boolean;
  // Sequential GST invoice number, assigned the first time an invoice is issued.
  invoiceNumber?: string;
  invoiceIssuedAt?: string;
  // Vendor payout settlement (platform pays the vendor their share minus commission).
  settlementStatus?: 'pending' | 'settled';
  settledAt?: string;
  createdAt: string;
}

// One payment against a booking. Customers record a claim (status 'claimed');
// the vendor confirms it (status 'confirmed'), which updates the paid/remaining
// amounts. Method is 'upi' | 'cash' | 'card' | 'bank' etc.
export interface BookingPayment {
  id: string;
  type: 'advance' | 'balance';
  amount: number;
  method: string;
  reference?: string;
  status: 'claimed' | 'confirmed';
  claimedAt: string;
  confirmedAt?: string;
}

// Structured GST invoice for a booking, computed server-side and rendered as a
// printable document in the web apps. Prices are treated as GST-inclusive.
export interface BookingInvoice {
  invoiceNumber: string;
  issuedAt: string;
  eventDate: string;
  seller: { name: string; gstin?: string; address?: string; email?: string; phone?: string };
  buyer: { name: string; email?: string };
  lineItems: { label: string; amount: number }[];
  gstRate: number; // fraction, e.g. 0.18
  taxableValue: number;
  cgst: number;
  sgst: number;
  totalGst: number;
  grandTotal: number;
  advancePaid: number;
  balanceDue: number;
  paidInFull: boolean;
}

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'qr' | 'shape' | 'button';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  zIndex: number;
}

export interface Invitation {
  id: string;
  eventId: string;
  inviteToken: string; // URL slug
  templateId?: string;
  eventTitle: string;
  hostName: string;
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  mapLocationUrl?: string;
  message: string;
  canvasData: {
    width: number;
    height: number;
    backgroundColor: string;
    backgroundImageUrl?: string;
    elements: CanvasElement[];
  };
  exportedImageUrl?: string;
  createdAt: string;
}

export type RSVPStatus = 'invited' | 'viewed' | 'accepted' | 'declined' | 'maybe';

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  phone?: string;
  email?: string;
  group?: string; // e.g. "Bride Family", "Friends"
  status: RSVPStatus;
  adultsCount: number;
  childrenCount: number;
  dietaryPreference?: 'Veg' | 'Non-Veg' | 'Jain' | 'Vegan';
  needsTransport?: boolean;
  needsAccommodation?: boolean;
  invitedAt: string;
  respondedAt?: string;
}

export interface EventFeedback {
  id: string;
  eventId: string;
  feedbackToken: string;
  guestName?: string;
  overallRating: number; // 1-5
  venueRating?: number;
  cateringRating?: number;
  decorationRating?: number;
  organizationRating?: number;
  photographyRating?: number;
  comments?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  vendorId: string;
  customerId: string;
  customerName: string;
  bookingId: string;
  overallRating: number; // 1-5
  serviceQuality: number;
  professionalism: number;
  valueForMoney: number;
  communication: number;
  punctuality: number;
  comment: string;
  eventType: string;
  eventDate: string;
  createdAt: string;
  // Vendor's public response to this review — vendors can reply once, and edit it.
  vendorReply?: string;
  vendorReplyAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  code?: string;
  data: T;
}

// --- Admin console entities ---

export interface Category {
  id: string;
  name: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
}

export interface City {
  id: string;
  name: string;
  state: string;
  isActive: boolean;
  createdAt: string;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export type ComplaintStatus = 'open' | 'in_review' | 'resolved';

export interface Complaint {
  id: string;
  eventId?: string;
  bookingId?: string;
  submittedBy: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
}

export interface InvitationTemplateDoc {
  id: string;
  name: string;
  category: string;
  previewUrl: string;
  backgroundColor: string;
  elements: CanvasElement[];
  isActive: boolean;
  createdAt: string;
}

export type ThemePreference = 'light' | 'dark';

export interface PlatformSettings {
  commissionRate: number; // e.g. 0.1 = 10%
  advanceDepositRate: number; // e.g. 0.3 = 30%
  gstRate?: number; // e.g. 0.18 = 18%, used for GST invoices
  // Site-wide theme chosen in the admin console. Applied across the admin and
  // customer apps so the light/dark choice stays in sync everywhere.
  theme?: ThemePreference;
  updatedAt: string;
}