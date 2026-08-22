import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

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

const app = express();
const PORT = process.env.PORT || 8004;
const MARKETPLACE_SERVICE_URL = serviceUrl(process.env.MARKETPLACE_SERVICE_URL, 'http://localhost:8002');

app.use(cors());
app.use(express.json());
app.use(requestLogger('booking-payment-service'));
registerHealthRoute(app, 'booking-payment-service');

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

// 1. Request a quote (enquiry)
app.post('/api/v1/bookings/quote', authMiddleware(), async (req: Request, res: Response) => {
  // The customer-web client sends this as `notes` (its own custom-request text
  // field); accept `specialInstructions` too for any other caller.
  const { eventId, vendorId, vendorName, vendorCategory, packageId, packageName, price, eventDate, notes, specialInstructions, selectedOptions, referenceImages, advancePaymentClaimed } = req.body;

  const agreedPrice = Number(price) || 50000;
  const resolvedEventDate = eventDate || '2026-12-15';

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

  const booking = await BookingModel.create({
    id: `bk-${Date.now()}`,
    bookingNumber: `BK-${Date.now()}`,
    eventId: eventId || 'evt-101',
    customerId: req.user!.sub,
    vendorId: vendorId || 'vnd-1',
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
    specialInstructions: notes || specialInstructions || '',
    selectedOptions: Array.isArray(selectedOptions) ? selectedOptions : [],
    referenceImages: Array.isArray(referenceImages) ? referenceImages : [],
  });

  // A confirmed booking (advance claimed) takes that date off the vendor's
  // availability so nobody else can book the same day. Best-effort: the booking
  // already succeeded, so a failure here must not fail the request. Only closes
  // when the vendor actually uses date-based availability (an enquiry-only
  // quote_requested doesn't lock the date).
  if (advancePaymentClaimed && vendorId && resolvedEventDate) {
    fetch(`${MARKETPLACE_SERVICE_URL}/api/v1/vendors/${vendorId}/book-date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
      body: JSON.stringify({ date: resolvedEventDate }),
    }).catch(() => {
      /* vendor availability will still show the date until they refresh — not fatal */
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

    const bookings = await BookingModel.find({ vendorId: String(vendorId) }).limit(200);
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

// 4. Confirm booking + simulate advance deposit collection
app.put('/api/v1/bookings/:id/confirm', authMiddleware(), async (req: Request, res: Response) => {
  const booking = await BookingModel.findOne({ id: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

  // Only the vendor this booking belongs to (or an admin) may confirm it —
  // the customer's own "I paid" claim lands the booking in 'pending_payment'
  // (see the /quote route) but does not confirm it; confirmation, and the
  // advance amount that gets recorded, is the vendor's call.
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

  // Use the specific vendor's own advance requirement (set on their Business
  // Profile) rather than one platform-wide rate for everyone — this is the
  // same amount the customer was shown as "Advance Required" on the
  // vendor's page, so what gets charged now actually matches that. A flat
  // advanceAmount, when the vendor has set one, overrides the percentage.
  let advance: number;
  try {
    const vendorRes = await fetch(`${MARKETPLACE_SERVICE_URL}/api/v1/vendors/${booking.vendorId}`);
    const vendorJson = vendorRes.ok ? await vendorRes.json() : null;
    const vendorPolicies = vendorJson?.data?.vendor?.policies;
    const flatAdvance = vendorPolicies?.advanceAmount;
    if (typeof flatAdvance === 'number' && flatAdvance > 0) {
      advance = Math.min(flatAdvance, booking.agreedPrice);
    } else {
      const vendorRatePercent = vendorPolicies?.advancePercentage;
      const advanceRate = typeof vendorRatePercent === 'number' ? vendorRatePercent / 100 : (await getSettings()).advanceDepositRate;
      advance = Math.round(booking.agreedPrice * advanceRate);
    }
  } catch {
    advance = Math.round(booking.agreedPrice * (await getSettings()).advanceDepositRate);
  }
  booking.status = 'confirmed';
  booking.advanceAmountPaid = advance;
  booking.remainingAmount = booking.agreedPrice - advance;
  await booking.save();

  res.json({ success: true, message: 'Booking quote confirmed and advance deposit processed.', data: { booking } });
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

  const { commissionRate, advanceDepositRate, theme } = req.body;
  if (commissionRate !== undefined && (isNaN(Number(commissionRate)) || Number(commissionRate) < 0 || Number(commissionRate) > 1)) {
    return res.status(400).json({ success: false, message: 'commissionRate must be a fraction between 0 and 1 (e.g. 0.1 for 10%).' });
  }
  if (advanceDepositRate !== undefined && (isNaN(Number(advanceDepositRate)) || Number(advanceDepositRate) < 0 || Number(advanceDepositRate) > 1)) {
    return res.status(400).json({ success: false, message: 'advanceDepositRate must be a fraction between 0 and 1 (e.g. 0.3 for 30%).' });
  }
  if (theme !== undefined && theme !== 'light' && theme !== 'dark') {
    return res.status(400).json({ success: false, message: "theme must be 'light' or 'dark'." });
  }

  let settings = await PlatformSettingsModel.findOne({});
  if (!settings) settings = new PlatformSettingsModel({});

  if (commissionRate !== undefined) settings.commissionRate = Number(commissionRate);
  if (advanceDepositRate !== undefined) settings.advanceDepositRate = Number(advanceDepositRate);
  if (theme !== undefined) settings.theme = theme;
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
  await seedDemoBookings();
  app.listen(PORT, () => {
    console.log(`[Booking & Payment Microservice] Running on http://localhost:${PORT}`);
  });
}

start();
// reload 2
