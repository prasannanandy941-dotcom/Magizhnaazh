import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8006;

app.use(cors());
app.use(express.json());

interface Guest {
  id: string;
  eventId: string;
  name: string;
  email?: string;
  phone?: string;
  group: string;
  status: 'invited' | 'accepted' | 'declined';
  adultsCount: number;
  dietaryPreference?: string;
  needsTransport?: boolean;
  needsAccommodation?: boolean;
}

interface EventFeedback {
  id: string;
  eventId: string;
  guestName: string;
  overallRating: number;
  venueRating?: number;
  cateringRating?: number;
  decorationRating?: number;
  comments?: string;
  createdAt: string;
}

interface Review {
  id: string;
  vendorId: string;
  customerId: string;
  customerName: string;
  overallRating: number;
  serviceQuality: number;
  punctuality: number;
  reviewText: string;
  createdAt: string;
}

const GUESTS: Guest[] = [
  { id: 'g-1', eventId: 'evt-101', name: 'Dr. R. Venkatraman', email: 'venkat@gmail.com', phone: '+91 9840112233', group: 'Groom Family', status: 'accepted', adultsCount: 2, dietaryPreference: 'Veg', needsTransport: true, needsAccommodation: true },
  { id: 'g-2', eventId: 'evt-101', name: 'Suresh & Anitha Kumar', email: 'suresh@yahoo.com', phone: '+91 9840223344', group: 'Bride Family', status: 'accepted', adultsCount: 2, dietaryPreference: 'Veg', needsTransport: false, needsAccommodation: false },
];

const FEEDBACKS: EventFeedback[] = [
  { id: 'fb-1', eventId: 'evt-101', guestName: 'Kavitha S.', overallRating: 5, venueRating: 5, cateringRating: 5, decorationRating: 5, comments: 'The banana leaf feast and ocean deck venue were magnificent!', createdAt: new Date().toISOString() },
];

const REVIEWS: Review[] = [
  { id: 'rev-1', vendorId: 'vnd-1', customerId: 'usr-customer-1', customerName: 'Felix Kumar', overallRating: 5, serviceQuality: 5, punctuality: 5, reviewText: 'Grand ballroom and ocean view deck made our wedding unforgettable. Staff was extremely cooperative.', createdAt: new Date().toISOString() },
];

// 1. Add Guest (Customer Role)
app.post('/api/v1/guests', (req: Request, res: Response) => {
  const { eventId, name, email, phone, group, adultsCount, dietaryPreference, needsTransport, needsAccommodation } = req.body;

  const newGuest: Guest = {
    id: `g-${Date.now()}`,
    eventId: eventId || 'evt-101',
    name: name || 'Guest Name',
    email,
    phone,
    group: group || 'Family',
    status: 'invited',
    adultsCount: Number(adultsCount) || 2,
    dietaryPreference: dietaryPreference || 'Veg',
    needsTransport: Boolean(needsTransport),
    needsAccommodation: Boolean(needsAccommodation),
  };

  GUESTS.push(newGuest);
  res.status(201).json({ success: true, message: 'Guest added to event roster.', data: { guest: newGuest } });
});

// 2. Get Guest Roster
app.get('/api/v1/guests/event/:eventId', (req: Request, res: Response) => {
  const list = GUESTS.filter((g) => g.eventId === req.params.eventId);
  res.json({ success: true, count: list.length, data: { guests: list } });
});

// 3. Guest Submit RSVP Response (Public Guest Role)
app.post('/api/v1/guests/rsvp', (req: Request, res: Response) => {
  const { name, eventId, status, adultsCount, dietaryPreference } = req.body;

  const rsvpGuest: Guest = {
    id: `g-rsvp-${Date.now()}`,
    eventId: eventId || 'evt-101',
    name: name || 'Responding Guest',
    group: 'Web RSVP',
    status: status === 'declined' ? 'declined' : 'accepted',
    adultsCount: Number(adultsCount) || 2,
    dietaryPreference: dietaryPreference || 'Veg',
  };

  GUESTS.push(rsvpGuest);
  res.json({ success: true, message: 'RSVP response recorded.', data: { guest: rsvpGuest } });
});

// 4. Guest Submit Event Feedback (Public Guest Role)
app.post('/api/v1/feedback', (req: Request, res: Response) => {
  const { eventId, guestName, overallRating, venueRating, cateringRating, decorationRating, comments } = req.body;

  const newFb: EventFeedback = {
    id: `fb-${Date.now()}`,
    eventId: eventId || 'evt-101',
    guestName: guestName || 'Anonymous Guest',
    overallRating: Number(overallRating) || 5,
    venueRating: Number(venueRating) || 5,
    cateringRating: Number(cateringRating) || 5,
    decorationRating: Number(decorationRating) || 5,
    comments: comments || '',
    createdAt: new Date().toISOString(),
  };

  FEEDBACKS.push(newFb);
  res.status(201).json({ success: true, message: 'Event feedback recorded.', data: { feedback: newFb } });
});

// 5. Submit Verified Vendor Review (Customer Role after booking completion)
app.post('/api/v1/reviews', (req: Request, res: Response) => {
  const { vendorId, overallRating, serviceQuality, punctuality, reviewText } = req.body;

  const newReview: Review = {
    id: `rev-${Date.now()}`,
    vendorId: vendorId || 'vnd-1',
    customerId: 'usr-customer-1',
    customerName: 'Felix Kumar',
    overallRating: Number(overallRating) || 5,
    serviceQuality: Number(serviceQuality) || 5,
    punctuality: Number(punctuality) || 5,
    reviewText: reviewText || 'Excellent service!',
    createdAt: new Date().toISOString(),
  };

  REVIEWS.push(newReview);
  res.status(201).json({ success: true, message: 'Verified vendor review published.', data: { review: newReview } });
});

app.listen(PORT, () => {
  console.log(`[Guest & Feedback Microservice] Running on http://localhost:${PORT}`);
});
