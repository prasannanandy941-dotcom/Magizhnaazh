import { Schema, model } from 'mongoose';

// A customer's request for a vendor type on a date when nobody is free. Admin follows up
// ("we'll get back to you as soon as we find a vendor") and marks it resolved.
export interface VendorEnquiry {
  id: string;
  userId: string;
  customerName: string;
  email: string;
  phone: string;
  category: string;
  city: string;
  eventTitle: string;
  eventDate: string;
  notes: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

const enquirySchema = new Schema<VendorEnquiry>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  customerName: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  category: { type: String, required: true },
  city: { type: String, default: '' },
  eventTitle: { type: String, default: '' },
  eventDate: { type: String, required: true },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

export const EnquiryModel = model<VendorEnquiry>('VendorEnquiry', enquirySchema);
