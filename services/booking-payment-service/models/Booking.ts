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
    // Razorpay audit/idempotency fields — present only for gateway-verified payments.
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpayTransferId: String,
    razorpaySignatureVerified: Boolean,
  },
  { _id: false }
);

const bookingSchema = new Schema<Booking>({
  id: { type: String, required: true, unique: true },
  bookingNumber: { type: String, required: true, unique: true },
  eventId: { type: String, required: true },
  eventName: { type: String, default: '' },
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
  guestCount: { type: Number, min: 1 },
  timeSlot: { type: String, default: '' },
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
  // Set when a customer cancels/requests a refund on this booking (see the
  // /cancel route). cancelledBy distinguishes a customer's own action from an
  // admin stepping in.
  cancelReason: String,
  cancelledAt: String,
  cancelledBy: { type: String, enum: ['customer', 'admin'] },
  refundReference: String,
  refundedAt: String,
  refundedBy: { type: String, enum: ['vendor', 'admin'] },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

bookingSchema.index({ customerId: 1 });
bookingSchema.index({ vendorId: 1 });
// B-tree compound index for the double-booking check run on every new booking
// (find this vendor's bookings on this date with an active status) — Mongo
// jumps straight to the matching entries instead of scanning all bookings.
bookingSchema.index({ vendorId: 1, eventDate: 1, status: 1 });
// For "often booked together": all vendors booked for the same event.
bookingSchema.index({ eventId: 1 });

export const BookingModel = model<Booking>('Booking', bookingSchema);
