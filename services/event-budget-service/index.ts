import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from '../../packages/shared-utils/db';
import { authMiddleware } from '../../packages/shared-utils/auth';
import { requestLogger } from '../../packages/shared-utils/logging';
import { registerHealthRoute } from '../../packages/shared-utils/health';
import { calculateBudgetBreakdown } from '../../packages/shared-utils';
import { EventModel } from './models/Event';

const app = express();
const PORT = process.env.PORT || 8003;

app.use(cors());
app.use(express.json());
app.use(requestLogger('event-budget-service'));
registerHealthRoute(app, 'event-budget-service');

async function seedIfEmpty() {
  const count = await EventModel.countDocuments();
  if (count > 0) return;

  await EventModel.create({
    id: 'evt-101',
    userId: 'usr-customer-1',
    title: 'Felix & Priya Wedding Celebration',
    eventType: 'Wedding',
    date: '2026-12-15',
    location: { city: 'Chennai' },
    guestCount: 500,
    totalBudget: 800000,
    spentBudget: 295000,
    status: 'planning',
    budgetBreakdown: [
      { id: 'b-1', category: 'Venue', allocatedPercentage: 25, allocatedAmount: 200000, actualSpent: 150000 },
      { id: 'b-2', category: 'Catering', allocatedPercentage: 25, allocatedAmount: 200000, actualSpent: 0 },
      { id: 'b-3', category: 'Decoration', allocatedPercentage: 12, allocatedAmount: 96000, actualSpent: 80000 },
      { id: 'b-4', category: 'Photography', allocatedPercentage: 10, allocatedAmount: 80000, actualSpent: 65000 },
    ],
  });
  console.log('[event-budget-service] Seeded demo event.');
}

// 1. Create event — smart budget allocation via the shared budget percentage engine.
app.post('/api/v1/events', authMiddleware(), async (req: Request, res: Response) => {
  const { title, eventType, city, date, guestCount, totalBudget } = req.body;

  const budget = Number(totalBudget) || 500000;
  const breakdown = calculateBudgetBreakdown(eventType || 'Wedding', budget);

  const event = await EventModel.create({
    id: `evt-${Date.now()}`,
    userId: req.user!.sub,
    title: title || 'My Grand Event',
    eventType: eventType || 'Wedding',
    date: date || '2026-12-15',
    location: { city: city || 'Chennai' },
    guestCount: Number(guestCount) || 300,
    totalBudget: budget,
    spentBudget: 0,
    status: 'planning',
    budgetBreakdown: breakdown,
  });

  res.status(201).json({ success: true, message: 'Event created & budget allocated successfully.', data: { event } });
});

// 2. List events (scoped to the caller unless admin)
app.get('/api/v1/events', authMiddleware(), async (req: Request, res: Response) => {
  const filter = req.user!.role === 'admin' ? {} : { userId: req.user!.sub };
  const events = await EventModel.find(filter).limit(200);
  res.json({ success: true, count: events.length, data: { events } });
});

// 3. Update budget allocation
app.put('/api/v1/events/:id/budget', authMiddleware(), async (req: Request, res: Response) => {
  const event = await EventModel.findOne({ id: req.params.id });
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
  if (event.userId !== req.user!.sub && req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'You do not own this event.' });
  }

  const { budgetBreakdown } = req.body;
  if (Array.isArray(budgetBreakdown)) {
    event.budgetBreakdown = budgetBreakdown;
  }
  await event.save();

  res.json({ success: true, message: 'Smart budget allocations updated.', data: { event } });
});

async function start() {
  await connectDB(process.env.MONGODB_URI, 'event-budget-service');
  await seedIfEmpty();
  app.listen(PORT, () => {
    console.log(`[Event & Budget Microservice] Running on http://localhost:${PORT}`);
  });
}

start();
