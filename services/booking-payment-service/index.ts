import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from '../../packages/shared-utils/db';
import { authMiddleware } from '../../packages/shared-utils/auth';
import { requestLogger } from '../../packages/shared-utils/logging';
import { registerHealthRoute } from '../../packages/shared-utils/health';
import { BookingModel } from './models/Booking';
import { PlatformSettingsModel, getSettings } from './models/PlatformSettings';
import { CouponModel } from './models/Coupon';

const app = express();
const PORT = process.env.PORT || 8004;
const MARKETPLACE_SERVICE_URL = process.env.MARKETPLACE_SERVICE_URL || 'http://localhost:8002';

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

// 1. Request a quote (enquiry)
app.post('/api/v1/bookings/quote', authMiddleware(), async (req: Request, res: Response) => {
  const { eventId, vendorId, vendorName, vendorCategory, packageId, packageName, price, eventDate, specialInstructions } = req.body;

  const agreedPrice = Number(price) || 50000;

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
    status: 'quote_requested',
    eventDate: eventDate || '2026-12-15',
    specialInstructions: specialInstructions || '',
  });

  const { commissionRate } = await getSettings();
  res.status(201).json({
    success: true,
    message: 'Quotation request sent to vendor.',
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

  const { advanceDepositRate } = await getSettings();
  const advance = Math.round(booking.agreedPrice * advanceDepositRate);
  booking.status = 'confirmed';
  booking.advanceAmountPaid = advance;
  booking.remainingAmount = booking.agreedPrice - advance;
  await booking.save();

  res.json({ success: true, message: 'Booking quote confirmed and advance deposit processed.', data: { booking } });
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

app.put('/api/v1/settings', authMiddleware(), async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }

  const { commissionRate, advanceDepositRate } = req.body;
  let settings = await PlatformSettingsModel.findOne({});
  if (!settings) settings = new PlatformSettingsModel({});

  if (commissionRate !== undefined) settings.commissionRate = Number(commissionRate);
  if (advanceDepositRate !== undefined) settings.advanceDepositRate = Number(advanceDepositRate);
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
  app.listen(PORT, () => {
    console.log(`[Booking & Payment Microservice] Running on http://localhost:${PORT}`);
  });
}

start();
