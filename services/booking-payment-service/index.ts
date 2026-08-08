import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8004;

app.use(cors());
app.use(express.json());

interface Booking {
  id: string;
  bookingNumber: string;
  eventId: string;
  customerId: string;
  customerName: string;
  vendorId: string;
  vendorName: string;
  packageName: string;
  agreedPrice: number;
  advanceAmountPaid: number;
  platformCommission: number;
  status: 'quote_requested' | 'confirmed' | 'completed' | 'cancelled';
  eventDate: string;
  specialInstructions?: string;
  createdAt: string;
}

const BOOKINGS: Booking[] = [
  {
    id: 'bk-1',
    bookingNumber: 'BK-20260808-9481',
    eventId: 'evt-101',
    customerId: 'usr-customer-1',
    customerName: 'Felix Kumar',
    vendorId: 'vnd-1',
    vendorName: 'The Leela Palace Grand Ballroom',
    packageName: 'Royal Ballroom Package',
    agreedPrice: 150000,
    advanceAmountPaid: 45000,
    platformCommission: 15000,
    status: 'confirmed',
    eventDate: '2026-12-15',
    specialInstructions: 'Need red carpet entry and stage microphone setup.',
    createdAt: new Date().toISOString(),
  },
];

// 1. Request Quote / Initial Booking (Customer Role)
app.post('/api/v1/bookings/quote', (req: Request, res: Response) => {
  const { eventId, vendorId, vendorName, packageName, price, eventDate, specialInstructions } = req.body;

  const agreedPrice = Number(price) || 50000;
  const platformCommission = Math.round(agreedPrice * 0.1); // 10% platform fee

  const newBooking: Booking = {
    id: `bk-${Date.now()}`,
    bookingNumber: `BK-${Date.now()}`,
    eventId: eventId || 'evt-101',
    customerId: 'usr-customer-1',
    customerName: 'Felix Kumar',
    vendorId: vendorId || 'vnd-1',
    vendorName: vendorName || 'Vendor Partner',
    packageName: packageName || 'Standard Package',
    agreedPrice,
    advanceAmountPaid: 0,
    platformCommission,
    status: 'quote_requested',
    eventDate: eventDate || '2026-12-15',
    specialInstructions: specialInstructions || '',
    createdAt: new Date().toISOString(),
  };

  BOOKINGS.push(newBooking);
  res.status(201).json({ success: true, message: 'Quotation request sent to vendor.', data: { booking: newBooking } });
});

// 2. Get Bookings List
app.get('/api/v1/bookings', (req: Request, res: Response) => {
  res.json({ success: true, count: BOOKINGS.length, data: { bookings: BOOKINGS } });
});

// 3. Confirm / Accept Quote (Vendor or Customer Role)
app.put('/api/v1/bookings/:id/confirm', (req: Request, res: Response) => {
  const booking = BOOKINGS.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

  booking.status = 'confirmed';
  booking.advanceAmountPaid = Math.round(booking.agreedPrice * 0.3); // 30% advance deposit

  res.json({ success: true, message: 'Booking quote confirmed and advance deposit processed.', data: { booking } });
});

// 4. Admin Analytics / Platform Commission Summary (Admin Role)
app.get('/api/v1/bookings/admin/metrics', (req: Request, res: Response) => {
  const totalVolume = BOOKINGS.reduce((acc, b) => acc + b.agreedPrice, 0);
  const totalAdvance = BOOKINGS.reduce((acc, b) => acc + b.advanceAmountPaid, 0);
  const totalCommission = BOOKINGS.reduce((acc, b) => acc + b.platformCommission, 0);

  res.json({
    success: true,
    data: {
      totalBookings: BOOKINGS.length,
      grossBookingVolume: totalVolume,
      totalAdvanceCollected: totalAdvance,
      platformCommissionEarned: totalCommission,
    },
  });
});

app.listen(PORT, () => {
  console.log(`[Booking & Payment Microservice] Running on http://localhost:${PORT}`);
});
