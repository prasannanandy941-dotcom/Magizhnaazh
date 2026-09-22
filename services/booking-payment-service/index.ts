import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from '../../packages/shared-utils/db';
import { authMiddleware } from '../../packages/shared-utils/auth';
import { requestLogger } from '../../packages/shared-utils/logging';
import { registerHealthRoute } from '../../packages/shared-utils/health';
import { serviceUrl } from '../../packages/shared-utils/serviceUrl';
import { BookingModel } from './models/Booking';
import { PlatformSettingsModel, getSettings } from './models/PlatformSettings';
import { CouponModel } from './models/Coupon';
import { createMarketplaceOrder, getRazorpayInstance, verifyPaymentSignature, verifyWebhookSignature } from './utils/razorpay';

const app = express();
const PORT = process.env.PORT || 8004;
const MARKETPLACE_SERVICE_URL = serviceUrl(process.env.MARKETPLACE_SERVICE_URL, 'http://localhost:8002');

app.use(cors());
// The Razorpay webhook needs the exact raw request bytes to verify its HMAC
// signature — mounted here, before the global express.json() below, so this
// one path gets an untouched Buffer while every other route still gets
// normal parsed JSON.
app.use('/api/v1/bookings/webhooks/razorpay', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(requestLogger('booking-payment-service'));
registerHealthRoute(app, 'booking-payment-service');

// A stable, hard-to-guess token for a vendor's private calendar feed. Derived
// from the vendor id and the shared JWT secret so no new secret/storage is
// needed, and the same vendor always gets the same subscribe URL.
const CALENDAR_SECRET = process.env.JWT_SECRET || 'magizhnaazh-dev-secret';
function calendarToken(vendorId: string): string {
  return crypto.createHmac('sha256', CALENDAR_SECRET).update(`calendar:${vendorId}`).digest('hex').slice(0, 32);
}

// Escape a string for an ICS text field (commas, semicolons, newlines).
function icsEscape(s: string): string {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// 'YYYY-MM-DD' -> 'YYYYMMDD' for all-day ICS dates; '' if unparseable.
function icsDate(d: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  return m ? `${m[1]}${m[2]}${m[3]}` : '';
}
function icsDatePlusOne(d: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  if (!m) return '';
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, '0')}${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// The date a vendor's payout for an event becomes eligible for settlement:
// event date + the admin's payout hold period. Returns '' when the date can't
// be parsed or the hold is 0 (eligible immediately).
function payoutEligibleOn(eventDate: string, holdDays: number): string {
  if (!holdDays || holdDays <= 0) return '';
  const t = Date.parse(eventDate);
  if (isNaN(t)) return '';
  return new Date(t + holdDays * 86400000).toISOString();
}

// Fetch the marketplace vendor record referenced by a booking (or null).
async function fetchVendor(vendorId: string): Promise<any | null> {
  try {
    const r = await fetch(`${MARKETPLACE_SERVICE_URL}/api/v1/vendors/${vendorId}`);
    if (!r.ok) return null;
    return (await r.json()).data?.vendor ?? null;
  } catch {
    return null;
  }
}

// True when the caller owns this booking's vendor listing, or is an admin.
async function callerOwnsVendor(req: Request, vendorId: string): Promise<boolean> {
  if (req.user!.role === 'admin') return true;
  const vendor = await fetchVendor(vendorId);
  return !!vendor && vendor.userId === req.user!.sub;
}

// Bookings confirmed before the payment ledger existed carry an advance in
// advanceAmountPaid but no ledger entry. Backfill a synthetic confirmed advance
// so ledger-based recomputation stays correct for them. Mutates, does not save.
function ensureAdvanceLedger(booking: any): void {
  const hasAdvance = (booking.payments || []).some((p: any) => p.type === 'advance');
  if (!hasAdvance && (booking.advanceAmountPaid || 0) > 0) {
    booking.payments = [
      ...(booking.payments || []),
      { id: `pay-legacy-${booking.id}`, type: 'advance', amount: booking.advanceAmountPaid, method: 'upi', status: 'confirmed', claimedAt: booking.createdAt || new Date().toISOString(), confirmedAt: booking.createdAt || new Date().toISOString() },
    ];
  }
}

// Recompute paid/remaining from the confirmed payments in the ledger, and the
// paid-in-full flag. Mutates the booking document (does not save).
function recomputePayments(booking: any): void {
  ensureAdvanceLedger(booking);
  const confirmed = (booking.payments || []).filter((p: any) => p.status === 'confirmed');
  const paid = confirmed.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
  booking.advanceAmountPaid = paid;
  booking.remainingAmount = Math.max(0, booking.agreedPrice - paid);
  booking.paidInFull = booking.agreedPrice > 0 && paid >= booking.agreedPrice;
}

// The advance amount for this booking, per the specific vendor's own policy
// (a flat advanceAmount overrides advancePercentage when set), clamped into
// the platform's [min, max] guardrail. Shared by the vendor's manual /confirm
// route and Razorpay order-creation, so both size the advance identically.
async function computeAdvanceAmount(booking: any, vendorPolicies: any): Promise<number> {
  const cfg = await getSettings();
  const flatAdvance = vendorPolicies?.advanceAmount;
  if (typeof flatAdvance === 'number' && flatAdvance > 0) {
    const lo = Math.round(booking.agreedPrice * cfg.advanceDepositMinRate);
    const hi = Math.round(booking.agreedPrice * cfg.advanceDepositMaxRate);
    return Math.min(Math.max(flatAdvance, lo), Math.min(hi, booking.agreedPrice));
  }
  const vendorRatePercent = vendorPolicies?.advancePercentage;
  const rawRate = typeof vendorRatePercent === 'number' ? vendorRatePercent / 100 : cfg.advanceDepositRate;
  const advanceRate = Math.min(Math.max(rawRate, cfg.advanceDepositMinRate), cfg.advanceDepositMaxRate);
  return Math.round(booking.agreedPrice * advanceRate);
}

// Idempotently records a Razorpay-verified payment in the ledger, keyed by
// razorpayOrderId. Both the client-side /verify route and the webhook call
// this exact function, so whichever fires first (or both) can't double-record
// the same payment — a repeat call on an already-confirmed order is a no-op.
function upsertVerifiedRazorpayPayment(
  booking: any,
  params: { type: 'advance' | 'balance'; amount: number; razorpayOrderId: string; razorpayPaymentId: string }
): any {
  const existing = (booking.payments || []).find((p: any) => p.razorpayOrderId === params.razorpayOrderId);
  if (existing) {
    if (existing.status !== 'confirmed') {
      existing.status = 'confirmed';
      existing.confirmedAt = new Date().toISOString();
      existing.razorpayPaymentId = params.razorpayPaymentId;
    }
    booking.markModified('payments');
    return existing;
  }
  const entry = {
    id: `pay-${Date.now()}`,
    type: params.type,
    amount: params.amount,
    method: 'razorpay',
    status: 'confirmed',
    razorpayOrderId: params.razorpayOrderId,
    razorpayPaymentId: params.razorpayPaymentId,
    razorpaySignatureVerified: true,
    claimedAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  };
  booking.payments = [...(booking.payments || []), entry];
  return entry;
}

// Applies a verified Razorpay payment to a booking: records the ledger entry,
// recomputes paid/remaining, and — for an advance — confirms the booking and
// blocks the event date, exactly like the vendor's manual /confirm route does
// today. The one code path used by both the client /verify route and the
// webhook backstop.
async function applyVerifiedRazorpayPayment(
  booking: any,
  params: { type: 'advance' | 'balance'; amount: number; razorpayOrderId: string; razorpayPaymentId: string },
  authHeader?: string
): Promise<void> {
  upsertVerifiedRazorpayPayment(booking, params);
  recomputePayments(booking);

  if (params.type === 'advance' && booking.status !== 'confirmed') {
    booking.status = 'confirmed';
    if (booking.vendorId && booking.eventDate) {
      fetch(`${MARKETPLACE_SERVICE_URL}/api/v1/vendors/${booking.vendorId}/book-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader || '' },
        body: JSON.stringify({ date: booking.eventDate, slot: booking.timeSlot || '' }),
      }).catch(() => { /* vendor availability will still show the slot until they refresh — not fatal */ });
    }
  }

  await booking.save();
}

async function seedIfEmpty() {
  const count = await BookingModel.countDocuments();
  if (count > 0) return;

  await BookingModel.create({
    id: 'bk-1',
    bookingNumber: 'BK-20260808-9481',
    eventId: 'evt-101',
    customerId: 'usr-customer-1',
    vendorId: 'vnd-1',
    vendorName: 'The Leela Palace Grand Ballroom',
    vendorCategory: 'Venue',
    packageName: 'Royal Ballroom Package',
    agreedPrice: 150000,
    advanceAmountPaid: 45000,
    remainingAmount: 105000,
    status: 'confirmed',
    eventDate: '2026-12-15',
    specialInstructions: 'Need red carpet entry and stage microphone setup.',
  });
  console.log('[booking-payment-service] Seeded demo booking.');
}

// Demo vendors from marketplace-service's VENDOR_SPECS (id, category, city, price) —
// duplicated here rather than imported since these are separate services/databases.
// Used only to generate a realistic spread of demo bookings across categories,
// cities and dates so the admin Analytics filters have something to show.
const BOOKING_SEED_VENDORS: { id: string; name: string; category: string; city: string; price: number }[] = [
  { id: 'vnd-1', name: 'The Leela Palace Grand Ballroom', category: 'Venue', city: 'Chennai', price: 150000 },
  { id: 'vnd-2', name: 'Taj Falaknuma Palace Banquets', category: 'Venue', city: 'Hyderabad', price: 220000 },
  { id: 'vnd-3', name: 'Umaid Heritage Wedding Lawns', category: 'Venue', city: 'Jaipur', price: 180000 },
  { id: 'vnd-4', name: 'Grand Chettinad Feast Caterers', category: 'Catering', city: 'Chennai', price: 450 },
  { id: 'vnd-5', name: 'Maharaja Thali Catering Co.', category: 'Catering', city: 'New Delhi', price: 600 },
  { id: 'vnd-6', name: 'Spice Route Wedding Caterers', category: 'Catering', city: 'Mumbai', price: 750 },
  { id: 'vnd-7', name: 'Candid Tales Photography & Cinema', category: 'Media', city: 'Chennai', price: 65000 },
  { id: 'vnd-8', name: 'Frame Stories Wedding Films', category: 'Media', city: 'New Delhi', price: 120000 },
  { id: 'vnd-9', name: 'Sunset Reels Photography', category: 'Media', city: 'Goa', price: 90000 },
  { id: 'vnd-10', name: 'Flora Dreams Floral & Theme Decor', category: 'Decoration', city: 'Coimbatore', price: 40000 },
  { id: 'vnd-11', name: 'Marigold Mandap Designers', category: 'Decoration', city: 'Jaipur', price: 80000 },
  { id: 'vnd-12', name: 'Petals & Pillars Event Decor', category: 'Decoration', city: 'Mumbai', price: 65000 },
  { id: 'vnd-13', name: 'Blush Bridal Makeup Studio', category: 'Makeup & Beauty', city: 'Bangalore', price: 15000 },
  { id: 'vnd-14', name: 'Glam Diaries by Aditi', category: 'Makeup & Beauty', city: 'Mumbai', price: 25000 },
  { id: 'vnd-15', name: 'Roopam Bridal Artistry', category: 'Makeup & Beauty', city: 'Hyderabad', price: 18000 },
  { id: 'vnd-16', name: 'Royal Ride Wedding Cars', category: 'Transport', city: 'Chennai', price: 6000 },
  { id: 'vnd-17', name: 'Baraat Express Fleet', category: 'Transport', city: 'New Delhi', price: 4000 },
  { id: 'vnd-18', name: 'Vintage Wheels Luxury Cars', category: 'Transport', city: 'Pune', price: 15000 },
  { id: 'vnd-19', name: 'Vedic Purohit Services', category: 'Pujari/Priest', city: 'Chennai', price: 8000 },
  { id: 'vnd-20', name: 'Shubh Muhurat Pandit Ji', category: 'Pujari/Priest', city: 'Varanasi', price: 6000 },
  { id: 'vnd-21', name: 'Iyer Vadhyar Associates', category: 'Pujari/Priest', city: 'Madurai', price: 7000 },
  { id: 'vnd-22', name: 'Giftology Return Favors', category: 'Return Gifts', city: 'Bangalore', price: 60 },
  { id: 'vnd-23', name: 'Silver Shagun Gifts', category: 'Return Gifts', city: 'Jaipur', price: 120 },
  { id: 'vnd-24', name: 'EcoGift Wedding Favors', category: 'Return Gifts', city: 'Pune', price: 40 },
  { id: 'vnd-25', name: 'Beat Box DJ & Sound', category: 'Music/DJ', city: 'Mumbai', price: 8000 },
  { id: 'vnd-26', name: 'Nadhaswaram Isai Kuzhu', category: 'Music/DJ', city: 'Madurai', price: 6000 },
  { id: 'vnd-27', name: 'Sufi Nights Live Band', category: 'Music/DJ', city: 'New Delhi', price: 20000 },
  { id: 'vnd-28', name: 'Frame & Motion Films', category: 'Media', city: 'Chennai', price: 70000 },
  { id: 'vnd-29', name: 'Cinereel Wedding Films', category: 'Media', city: 'Bangalore', price: 95000 },
  { id: 'vnd-30', name: 'Pixel Invites Studio', category: 'Invitation', city: 'Chennai', price: 2500 },
  { id: 'vnd-31', name: 'Royal Card Creations', category: 'Invitation', city: 'Jaipur', price: 4000 },
  { id: 'vnd-32', name: 'Classic Press Wedding Cards', category: 'Printing', city: 'Coimbatore', price: 3000 },
  { id: 'vnd-33', name: 'FlexPrint Banners & Albums', category: 'Printing', city: 'Madurai', price: 5000 },
  { id: 'vnd-34', name: 'Encore Live Entertainment', category: 'Entertainment', city: 'Mumbai', price: 25000 },
  { id: 'vnd-35', name: 'Firework Nights Events', category: 'Entertainment', city: 'New Delhi', price: 40000 },
  { id: 'vnd-36', name: 'Luminous Stage Lighting', category: 'Lighting', city: 'Bangalore', price: 15000 },
  { id: 'vnd-37', name: 'Chandelier & Laser Co.', category: 'Lighting', city: 'Hyderabad', price: 22000 },
  { id: 'vnd-38', name: 'Petal Craft Florists', category: 'Flowers', city: 'Chennai', price: 8000 },
  { id: 'vnd-39', name: 'Bloom & Garland Studio', category: 'Flowers', city: 'Coimbatore', price: 6000 },
  { id: 'vnd-40', name: 'Henna Traditions Studio', category: 'Mehendi', city: 'Jaipur', price: 5000 },
  { id: 'vnd-41', name: 'Mehendi Moments by Ritu', category: 'Mehendi', city: 'Mumbai', price: 7000 },
  { id: 'vnd-42', name: 'MicDrop Event Anchors', category: 'Event Host/Anchor', city: 'Bangalore', price: 12000 },
  { id: 'vnd-43', name: 'Stagecraft Emcee Services', category: 'Event Host/Anchor', city: 'Chennai', price: 15000 },
  { id: 'vnd-44', name: 'Shield Guard Event Security', category: 'Security', city: 'Mumbai', price: 10000 },
  { id: 'vnd-45', name: 'SafeZone Crowd Management', category: 'Security', city: 'New Delhi', price: 12000 },
  { id: 'vnd-46', name: 'SpotFree Event Cleaning', category: 'Cleaning', city: 'Pune', price: 4000 },
  { id: 'vnd-47', name: 'FreshStart Sanitation Co.', category: 'Cleaning', city: 'Ahmedabad', price: 5000 },
  { id: 'vnd-48', name: 'EventGear Rentals', category: 'Rental Equipment', city: 'Chennai', price: 9000 },
  { id: 'vnd-49', name: 'Canopy & Chairs Co.', category: 'Rental Equipment', city: 'Kochi', price: 7000 },
  { id: 'vnd-50', name: 'Dream Day Wedding Planners', category: 'Wedding Planner', city: 'Mumbai', price: 100000 },
  { id: 'vnd-51', name: 'Vivaha Event Consultants', category: 'Wedding Planner', city: 'Chennai', price: 75000 },
  { id: 'vnd-52', name: 'ProSummit Corporate Events', category: 'Corporate Event Services', city: 'Bangalore', price: 60000 },
  { id: 'vnd-53', name: 'Momentum MICE Solutions', category: 'Corporate Event Services', city: 'New Delhi', price: 80000 },
];

const SEED_EVENT_DATES = [
  '2026-08-18', '2026-08-27', '2026-09-05', '2026-09-14', '2026-09-23',
  '2026-10-02', '2026-10-11', '2026-10-20', '2026-10-29', '2026-11-07',
  '2026-11-16', '2026-11-25', '2026-12-04', '2026-12-13', '2026-12-22',
  '2027-01-06', '2027-01-15', '2027-01-24', '2027-02-02', '2027-02-11',
];

async function seedDemoBookings() {
  const ADVANCE_RATE = 0.3;
  const specs: any[] = [];

  BOOKING_SEED_VENDORS.forEach((v, vIdx) => {
    // Two bookings per demo vendor, spread across different months and a mix
    // of statuses, so date-range/city/category filters and the revenue trend
    // chart all have real, varied data instead of one flat pile on one date.
    for (let n = 0; n < 2; n++) {
      const dateIdx = (vIdx * 2 + n) % SEED_EVENT_DATES.length;
      const eventDate = SEED_EVENT_DATES[dateIdx];
      const statusRoll = (vIdx * 2 + n) % 6;
      const status = statusRoll === 0 ? 'quote_requested' : statusRoll === 1 ? 'quote_sent' : 'confirmed';
      const agreedPrice = v.price;
      const advance = status === 'confirmed' ? Math.round(agreedPrice * ADVANCE_RATE) : 0;
      const seedId = `bk-seed-${v.id}-${n}`;

      specs.push({
        id: seedId,
        bookingNumber: `BK-SEED-${v.id}-${n}`,
        eventId: `evt-seed-${v.id}-${n}`,
        customerId: `usr-seed-customer-${(vIdx % 8) + 1}`,
        vendorId: v.id,
        vendorName: v.name,
        vendorCategory: v.category,
        packageName: `${v.category} Signature Package`,
        agreedPrice,
        advanceAmountPaid: advance,
        remainingAmount: agreedPrice - advance,
        status,
        eventDate,
      });
    }
  });

  const existingIds = new Set((await BookingModel.find({}, { id: 1 }).lean()).map((b: any) => b.id));
  const missing = specs.filter((s) => !existingIds.has(s.id));
  if (missing.length === 0) return;
  await BookingModel.insertMany(missing, { ordered: false });
  console.log(`[booking-payment-service] Seeded ${missing.length} new demo bookings across ${BOOKING_SEED_VENDORS.length} vendors.`);
}

async function cleanupDemoBookings() {
  try {
    const result = await BookingModel.deleteMany({ id: { $regex: /^bk-seed-/ } });
    if (result.deletedCount > 0) {
      console.log(`[booking-payment-service] Cleaned up ${result.deletedCount} demo booking(s) from database.`);
    }
  } catch (err) {
    console.error('[booking-payment-service] Failed to clean up demo bookings:', err);
  }
}

// 1. Request a quote (enquiry)
app.post('/api/v1/bookings/quote', authMiddleware(), async (req: Request, res: Response) => {
  // The customer-web client sends this as `notes` (its own custom-request text
  // field); accept `specialInstructions` too for any other caller.
  const { eventId, vendorId, vendorName, vendorCategory, packageId, packageName, price, eventDate, guestCount, timeSlot, notes, specialInstructions, selectedOptions, referenceImages, advancePaymentClaimed } = req.body;

  const agreedPrice = Number(price) || 50000;
  const resolvedEventDate = eventDate || '2026-12-15';
  const resolvedGuestCount = Number(guestCount);
  if (!Number.isInteger(resolvedGuestCount) || resolvedGuestCount < 1) {
    return res.status(400).json({ success: false, message: 'A valid guest count is required.' });
  }
  const resolvedSlot = typeof timeSlot === 'string' ? timeSlot : '';

  // Reject the request outright if the vendor has opened up specific dates and
  // this isn't one of them — a vendor who has never set any availability is
  // treated as open (nothing to check against), so this only blocks requests
  // for a date the vendor has explicitly not made available.
  if (vendorId) {
    try {
      const vendorRes = await fetch(`${MARKETPLACE_SERVICE_URL}/api/v1/vendors/${vendorId}`);
      if (vendorRes.ok) {
        const vendorJson = await vendorRes.json();
        const vendor = vendorJson.data?.vendor;
        if (vendor?.availableDates?.length > 0 && !vendor.availableDates.includes(resolvedEventDate)) {
          return res.status(400).json({
            success: false,
            message: `${vendor.businessName} hasn't opened up ${resolvedEventDate} for booking. Please choose one of their available dates.`,
            code: 'DATE_NOT_AVAILABLE',
          });
        }
      }
    } catch {
      // Marketplace-service being briefly unreachable shouldn't block booking —
      // fall through and allow it rather than hard-failing on an infra hiccup.
    }
  }

  // Store the canonical marketplace listing ID even if an older/mobile client
  // submitted the vendor account ID.
  let canonicalVendorId = vendorId;
  if (vendorId) {
    const resolvedVendor = await fetchVendor(String(vendorId));
    if (resolvedVendor?.id) canonicalVendorId = resolvedVendor.id;
  }

  const booking = await BookingModel.create({
    id: `bk-${Date.now()}`,
    bookingNumber: `BK-${Date.now()}`,
    eventId: eventId || 'evt-101',
    customerId: req.user!.sub,
    customerName: (req.body.customerName || req.user!.email || '').trim(),
    vendorId: canonicalVendorId || 'vnd-1',
    vendorName: vendorName || 'Vendor Partner',
    vendorCategory: vendorCategory || 'Other',
    packageId,
    packageName: packageName || 'Standard Package',
    agreedPrice,
    advanceAmountPaid: 0,
    remainingAmount: agreedPrice,
    // A customer who has just scanned the vendor's UPI QR / paid arrives here
    // with advancePaymentClaimed set — that lands the booking in
    // 'pending_payment' so it shows up on the vendor's side as "awaiting your
    // confirmation" rather than being silently auto-confirmed client-side.
    status: advancePaymentClaimed ? 'pending_payment' : 'quote_requested',
    eventDate: resolvedEventDate,
    guestCount: resolvedGuestCount,
    timeSlot: resolvedSlot,
    specialInstructions: notes || specialInstructions || '',
    selectedOptions: Array.isArray(selectedOptions) ? selectedOptions : [],
    referenceImages: Array.isArray(referenceImages) ? referenceImages : [],
  });

  // A confirmed booking (advance claimed) takes that date off the vendor's
  // availability so nobody else can book the same day. Best-effort: the booking
  // already succeeded, so a failure here must not fail the request. Only closes
  // when the vendor actually uses date-based availability (an enquiry-only
  // quote_requested doesn't lock the date).
  if (advancePaymentClaimed && canonicalVendorId && resolvedEventDate) {
    // Block only the chosen slot (Morning/Afternoon/Evening) so the rest of the
    // day stays open; with no slot this closes the whole date (book-slot handles both).
    fetch(`${MARKETPLACE_SERVICE_URL}/api/v1/vendors/${canonicalVendorId}/book-slot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
      body: JSON.stringify({ date: resolvedEventDate, slot: resolvedSlot }),
    }).catch(() => {
      /* vendor availability will still show the slot until they refresh — not fatal */
    });
  }

  const { commissionRate } = await getSettings();
  res.status(201).json({
    success: true,
    message: advancePaymentClaimed ? 'Advance payment submitted — awaiting vendor confirmation.' : 'Quotation request sent to vendor.',
    data: { booking, platformCommission: Math.round(agreedPrice * commissionRate) },
  });
});

// 2. List bookings. Customers/admins see their own via the default scoping.
//    A vendor caller can pass ?vendorId=<marketplace vendor id> to see bookings
//    for their own listing — verified server-to-server against
//    marketplace-service's userId, since Booking.vendorId references the
//    marketplace Vendor document, not this auth user's id.
app.get('/api/v1/bookings', authMiddleware(), async (req: Request, res: Response) => {
  const { vendorId } = req.query;

  if (vendorId) {
    if (req.user!.role !== 'admin') {
      try {
        const vendorRes = await fetch(`${MARKETPLACE_SERVICE_URL}/api/v1/vendors/${vendorId}`);
        if (!vendorRes.ok) {
          return res.status(404).json({ success: false, message: 'Vendor not found.' });
        }
        const vendorJson = await vendorRes.json();
        if (vendorJson.data.vendor.userId !== req.user!.sub) {
          return res.status(403).json({ success: false, message: 'This vendor listing does not belong to you.' });
        }
      } catch {
        return res.status(502).json({ success: false, message: 'Could not verify vendor ownership.' });
      }
    }

    // Most bookings store the marketplace listing ID. Keep the linked account
    // ID as a compatibility key for bookings created by older mobile clients
    // that submitted the vendor account ID instead.
    const vendor = await fetchVendor(String(vendorId));
    const vendorIds = [String(vendorId), vendor?.id, vendor?.userId].filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    );
    try {
      const ownedRes = await fetch(`${MARKETPLACE_SERVICE_URL}/api/v1/vendors/owned`, {
        headers: { Authorization: req.headers.authorization || '' },
      });
      if (ownedRes.ok) {
        const ownedJson = await ownedRes.json();
        for (const ownedVendor of ownedJson.data?.vendors || []) {
          if (typeof ownedVendor?.id === 'string') vendorIds.push(ownedVendor.id);
          if (typeof ownedVendor?.userId === 'string') vendorIds.push(ownedVendor.userId);
        }
      }
    } catch {
      // The exact listing IDs above remain sufficient when marketplace lookup
      // is temporarily unavailable.
    }
    const bookings = await BookingModel.find({ vendorId: { $in: vendorIds } }).limit(200);
    return res.json({ success: true, count: bookings.length, data: { bookings } });
  }

  const filter = req.user!.role === 'admin' ? {} : { customerId: req.user!.sub };
  const bookings = await BookingModel.find(filter).limit(200);
  res.json({ success: true, count: bookings.length, data: { bookings } });
});

// 3. Booking detail — also used server-to-server by guest-feedback-service to
//    verify a completed booking before accepting a vendor review.
app.get('/api/v1/bookings/:id', async (req: Request, res: Response) => {
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  res.json({ success: true, data: { booking } });
});

// 4. Vendor accepts the customer's requested/negotiated price. This used to
// also fabricate a fake "paid" advance record on the spot — no real money
// ever moved. Now it only finalizes the price and moves the booking to
// 'pending_payment'; the booking only becomes 'confirmed' once the customer
// completes a real Razorpay payment (see /payments/razorpay/order + /verify,
// and applyVerifiedRazorpayPayment which does the actual confirming).
app.put('/api/v1/bookings/:id/confirm', authMiddleware(), async (req: Request, res: Response) => {
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

  // Only the vendor this booking belongs to (or an admin) may accept it.
  if (req.user!.role !== 'admin') {
    try {
      const vendorRes = await fetch(`${MARKETPLACE_SERVICE_URL}/api/v1/vendors/${booking.vendorId}`);
      if (!vendorRes.ok) return res.status(404).json({ success: false, message: 'Vendor not found.' });
      const vendorJson = await vendorRes.json();
      if (vendorJson.data.vendor.userId !== req.user!.sub) {
        return res.status(403).json({ success: false, message: 'This booking does not belong to your vendor listing.' });
      }
    } catch {
      return res.status(502).json({ success: false, message: 'Could not verify vendor ownership.' });
    }
  }

  // Already past acceptance (paid, in progress, completed, cancelled, or
  // refunded) — nothing left to do here, and definitely nothing to fake-pay.
  if (booking.status !== 'quote_requested' && booking.status !== 'enquiry' && booking.status !== 'quote_sent' && booking.status !== 'negotiation') {
    return res.json({ success: true, message: 'This booking has already moved past the acceptance stage.', data: { booking } });
  }

  booking.status = 'pending_payment';
  await booking.save();

  res.json({ success: true, message: 'Quote accepted — the customer can now pay the advance to confirm the booking.', data: { booking } });
});

// 4b. Send a counter-quote (negotiation). Vendor or customer proposes a new price;
//     it is appended to quotesHistory and becomes the current agreed price.
app.put('/api/v1/bookings/:id/quote', authMiddleware(), async (req: Request, res: Response) => {
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'A valid amount is required.' });
  const sender: 'customer' | 'vendor' = req.body.sender === 'customer' ? 'customer' : 'vendor';

  booking.quotesHistory = [
    ...(booking.quotesHistory || []),
    { sender, amount, notes: req.body.notes || '', timestamp: new Date().toISOString() },
  ];
  booking.agreedPrice = amount;
  booking.remainingAmount = amount - (booking.advanceAmountPaid || 0);
  booking.status = 'quote_sent';
  await booking.save();

  res.json({ success: true, message: 'Counter-quote sent.', data: { booking } });
});

// 4c. Vendor advances a confirmed booking through its work-progress stages:
//     Confirmed -> In Progress -> Completed. Works for every vendor category —
//     there's nothing catering-specific here, just the existing BookingStatus.
app.put('/api/v1/bookings/:id/status', authMiddleware(), async (req: Request, res: Response) => {
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

  const allowed = ['confirmed', 'in_progress', 'completed'];
  const { status } = req.body;
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}.` });
  }
  if (!allowed.includes(booking.status)) {
    return res.status(400).json({ success: false, message: 'This booking has not been confirmed yet.' });
  }

  if (req.user!.role !== 'admin') {
    try {
      const vendorRes = await fetch(`${MARKETPLACE_SERVICE_URL}/api/v1/vendors/${booking.vendorId}`);
      if (!vendorRes.ok) return res.status(404).json({ success: false, message: 'Vendor not found.' });
      const vendorJson = await vendorRes.json();
      if (vendorJson.data.vendor.userId !== req.user!.sub) {
        return res.status(403).json({ success: false, message: 'This booking does not belong to your vendor listing.' });
      }
    } catch {
      return res.status(502).json({ success: false, message: 'Could not verify vendor ownership.' });
    }
  }

  booking.status = status;
  await booking.save();

  res.json({ success: true, message: 'Booking status updated.', data: { booking } });
});

// 4c-2. Customer cancels a booking / requests a refund. Available at any point
//     before the vendor has actually started delivering the service — this is
//     exactly the safety net for a vendor who never confirms (stuck on
//     "Advance Claimed — Confirm") or who is slow to respond to a quote: the
//     customer isn't left waiting forever with no way out. Once work is
//     "in_progress" or the booking is already completed/cancelled/refunded,
//     this must go through support instead.
app.put('/api/v1/bookings/:id/cancel', authMiddleware(), async (req: Request, res: Response) => {
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

  const isAdmin = req.user!.role === 'admin';
  if (!isAdmin && booking.customerId !== req.user!.sub) {
    return res.status(403).json({ success: false, message: 'This booking does not belong to you.' });
  }

  const blocked = ['completed', 'cancelled', 'refunded', 'in_progress'];
  if (blocked.includes(booking.status)) {
    const why =
      booking.status === 'in_progress'
        ? 'This booking is already in progress. Please contact support for a refund.'
        : 'This booking is already closed and cannot be cancelled again.';
    return res.status(400).json({ success: false, message: why });
  }

  // Money is "at risk" (and this becomes a refund, not a plain cancel) if any
  // advance has been confirmed, OR the customer has claimed one that the
  // vendor hasn't acted on yet — exactly the stuck "Advance Claimed — Confirm"
  // scenario in the screenshot, where advanceAmountPaid is still 0 because the
  // vendor never confirmed it.
  const hadConfirmedMoney = (booking.advanceAmountPaid || 0) > 0;
  const hasUnconfirmedClaim = (booking.payments || []).some((p: any) => p.status === 'claimed');
  const isRefund = hadConfirmedMoney || hasUnconfirmedClaim;

  const wasConfirmed = booking.status === 'confirmed';
  booking.status = isRefund ? 'refunded' : 'cancelled';
  booking.cancelReason = String(req.body?.reason || '').slice(0, 500);
  booking.cancelledAt = new Date().toISOString();
  booking.cancelledBy = isAdmin ? 'admin' : 'customer';
  await booking.save();

  // If the date/slot had already been closed off (booking was confirmed),
  // reopen it on the vendor's calendar — best-effort, cancellation already
  // succeeded either way.
  if (wasConfirmed && booking.vendorId && booking.eventDate) {
    fetch(`${MARKETPLACE_SERVICE_URL}/api/v1/vendors/${booking.vendorId}/unbook-slot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
      body: JSON.stringify({ date: booking.eventDate, slot: booking.timeSlot || '' }),
    }).catch(() => { /* the vendor can still reopen the date manually */ });
  }

  res.json({
    success: true,
    message: isRefund
      ? 'Booking cancelled. Your refund request has been recorded.'
      : 'Booking cancelled.',
    data: { booking },
  });
});

// 4c-3. Vendor (or admin) refunds the customer's advance. If the advance was
// paid through Razorpay checkout, this calls Razorpay's refund API directly
// (with reverse_all so any Route transfer already sent to the vendor's linked
// account is pulled back first) — real money moves, not just a recorded
// claim. Only a payment with no Razorpay trail (a manually-claimed UPI
// payment from before the gateway existed, or made outside it) falls back to
// recording a UPI reference number as an audit trail, since there's no API
// to push that kind of payment back through.
app.put('/api/v1/bookings/:id/refund', authMiddleware(), async (req: Request, res: Response) => {
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (!(await callerOwnsVendor(req, booking.vendorId))) {
    return res.status(403).json({ success: false, message: 'This booking does not belong to your vendor listing.' });
  }
  if ((booking.advanceAmountPaid || 0) <= 0 && !(booking.payments || []).some((p: any) => p.type === 'advance' || p.status === 'claimed')) {
    return res.status(400).json({ success: false, message: 'There is no advance payment recorded for this booking.' });
  }
  if (booking.refundReference) {
    return res.status(409).json({ success: false, message: 'This booking has already been marked as refunded.' });
  }

  const advancePayment = (booking.payments || []).find((p: any) => p.type === 'advance' && p.razorpayPaymentId);

  if (advancePayment) {
    let refund;
    try {
      const razorpay = getRazorpayInstance();
      refund = await razorpay.payments.refund(advancePayment.razorpayPaymentId, {
        amount: Math.round((booking.advanceAmountPaid || 0) * 100),
        speed: 'normal',
        reverse_all: 1,
        notes: { bookingId: booking.id, bookingNumber: booking.bookingNumber },
      });
    } catch (err: any) {
      console.error('Razorpay refund error:', err?.error?.description || err?.message || err);
      return res.status(502).json({
        success: false,
        message: err?.error?.description || 'Razorpay could not process this refund. No money has moved — please try again or contact support.',
      });
    }

    booking.status = 'refunded';
    booking.refundReference = refund.id;
    booking.refundedAt = new Date().toISOString();
    booking.refundedBy = req.user!.role === 'admin' ? 'admin' : 'vendor';
    await booking.save();

    return res.json({
      success: true,
      message: 'Refund issued via Razorpay — the customer will receive it back in their original payment method.',
      data: { booking },
    });
  }

  const reference = String(req.body?.reference || '').trim().slice(0, 200);
  if (!reference) {
    return res.status(400).json({ success: false, message: 'A UPI refund reference is required.' });
  }

  booking.status = 'refunded';
  booking.refundReference = reference;
  booking.refundedAt = new Date().toISOString();
  booking.refundedBy = req.user!.role === 'admin' ? 'admin' : 'vendor';
  await booking.save();

  res.json({ success: true, message: 'Refund recorded successfully.', data: { booking } });
});

// 4d. Vendor records what the agreed money was spent on — a line-item breakdown
//     ("Mandap flowers ₹40,000", "Stage lighting ₹20,000"). This is purely an
//     itemisation of the booking total; the customer sees it under this vendor
//     in the Smart Budget "Where Your Money Went" view. Same ownership check as
//     the status route — only the vendor who owns the listing (or an admin) may
//     set it. Works for every vendor category.
app.put('/api/v1/bookings/:id/spend-breakdown', authMiddleware(), async (req: Request, res: Response) => {
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

  if (req.user!.role !== 'admin') {
    try {
      const vendorRes = await fetch(`${MARKETPLACE_SERVICE_URL}/api/v1/vendors/${booking.vendorId}`);
      if (!vendorRes.ok) return res.status(404).json({ success: false, message: 'Vendor not found.' });
      const vendorJson = await vendorRes.json();
      if (vendorJson.data.vendor.userId !== req.user!.sub) {
        return res.status(403).json({ success: false, message: 'This booking does not belong to your vendor listing.' });
      }
    } catch {
      return res.status(502).json({ success: false, message: 'Could not verify vendor ownership.' });
    }
  }

  const { spendItems } = req.body;
  if (!Array.isArray(spendItems)) {
    return res.status(400).json({ success: false, message: 'spendItems must be an array.' });
  }

  // Keep only well-formed, non-empty line items with a positive amount.
  const cleaned = spendItems
    .map((item: any) => ({ label: String(item?.label ?? '').trim(), amount: Number(item?.amount) }))
    .filter((item) => item.label.length > 0 && Number.isFinite(item.amount) && item.amount > 0);

  booking.spendItems = cleaned;
  await booking.save();

  res.json({ success: true, message: 'Spend breakdown saved.', data: { booking } });
});

// 4e. Customer records a balance payment against a confirmed booking (manual UPI
//     claim). Lands as a 'claimed' entry the vendor then confirms. Owner-checked
//     against the booking's customer.
app.post('/api/v1/bookings/:id/payments', authMiddleware(), async (req: Request, res: Response) => {
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (booking.customerId !== req.user!.sub && req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'This booking does not belong to you.' });
  }
  if (!['confirmed', 'in_progress', 'completed'].includes(booking.status)) {
    return res.status(400).json({ success: false, message: 'The balance can only be paid after the booking is confirmed.' });
  }

  recomputePayments(booking); // make sure remainingAmount is current
  const remaining = booking.remainingAmount;
  if (remaining <= 0) {
    return res.status(409).json({ success: false, message: 'This booking is already paid in full.' });
  }
  const amount = req.body.amount != null ? Number(req.body.amount) : remaining;
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: 'A valid payment amount is required.' });
  }
  if (amount > remaining) {
    return res.status(400).json({ success: false, message: `Amount exceeds the balance due (₹${remaining}).` });
  }

  booking.payments = [
    ...(booking.payments || []),
    {
      id: `pay-${Date.now()}`,
      type: 'balance',
      amount,
      method: (req.body.method || 'upi').toString(),
      reference: (req.body.reference || '').toString(),
      status: 'claimed',
      claimedAt: new Date().toISOString(),
    },
  ];
  await booking.save();
  res.status(201).json({ success: true, message: 'Balance payment recorded — awaiting vendor confirmation.', data: { booking } });
});

// 4f. Vendor (or admin) confirms a claimed payment; paid/remaining are recomputed.
app.put('/api/v1/bookings/:id/payments/:paymentId/confirm', authMiddleware(), async (req: Request, res: Response) => {
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (!(await callerOwnsVendor(req, booking.vendorId))) {
    return res.status(403).json({ success: false, message: 'This booking does not belong to your vendor listing.' });
  }

  const payment = (booking.payments || []).find((p: any) => p.id === req.params.paymentId);
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
  if (payment.status === 'confirmed') {
    return res.status(409).json({ success: false, message: 'This payment is already confirmed.' });
  }
  payment.status = 'confirmed';
  payment.confirmedAt = new Date().toISOString();
  booking.markModified('payments');
  recomputePayments(booking);
  await booking.save();
  res.json({ success: true, message: 'Payment confirmed.', data: { booking } });
});

// 4f-2. Create a Razorpay order for a booking's advance or balance payment.
//       Sized identically to the manual /confirm computation (advance) or the
//       ledger-derived remainingAmount (balance). If the vendor has completed
//       Razorpay Route onboarding, a transfer is attached so their share
//       auto-splits at capture; otherwise the order is plain and the full
//       amount collects to the platform balance for the existing manual
//       settlement flow — payment still succeeds either way.
app.post('/api/v1/bookings/:id/payments/razorpay/order', authMiddleware(), async (req: Request, res: Response) => {
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (booking.customerId !== req.user!.sub && req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'This booking does not belong to you.' });
  }

  const type: 'advance' | 'balance' = req.body?.type === 'balance' ? 'balance' : 'advance';
  const vendor = await fetchVendor(booking.vendorId);

  let amount: number;
  if (type === 'advance') {
    if ((booking.payments || []).some((p: any) => p.type === 'advance' && p.status === 'confirmed')) {
      return res.status(409).json({ success: false, message: 'The advance for this booking has already been paid.' });
    }
    amount = await computeAdvanceAmount(booking, vendor?.policies);
    if (amount <= 0) {
      // No advance required by policy (0% rate, or a price small enough to
      // round down to ₹0) — but confirmation should never be free. Charge
      // the full agreed price instead.
      amount = booking.agreedPrice;
    }
    if (amount <= 0) {
      // The booking itself has no price at all — genuinely nothing to
      // charge, and Razorpay refuses to create a zero-amount order outright.
      // Confirm directly instead of leaving it stuck forever with no way to
      // reach 'confirmed'.
      if (booking.status !== 'confirmed') {
        booking.status = 'confirmed';
        await booking.save();
        if (booking.vendorId && booking.eventDate) {
          fetch(`${MARKETPLACE_SERVICE_URL}/api/v1/vendors/${booking.vendorId}/book-slot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
            body: JSON.stringify({ date: booking.eventDate, slot: booking.timeSlot || '' }),
          }).catch(() => { /* vendor availability will still show the slot until they refresh — not fatal */ });
        }
      }
      return res.json({ success: true, data: { noPaymentNeeded: true, booking } });
    }
  } else {
    recomputePayments(booking);
    amount = booking.remainingAmount;
    if (amount <= 0) {
      return res.status(409).json({ success: false, message: 'This booking is already paid in full.' });
    }
  }

  const amountPaise = Math.round(amount * 100);
  const { commissionRate } = await getSettings();
  // The account itself is never "activated" (Razorpay only reports
  // created/suspended at the account level) — Route-transfer eligibility is
  // decided entirely by the route PRODUCT's own activation_status.
  const routeReady = vendor?.razorpay?.productStatus === 'activated';

  let transfers;
  if (routeReady && vendor?.razorpay?.accountId) {
    const commissionPaise = Math.round(amountPaise * commissionRate);
    const vendorSharePaise = amountPaise - commissionPaise;
    if (vendorSharePaise > 0) {
      transfers = [{
        account: vendor.razorpay.accountId,
        amount: vendorSharePaise,
        currency: 'INR',
        notes: { bookingId: booking.id, type },
      }];
    }
  }

  try {
    const order: any = await createMarketplaceOrder({
      amountPaise,
      receipt: `${booking.id}-${type}-${Date.now()}`.slice(0, 40),
      transfers,
      notes: { bookingId: booking.id, type, customerId: booking.customerId },
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        name: 'Magizhnaazh',
        description: booking.packageName || `${booking.vendorCategory} — ${type === 'advance' ? 'Advance' : 'Balance'} payment`,
        prefill: { name: booking.customerName || req.user!.email, email: req.user!.email },
      },
    });
  } catch (err: any) {
    console.error('Razorpay order creation error:', err?.error?.description || err?.message || err);
    res.status(502).json({ success: false, message: err?.error?.description || 'Failed to start payment. Please try again.' });
  }
});

// 4f-3. Verify a completed Razorpay payment and record it in the ledger. This
//       — not the client's checkout success callback — is the actual proof a
//       payment happened: the signature is an HMAC over
//       `${orderId}|${paymentId}` using the account secret, which only
//       Razorpay and this server can produce. On failure the ledger is left
//       untouched.
app.post('/api/v1/bookings/:id/payments/razorpay/verify', authMiddleware(), async (req: Request, res: Response) => {
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (booking.customerId !== req.user!.sub && req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'This booking does not belong to you.' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, type } = req.body || {};
  const paymentType: 'advance' | 'balance' = type === 'balance' ? 'balance' : 'advance';

  const valid = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!valid) {
    return res.status(400).json({ success: false, message: 'Payment verification failed: signature mismatch.' });
  }

  let amount: number;
  if (paymentType === 'advance') {
    const vendor = await fetchVendor(booking.vendorId);
    amount = await computeAdvanceAmount(booking, vendor?.policies);
  } else {
    recomputePayments(booking);
    amount = booking.remainingAmount;
  }

  await applyVerifiedRazorpayPayment(
    booking,
    { type: paymentType, amount, razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id },
    req.headers.authorization
  );

  res.json({ success: true, message: 'Payment verified.', data: { booking } });
});

// 4f-4. Razorpay webhook — backstop for when the client never calls /verify
//       (e.g. the browser closed mid-payment). Not JWT-authenticated; the HMAC
//       signature over the raw body IS the authentication. Always responds
//       200 quickly so Razorpay doesn't retry-storm a slow/broken handler.
app.post('/api/v1/bookings/webhooks/razorpay', async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = req.body as Buffer; // raw, thanks to the express.raw() scoped to this path above

  if (!verifyWebhookSignature({ rawBody, signature })) {
    console.warn('[Razorpay Webhook] Invalid signature — rejected.');
    return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(200).json({ success: true }); // malformed body — nothing to do, ack anyway
  }

  try {
    const event = payload?.event;
    if (event === 'payment.captured') {
      const payment = payload.payload?.payment?.entity;
      const bookingId = payment?.notes?.bookingId;
      const type: 'advance' | 'balance' = payment?.notes?.type === 'balance' ? 'balance' : 'advance';
      const booking = bookingId ? await BookingModel.findOne({ id: bookingId }) : null;
      if (booking) {
        let amount: number;
        if (type === 'advance') {
          const vendor = await fetchVendor(booking.vendorId);
          amount = await computeAdvanceAmount(booking, vendor?.policies);
        } else {
          recomputePayments(booking);
          amount = booking.remainingAmount;
        }
        await applyVerifiedRazorpayPayment(booking, { type, amount, razorpayOrderId: payment.order_id, razorpayPaymentId: payment.id });
      }
    } else if (event === 'transfer.processed') {
      const transfer = payload.payload?.transfer?.entity;
      const bookingId = transfer?.notes?.bookingId;
      const booking = bookingId ? await BookingModel.findOne({ id: bookingId }) : null;
      const entry = booking && (booking.payments || []).find((p: any) => p.razorpayPaymentId === transfer?.source?.id);
      if (booking && entry) {
        entry.razorpayTransferId = transfer.id;
        booking.markModified('payments');
        await booking.save();
      }
    } else if (event === 'transfer.failed') {
      // No transfer id gets stamped, so the settlement register naturally
      // falls back to manual payout for this amount — just log for visibility.
      console.warn('[Razorpay Webhook] transfer.failed', payload.payload?.transfer?.entity?.id);
    }
  } catch (err: any) {
    console.error('[Razorpay Webhook] processing error:', err?.message || err);
  }

  res.status(200).json({ success: true });
});

// 4g. GST invoice for a booking, rendered as a printable document by the web
//     apps. Accessible to the customer, the owning vendor, or an admin.
app.get('/api/v1/bookings/:id/invoice', authMiddleware(), async (req: Request, res: Response) => {
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

  const isCustomer = booking.customerId === req.user!.sub;
  const isOwner = await callerOwnsVendor(req, booking.vendorId);
  if (!isCustomer && !isOwner) {
    return res.status(403).json({ success: false, message: 'You are not allowed to view this invoice.' });
  }

  // Assign a stable invoice number the first time an invoice is generated.
  if (!booking.invoiceNumber) {
    booking.invoiceNumber = `INV-${booking.bookingNumber}`;
    booking.invoiceIssuedAt = new Date().toISOString();
    // Backfill the customer name from the requester when missing.
    if (!booking.customerName && isCustomer) booking.customerName = req.user!.email || '';
    await booking.save();
  }

  const { gstRate } = await getSettings();
  const vendor = await fetchVendor(booking.vendorId);
  recomputePayments(booking);

  const grandTotal = booking.agreedPrice;
  // Prices are treated as GST-inclusive; back out the taxable value and tax.
  const taxableValue = Math.round(grandTotal / (1 + gstRate));
  const totalGst = grandTotal - taxableValue;
  const cgst = Math.round(totalGst / 2);
  const sgst = totalGst - cgst;

  const lineItems = (booking.spendItems && booking.spendItems.length > 0)
    ? booking.spendItems.map((s: any) => ({ label: s.label, amount: s.amount }))
    : [{ label: booking.packageName || `${booking.vendorCategory} service`, amount: grandTotal }];

  const invoice = {
    invoiceNumber: booking.invoiceNumber,
    issuedAt: booking.invoiceIssuedAt,
    eventDate: booking.eventDate,
    seller: {
      name: booking.vendorName || vendor?.businessName || 'Vendor',
      gstin: vendor?.verification?.gstNumber || undefined,
      address: vendor ? [vendor.location?.address, vendor.location?.city, vendor.location?.state, vendor.location?.pincode].filter(Boolean).join(', ') : undefined,
      email: vendor?.contactEmail || undefined,
      phone: vendor?.contactPhone || undefined,
    },
    buyer: { name: booking.customerName || 'Customer', email: isCustomer ? req.user!.email : undefined },
    lineItems,
    gstRate,
    taxableValue,
    cgst,
    sgst,
    totalGst,
    grandTotal,
    advancePaid: booking.advanceAmountPaid,
    balanceDue: booking.remainingAmount,
    paidInFull: booking.paidInFull,
  };
  res.json({ success: true, data: { invoice } });
});

// 4h. Admin settlement register — per-booking commission and vendor payout.
app.get('/api/v1/settlements', authMiddleware(), async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  const { commissionRate, vendorPayoutHoldDays } = await getSettings();
  const bookings = await BookingModel.find({ status: { $in: ['confirmed', 'in_progress', 'completed'] } }).sort({ createdAt: -1 }).limit(500);
  const now = Date.now();
  const settlements = bookings.map((b) => {
    const commission = Math.round(b.agreedPrice * commissionRate);
    const eligibleOn = payoutEligibleOn(b.eventDate, vendorPayoutHoldDays);
    // Payments Razorpay Route already auto-transferred to the vendor (tagged
    // with a razorpayTransferId) aren't owed again through manual settlement —
    // without this, the admin would be told to pay out money Razorpay already sent.
    const alreadyAutoSettled = (b.payments || [])
      .filter((p: any) => p.razorpayTransferId)
      .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    return {
      bookingId: b.id,
      bookingNumber: b.bookingNumber,
      vendorId: b.vendorId,
      vendorName: b.vendorName,
      agreedPrice: b.agreedPrice,
      collected: b.advanceAmountPaid,
      commission,
      alreadyAutoSettled,
      vendorPayout: Math.max(0, b.agreedPrice - commission - alreadyAutoSettled),
      paidInFull: b.paidInFull || false,
      settlementStatus: b.settlementStatus || 'pending',
      settledAt: b.settledAt || null,
      eventDate: b.eventDate,
      payoutEligibleOn: eligibleOn,
      payoutEligible: !eligibleOn || Date.parse(eligibleOn) <= now,
    };
  });
  const totals = settlements.reduce(
    (acc, s) => {
      acc.commission += s.commission;
      acc.payout += s.vendorPayout;
      acc.collected += s.collected;
      if (s.settlementStatus === 'pending') acc.pendingPayout += s.vendorPayout;
      return acc;
    },
    { commission: 0, payout: 0, collected: 0, pendingPayout: 0 }
  );
  res.json({ success: true, data: { settlements, totals } });
});

// 4i. Admin marks a booking's vendor payout as settled.
app.put('/api/v1/bookings/:id/settle', authMiddleware(), async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  const settle = req.body?.settled !== false; // default true
  if (settle && req.body?.force !== true) {
    const { vendorPayoutHoldDays } = await getSettings();
    const eligibleOn = payoutEligibleOn(booking.eventDate, vendorPayoutHoldDays);
    if (eligibleOn && Date.parse(eligibleOn) > Date.now()) {
      return res.status(400).json({
        success: false,
        message: `Payout is on hold until ${eligibleOn.slice(0, 10)} (event date + ${vendorPayoutHoldDays}-day hold). Send { "force": true } to override.`,
      });
    }
  }
  booking.settlementStatus = settle ? 'settled' : 'pending';
  booking.settledAt = settle ? new Date().toISOString() : undefined;
  await booking.save();
  res.json({ success: true, message: `Marked ${settle ? 'settled' : 'pending'}.`, data: { booking } });
});

// 4j. The vendor's private calendar-subscription token (owner/admin only). The
//     web app builds the .ics subscribe URL from this so vendors can add their
//     bookings to Google/Apple/Outlook Calendar.
app.get('/api/v1/bookings/vendor/:vendorId/calendar-token', authMiddleware(), async (req: Request, res: Response) => {
  if (!(await callerOwnsVendor(req, req.params.vendorId))) {
    return res.status(403).json({ success: false, message: 'This vendor listing does not belong to you.' });
  }
  res.json({ success: true, data: { token: calendarToken(req.params.vendorId) } });
});

// 4k. Public iCalendar feed of a vendor's confirmed bookings, gated by the
//     per-vendor token (calendar apps can't send auth headers, so a secret URL
//     is the standard approach). Subscribe to it in Google Calendar via
//     "Add calendar → From URL".
app.get('/api/v1/bookings/vendor/:vendorId/calendar.ics', async (req: Request, res: Response) => {
  const { vendorId } = req.params;
  if (req.query.token !== calendarToken(vendorId)) {
    return res.status(403).send('Invalid calendar token.');
  }
  const bookings = await BookingModel.find({
    vendorId,
    status: { $in: ['confirmed', 'in_progress', 'completed'] },
  }).limit(1000);

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Magizhnaazh//Vendor Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Magizhnaazh Bookings',
  ];
  for (const b of bookings) {
    const start = icsDate(b.eventDate);
    if (!start) continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${b.id}@magizhnaazh`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${icsDatePlusOne(b.eventDate)}`,
      `SUMMARY:${icsEscape(`${b.vendorCategory || 'Booking'} — ${b.customerName || 'Customer'}`)}`,
      `DESCRIPTION:${icsEscape(`Booking ${b.bookingNumber}. ${b.packageName || ''} ₹${b.agreedPrice}. Status: ${b.status}.`)}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="magizhnaazh-bookings.ics"');
  res.send(lines.join('\r\n'));
});

// 5. Admin platform metrics
app.get('/api/v1/bookings/admin/metrics', authMiddleware(), async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }

  const bookings = await BookingModel.find();
  const { commissionRate } = await getSettings();
  const totalVolume = bookings.reduce((acc, b) => acc + b.agreedPrice, 0);
  const totalAdvance = bookings.reduce((acc, b) => acc + b.advanceAmountPaid, 0);
  const totalCommission = Math.round(totalVolume * commissionRate);

  res.json({
    success: true,
    data: {
      totalBookings: bookings.length,
      grossBookingVolume: totalVolume,
      totalAdvanceCollected: totalAdvance,
      platformCommissionEarned: totalCommission,
    },
  });
});

// --- Platform settings (commission rate, advance deposit rate) ---
app.get('/api/v1/settings', authMiddleware(), async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  const settings = await getSettings();
  res.json({ success: true, data: { settings } });
});

// Public, unauthenticated read of non-sensitive settings — used by the customer
// app to pick up the site-wide theme the admin chose. Never exposes commission
// or deposit rates.
app.get('/api/v1/settings/public', async (_req: Request, res: Response) => {
  const settings = await getSettings();
  res.json({ success: true, data: { settings: { theme: settings.theme } } });
});

app.put('/api/v1/settings', authMiddleware(), async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }

  const { commissionRate, advanceDepositRate, gstRate, advanceDepositMinRate, advanceDepositMaxRate, vendorPayoutHoldDays, theme } = req.body;
  const isFraction = (v: any) => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 1;
  if (commissionRate !== undefined && !isFraction(commissionRate)) {
    return res.status(400).json({ success: false, message: 'commissionRate must be a fraction between 0 and 1 (e.g. 0.1 for 10%).' });
  }
  if (advanceDepositRate !== undefined && !isFraction(advanceDepositRate)) {
    return res.status(400).json({ success: false, message: 'advanceDepositRate must be a fraction between 0 and 1 (e.g. 0.3 for 30%).' });
  }
  if (gstRate !== undefined && !isFraction(gstRate)) {
    return res.status(400).json({ success: false, message: 'gstRate must be a fraction between 0 and 1 (e.g. 0.18 for 18%).' });
  }
  if (advanceDepositMinRate !== undefined && !isFraction(advanceDepositMinRate)) {
    return res.status(400).json({ success: false, message: 'advanceDepositMinRate must be a fraction between 0 and 1.' });
  }
  if (advanceDepositMaxRate !== undefined && !isFraction(advanceDepositMaxRate)) {
    return res.status(400).json({ success: false, message: 'advanceDepositMaxRate must be a fraction between 0 and 1.' });
  }
  if (vendorPayoutHoldDays !== undefined && (isNaN(Number(vendorPayoutHoldDays)) || Number(vendorPayoutHoldDays) < 0 || Number(vendorPayoutHoldDays) > 365)) {
    return res.status(400).json({ success: false, message: 'vendorPayoutHoldDays must be a whole number of days between 0 and 365.' });
  }
  if (theme !== undefined && theme !== 'light' && theme !== 'dark') {
    return res.status(400).json({ success: false, message: "theme must be 'light' or 'dark'." });
  }

  let settings = await PlatformSettingsModel.findOne({});
  if (!settings) settings = new PlatformSettingsModel({});

  if (commissionRate !== undefined) settings.commissionRate = Number(commissionRate);
  if (advanceDepositRate !== undefined) settings.advanceDepositRate = Number(advanceDepositRate);
  if (gstRate !== undefined) settings.gstRate = Number(gstRate);
  if (advanceDepositMinRate !== undefined) settings.advanceDepositMinRate = Number(advanceDepositMinRate);
  if (advanceDepositMaxRate !== undefined) settings.advanceDepositMaxRate = Number(advanceDepositMaxRate);
  if (vendorPayoutHoldDays !== undefined) settings.vendorPayoutHoldDays = Math.round(Number(vendorPayoutHoldDays));
  if (theme !== undefined) settings.theme = theme;
  // Keep the guardrail sane: min must not exceed max.
  if (typeof settings.advanceDepositMinRate === 'number' && typeof settings.advanceDepositMaxRate === 'number'
      && settings.advanceDepositMinRate > settings.advanceDepositMaxRate) {
    return res.status(400).json({ success: false, message: 'advanceDepositMinRate cannot be greater than advanceDepositMaxRate.' });
  }
  settings.updatedAt = new Date().toISOString();
  await settings.save();

  res.json({ success: true, message: 'Platform settings updated.', data: { settings } });
});

// --- Coupons (admin-managed; not yet applied to booking pricing) ---
app.get('/api/v1/coupons', authMiddleware(), async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  const coupons = await CouponModel.find().sort({ createdAt: -1 });
  res.json({ success: true, data: { coupons } });
});

app.post('/api/v1/coupons', authMiddleware(), async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  const { code, discountPercent, expiresAt } = req.body;
  if (!code || !discountPercent) {
    return res.status(400).json({ success: false, message: 'code and discountPercent are required.' });
  }

  try {
    const coupon = await CouponModel.create({ id: `cpn-${Date.now()}`, code, discountPercent: Number(discountPercent), expiresAt });
    res.status(201).json({ success: true, message: 'Coupon created.', data: { coupon } });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'A coupon with this code already exists.' });
    }
    throw err;
  }
});

app.delete('/api/v1/coupons/:id', authMiddleware(), async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  await CouponModel.deleteOne({ id: req.params.id });
  res.json({ success: true, message: 'Coupon removed.' });
});

async function start() {
  await connectDB(process.env.MONGODB_URI, 'booking-payment-service');
  await seedIfEmpty();
  await cleanupDemoBookings();
  if (process.env.SEED_DEMO_BOOKINGS === 'true') {
    await seedDemoBookings();
  }
  app.listen(PORT, () => {
    console.log(`[Booking & Payment Microservice] Running on http://localhost:${PORT}`);
  });
}

start();
// reload 2
