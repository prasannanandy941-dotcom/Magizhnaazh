import { Schema, model } from 'mongoose';
import { Review } from '../../../packages/shared-types';

const reviewSchema = new Schema<Review>({
  id: { type: String, required: true, unique: true },
  vendorId: { type: String, required: true },
  customerId: { type: String, required: true },
  customerName: { type: String, default: '' },
  bookingId: { type: String, required: true },
  overallRating: { type: Number, required: true, min: 1, max: 5 },
  serviceQuality: { type: Number, default: 5, min: 1, max: 5 },
  professionalism: { type: Number, default: 5, min: 1, max: 5 },
  valueForMoney: { type: Number, default: 5, min: 1, max: 5 },
  communication: { type: Number, default: 5, min: 1, max: 5 },
  punctuality: { type: Number, default: 5, min: 1, max: 5 },
  comment: { type: String, default: '' },
  eventType: { type: String, default: '' },
  eventDate: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  // Vendor's public response to this review.
  vendorReply: { type: String, default: '' },
  vendorReplyAt: { type: String, default: '' },
});

// Prevent duplicate/fake reviews: one review per customer, per vendor, per booking.
reviewSchema.index({ vendorId: 1, customerId: 1, bookingId: 1 }, { unique: true });

export const ReviewModel = model<Review>('Review', reviewSchema);
