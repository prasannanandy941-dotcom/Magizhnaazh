import { Schema, model } from 'mongoose';
import { Booking } from '../../../packages/shared-types';

const quoteHistorySchema = new Schema(
  { sender: String, amount: Number, notes: String, timestamp: String },
  { _id: false }
);

const spendItemSchema = new Schema(
  { label: String, amount: Number },
  { _id: false }
);

const paymentSchema = new Schema(
  {
    id: String,
    type: { type: String, enum: ['advance', 'balance'], default: 'balance' },
    amount: Number,
    method: { type: String, default: 'upi' },
    reference: String,
    status: { type: String, enum: ['claimed', 'confirmed'], default: 'claimed' },
    claimedAt: { type: String, default: () => new Date().toISOString() },
    confirmedAt: String,
  },
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
  customerName: { type: String, default: '' },
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
  referenceImages: { type: [String], default: [] },
  spendItems: { type: [spendItemSchema], default: [] },
  payments: { type: [paymentSchema], default: [] },
  paidInFull: { type: Boolean, default: false },
  invoiceNumber: String,
  invoiceIssuedAt: String,
  settlementStatus: { type: String, enum: ['pending', 'settled'], default: 'pending' },
  settledAt: String,
  createdAt: { type: String, default: () => new Date().toISOString() },
});

bookingSchema.index({ customerId: 1 });
bookingSchema.index({ vendorId: 1 });

export const BookingModel = model<Booking>('Booking', bookingSchema);
