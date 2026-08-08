import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8003;

app.use(cors());
app.use(express.json());

interface BudgetItem {
  id: string;
  category: string;
  allocatedPercentage: number;
  allocatedAmount: number;
  actualSpent: number;
}

interface EventItem {
  id: string;
  userId: string;
  title: string;
  eventType: string;
  date: string;
  location: { city: string };
  guestCount: number;
  totalBudget: number;
  spentBudget: number;
  status: 'planning' | 'ongoing' | 'completed';
  budgetBreakdown: BudgetItem[];
  createdAt: string;
}

const EVENTS: EventItem[] = [
  {
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
    createdAt: new Date().toISOString(),
  },
];

// Helper: Smart Budget Percentage Allocator Algorithm
function calculateSmartBudget(eventType: string, totalBudget: number): BudgetItem[] {
  const allocationMap: Record<string, number> = {
    'Venue': 25,
    'Catering': 25,
    'Decoration': 12,
    'Photography': 10,
    'Makeup & Beauty': 5,
    'Transport': 5,
    'Invitation': 3,
    'Return Gifts': 5,
    'Other': 10,
  };

  return Object.entries(allocationMap).map(([category, percentage], idx) => ({
    id: `bgt-${idx}-${Date.now()}`,
    category,
    allocatedPercentage: percentage,
    allocatedAmount: Math.round((totalBudget * percentage) / 100),
    actualSpent: 0,
  }));
}

// 1. Create Event (Customer Role)
app.post('/api/v1/events', (req: Request, res: Response) => {
  const { title, eventType, city, date, guestCount, totalBudget } = req.body;

  const budget = Number(totalBudget) || 500000;
  const breakdown = calculateSmartBudget(eventType || 'Wedding', budget);

  const newEvent: EventItem = {
    id: `evt-${Date.now()}`,
    userId: 'usr-customer-1',
    title: title || 'My Grand Event',
    eventType: eventType || 'Wedding',
    date: date || '2026-12-15',
    location: { city: city || 'Chennai' },
    guestCount: Number(guestCount) || 300,
    totalBudget: budget,
    spentBudget: 0,
    status: 'planning',
    budgetBreakdown: breakdown,
    createdAt: new Date().toISOString(),
  };

  EVENTS.push(newEvent);
  res.status(201).json({ success: true, message: 'Event created & budget allocated successfully.', data: { event: newEvent } });
});

// 2. Get Events List
app.get('/api/v1/events', (req: Request, res: Response) => {
  res.json({ success: true, count: EVENTS.length, data: { events: EVENTS } });
});

// 3. Update Budget Breakdown Allocation (Customer Role)
app.put('/api/v1/events/:id/budget', (req: Request, res: Response) => {
  const event = EVENTS.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  const { budgetBreakdown } = req.body;
  if (Array.isArray(budgetBreakdown)) {
    event.budgetBreakdown = budgetBreakdown;
  }

  res.json({ success: true, message: 'Smart budget allocations updated.', data: { event } });
});

app.listen(PORT, () => {
  console.log(`[Event & Budget Microservice] Running on http://localhost:${PORT}`);
});
