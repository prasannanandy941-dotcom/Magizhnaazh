import { Schema, model } from 'mongoose';
import { EventFeedback } from '../../../packages/shared-types';

const feedbackSchema = new Schema<EventFeedback>({
  id: { type: String, required: true, unique: true },
  eventId: { type: String, required: true },
  feedbackToken: { type: String, required: true, unique: true },
  guestName: String,
  overallRating: { type: Number, required: true, min: 1, max: 5 },
  venueRating: { type: Number, min: 1, max: 5 },
  cateringRating: { type: Number, min: 1, max: 5 },
  decorationRating: { type: Number, min: 1, max: 5 },
  organizationRating: { type: Number, min: 1, max: 5 },
  photographyRating: { type: Number, min: 1, max: 5 },
  comments: String,
  createdAt: { type: String, default: () => new Date().toISOString() },
});

feedbackSchema.index({ eventId: 1 });

export const EventFeedbackModel = model<EventFeedback>('EventFeedback', feedbackSchema);
