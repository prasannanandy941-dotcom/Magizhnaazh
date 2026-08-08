import { Schema, model } from 'mongoose';
import { Complaint } from '../../../packages/shared-types';

const complaintSchema = new Schema<Complaint>({
  id: { type: String, required: true, unique: true },
  eventId: String,
  bookingId: String,
  submittedBy: { type: String, required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_review', 'resolved'], default: 'open' },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

export const ComplaintModel = model<Complaint>('Complaint', complaintSchema);
