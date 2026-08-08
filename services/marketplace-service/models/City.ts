import { Schema, model } from 'mongoose';
import { City } from '../../../packages/shared-types';

const citySchema = new Schema<City>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  state: { type: String, default: 'Tamil Nadu' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

export const CityModel = model<City>('City', citySchema);
