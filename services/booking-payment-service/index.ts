import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from '../../packages/shared-utils/db';
import { authMiddleware } from '../../packages/shared-utils/auth';
import { requestLogger } from '../../packages/shared-utils/logging';
import { BookingModel } from './models/Booking';

const app = express();
const PORT = process.env.PORT || 8004;
const PLATFORM_COMMISSION_RATE = 0.1;
const ADVANCE_DEPOSIT_RATE = 0.3;

app.use(cors());
app.use(express.json());
app.use(requestLogger('booking-payment-service'));

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

  res.status(201).json({
    success: true,
    message: 'Quotation request sent to vendor.',
    data: { booking, platformCommission: Math.round(agreedPrice * PLATFORM_COMMISSION_RATE) },
  });
});

// 2. List bookings (scoped to the caller unless admin)
app.get('/api/v1/bookings', authMiddleware(), async (req: Request, res: Response) => {
  const filter = req.user!.role === 'admin' ? {} : { $or: [{ customerId: req.user!.sub }, { vendorId: req.user!.sub }] };
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

  const advance = Math.round(booking.agreedPrice * ADVANCE_DEPOSIT_RATE);
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
  const totalVolume = bookings.reduce((acc, b) => acc + b.agreedPrice, 0);
  const totalAdvance = bookings.reduce((acc, b) => acc + b.advanceAmountPaid, 0);
  const totalCommission = Math.round(totalVolume * PLATFORM_COMMISSION_RATE);

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

async function start() {
  await connectDB(process.env.MONGODB_URI, 'booking-payment-service');
  await seedIfEmpty();
  app.listen(PORT, () => {
    console.log(`[Booking & Payment Microservice] Running on http://localhost:${PORT}`);
  });
}

start();
