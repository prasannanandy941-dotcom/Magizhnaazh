import { Schema, model } from 'mongoose';
import { Event } from '../../../packages/shared-types';

const budgetItemSchema = new Schema(
  {
    id: String,
    category: String,
    allocatedPercentage: Number,
    allocatedAmount: Number,
    actualSpent: { type: Number, default: 0 },
    notes: String,
  },
  { _id: false }
);

const taskSchema = new Schema(
  { id: String, title: String, category: String, completed: { type: Boolean, default: false }, dueDate: String, priority: String },
  { _id: false }
);

const scheduleItemSchema = new Schema(
  { id: String, time: String, activity: String, location: String, notes: String },
  { _id: false }
);

const eventSchema = new Schema<Event>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  eventType: { type: String, required: true },
  date: { type: String, required: true },
  location: {
    city: String,
    venueName: String,
    address: String,
  },
  guestCount: { type: Number, default: 0 },
  totalBudget: { type: Number, default: 0 },
  spentBudget: { type: Number, default: 0 },
  status: { type: String, enum: ['planning', 'ongoing', 'completed', 'cancelled'], default: 'planning' },
  budgetBreakdown: { type: [budgetItemSchema], default: [] },
  tasks: { type: [taskSchema], default: [] },
  schedule: { type: [scheduleItemSchema], default: [] },
  bookedVendorIds: { type: [String], default: [] },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

eventSchema.index({ userId: 1 });

export const EventModel = model<Event>('Event', eventSchema);
