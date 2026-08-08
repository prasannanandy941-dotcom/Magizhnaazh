import { Schema, model } from 'mongoose';
import { Banner } from '../../../packages/shared-types';

const bannerSchema = new Schema<Banner>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  linkUrl: String,
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

export const BannerModel = model<Banner>('Banner', bannerSchema);
