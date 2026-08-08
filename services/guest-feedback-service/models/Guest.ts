import { Schema, model } from 'mongoose';
import { Guest } from '../../../packages/shared-types';

const guestSchema = new Schema<Guest>({
  id: { type: String, required: true, unique: true },
  eventId: { type: String, required: true },
  name: { type: String, required: true },
  phone: String,
  email: String,
  group: String,
  status: { type: String, enum: ['invited', 'viewed', 'accepted', 'declined', 'maybe'], default: 'invited' },
  adultsCount: { type: Number, default: 1 },
  childrenCount: { type: Number, default: 0 },
  dietaryPreference: { type: String, enum: ['Veg', 'Non-Veg', 'Jain', 'Vegan'] },
  needsTransport: { type: Boolean, default: false },
  needsAccommodation: { type: Boolean, default: false },
  invitedAt: { type: String, default: () => new Date().toISOString() },
  respondedAt: String,
});

guestSchema.index({ eventId: 1 });

export const GuestModel = model<Guest>('Guest', guestSchema);
