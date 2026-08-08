import { Schema, model } from 'mongoose';
import { Category } from '../../../packages/shared-types';

const categorySchema = new Schema<Category>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  icon: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

export const CategoryModel = model<Category>('Category', categorySchema);
