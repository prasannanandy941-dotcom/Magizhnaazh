import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { randomBytes } from 'crypto';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from '../../packages/shared-utils/db';
import { authMiddleware } from '../../packages/shared-utils/auth';
import { requestLogger } from '../../packages/shared-utils/logging';
import { GuestModel } from './models/Guest';
import { EventFeedbackModel } from './models/EventFeedback';
import { ReviewModel } from './models/Review';

const app = express();
const PORT = process.env.PORT || 8006;
const BOOKING_SERVICE_URL = process.env.BOOKING_PAYMENT_SERVICE_URL || 'http://localhost:8004';

app.use(cors());
app.use(express.json());
app.use(requestLogger('guest-feedback-service'));

function secureToken(): string {
  return randomBytes(12).toString('base64url');
}

async function seedIfEmpty() {
  const guestCount = await GuestModel.countDocuments();
  if (guestCount === 0) {
    await GuestModel.create([
      { id: 'g-1', eventId: 'evt-101', name: 'Dr. R. Venkatraman', email: 'venkat@gmail.com', phone: '+91 9840112233', group: 'Groom Family', status: 'accepted', adultsCount: 2, dietaryPreference: 'Veg', needsTransport: true, needsAccommodation: true, respondedAt: new Date().toISOString() },
      { id: 'g-2', eventId: 'evt-101', name: 'Suresh & Anitha Kumar', email: 'suresh@yahoo.com', phone: '+91 9840223344', group: 'Bride Family', status: 'accepted', adultsCount: 2, dietaryPreference: 'Veg', respondedAt: new Date().toISOString() },
    ]);
  }

  const feedbackCount = await EventFeedbackModel.countDocuments();
  if (feedbackCount === 0) {
    await EventFeedbackModel.create({
      id: 'fb-1',
      eventId: 'evt-101',
      feedbackToken: secureToken(),
      guestName: 'Kavitha S.',
      overallRating: 5,
      venueRating: 5,
      cateringRating: 5,
      decorationRating: 5,
      comments: 'The banana leaf feast and ocean deck venue were magnificent!',
    });
  }

  const reviewCount = await ReviewModel.countDocuments();
  if (reviewCount === 0) {
    await ReviewModel.create({
      id: 'rev-1',
      vendorId: 'vnd-1',
      customerId: 'usr-customer-1',
      customerName: 'Felix Kumar',
      bookingId: 'bk-1',
      overallRating: 5,
      serviceQuality: 5,
      professionalism: 5,
      valueForMoney: 5,
      communication: 5,
      punctuality: 5,
      comment: 'Grand ballroom and ocean view deck made our wedding unforgettable. Staff was extremely cooperative.',
      eventType: 'Wedding',
      eventDate: '2026-12-15',
    });
  }

  if (guestCount === 0 || feedbackCount === 0 || reviewCount === 0) {
    console.log('[guest-feedback-service] Seeded demo guests/feedback/reviews.');
  }
}

// 1. Add guest to roster (organizer only)
app.post('/api/v1/guests', authMiddleware(), async (req: Request, res: Response) => {
  const { eventId, name, email, phone, group, adultsCount, childrenCount, dietaryPreference, needsTransport, needsAccommodation } = req.body;

  const guest = await GuestModel.create({
    id: `g-${Date.now()}`,
    eventId: eventId || 'evt-101',
    name: name || 'Guest Name',
    email,
    phone,
    group: group || 'Family',
    status: 'invited',
    adultsCount: Number(adultsCount) || 1,
    childrenCount: Number(childrenCount) || 0,
    dietaryPreference: dietaryPreference || 'Veg',
    needsTransport: Boolean(needsTransport),
    needsAccommodation: Boolean(needsAccommodation),
  });

  res.status(201).json({ success: true, message: 'Guest added to event roster.', data: { guest } });
});

// 2. Guest roster for an event (organizer only)
app.get('/api/v1/guests/event/:eventId', authMiddleware(), async (req: Request, res: Response) => {
  const guests = await GuestModel.find({ eventId: req.params.eventId });
  res.json({ success: true, count: guests.length, data: { guests } });
});

// 3. Public RSVP submission — no account required.
app.post('/api/v1/guests/rsvp', async (req: Request, res: Response) => {
  const { name, eventId, status, adultsCount, childrenCount, dietaryPreference } = req.body;
  if (!name || !eventId) {
    return res.status(400).json({ success: false, message: 'name and eventId are required.' });
  }

  const guest = await GuestModel.create({
    id: `g-rsvp-${Date.now()}`,
    eventId,
    name,
    group: 'Web RSVP',
    status: status === 'declined' ? 'declined' : status === 'maybe' ? 'maybe' : 'accepted',
    adultsCount: Number(adultsCount) || 1,
    childrenCount: Number(childrenCount) || 0,
    dietaryPreference: dietaryPreference || 'Veg',
    respondedAt: new Date().toISOString(),
  });

  res.json({ success: true, message: 'RSVP response recorded.', data: { guest } });
});

// 4. Public event feedback submission — no account required.
app.post('/api/v1/feedback', async (req: Request, res: Response) => {
  const { eventId, guestName, overallRating, venueRating, cateringRating, decorationRating, organizationRating, photographyRating, comments } = req.body;
  if (!eventId || !overallRating) {
    return res.status(400).json({ success: false, message: 'eventId and overallRating are required.' });
  }

  const feedback = await EventFeedbackModel.create({
    id: `fb-${Date.now()}`,
    eventId,
    feedbackToken: secureToken(),
    guestName: guestName || 'Anonymous Guest',
    overallRating: Number(overallRating),
    venueRating: venueRating ? Number(venueRating) : undefined,
    cateringRating: cateringRating ? Number(cateringRating) : undefined,
    decorationRating: decorationRating ? Number(decorationRating) : undefined,
    organizationRating: organizationRating ? Number(organizationRating) : undefined,
    photographyRating: photographyRating ? Number(photographyRating) : undefined,
    comments: comments || '',
  });

  res.status(201).json({ success: true, message: 'Event feedback recorded.', data: { feedback } });
});

// 5. Submit a verified vendor review — only for a completed booking the caller owns.
app.post('/api/v1/reviews', authMiddleware(), async (req: Request, res: Response) => {
  const { vendorId, bookingId, overallRating, serviceQuality, professionalism, valueForMoney, communication, punctuality, comment } = req.body;
  if (!vendorId || !bookingId || !overallRating) {
    return res.status(400).json({ success: false, message: 'vendorId, bookingId and overallRating are required.' });
  }

  let booking: any;
  try {
    const bookingRes = await fetch(`${BOOKING_SERVICE_URL}/api/v1/bookings/${bookingId}`);
    if (!bookingRes.ok) {
      return res.status(404).json({ success: false, message: 'Booking not found — cannot verify review.' });
    }
    const bookingJson = await bookingRes.json();
    booking = bookingJson.data.booking;
  } catch {
    return res.status(502).json({ success: false, message: 'Could not reach booking service to verify this review.' });
  }

  if (booking.customerId !== req.user!.sub || booking.vendorId !== vendorId) {
    return res.status(403).json({ success: false, message: 'This booking does not belong to you and this vendor.' });
  }
  if (booking.status !== 'completed') {
    return res.status(403).json({ success: false, message: 'Reviews can only be left after the booking is completed.' });
  }

  try {
    const review = await ReviewModel.create({
      id: `rev-${Date.now()}`,
      vendorId,
      customerId: req.user!.sub,
      customerName: req.body.customerName || req.user!.email,
      bookingId,
      overallRating: Number(overallRating),
      serviceQuality: Number(serviceQuality) || 5,
      professionalism: Number(professionalism) || 5,
      valueForMoney: Number(valueForMoney) || 5,
      communication: Number(communication) || 5,
      punctuality: Number(punctuality) || 5,
      comment: comment || '',
      eventType: booking.vendorCategory || '',
      eventDate: booking.eventDate || '',
    });
    res.status(201).json({ success: true, message: 'Verified vendor review published.', data: { review } });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this vendor for this booking.' });
    }
    throw err;
  }
});

async function start() {
  await connectDB(process.env.MONGODB_URI, 'guest-feedback-service');
  await seedIfEmpty();
  app.listen(PORT, () => {
    console.log(`[Guest & Feedback Microservice] Running on http://localhost:${PORT}`);
  });
}

start();
