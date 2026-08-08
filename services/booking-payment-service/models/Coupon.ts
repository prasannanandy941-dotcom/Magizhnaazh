import { Schema, model } from 'mongoose';
import { Coupon } from '../../../packages/shared-types';

const couponSchema = new Schema<Coupon>({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountPercent: { type: Number, required: true, min: 1, max: 100 },
  isActive: { type: Boolean, default: true },
  expiresAt: String,
  createdAt: { type: String, default: () => new Date().toISOString() },
});

export const CouponModel = model<Coupon>('Coupon', couponSchema);
