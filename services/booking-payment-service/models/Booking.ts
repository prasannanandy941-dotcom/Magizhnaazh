import { Schema, model } from 'mongoose';
import { Booking } from '../../../packages/shared-types';

const quoteHistorySchema = new Schema(
  { sender: String, amount: Number, notes: String, timestamp: String },
  { _id: false }
);

const bookingSchema = new Schema<Booking>({
  id: { type: String, required: true, unique: true },
  bookingNumber: { type: String, required: true, unique: true },
  eventId: { type: String, required: true },
  customerId: { type: String, required: true },
  vendorId: { type: String, required: true },
  vendorName: { type: String, default: '' },
  vendorCategory: { type: String, default: 'Other' },
  packageId: String,
  packageName: String,
  agreedPrice: { type: Number, default: 0 },
  advanceAmountPaid: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['enquiry', 'quote_requested', 'quote_received', 'quote_sent', 'negotiation', 'pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'],
    default: 'quote_requested',
  },
  eventDate: { type: String, required: true },
  specialInstructions: String,
  quotesHistory: { type: [quoteHistorySchema], default: [] },
  selectedOptions: { type: [String], default: [] },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

bookingSchema.index({ customerId: 1 });
bookingSchema.index({ vendorId: 1 });

export const BookingModel = model<Booking>('Booking', bookingSchema);
