import { Schema, model } from 'mongoose';
import { Role } from '../../../packages/shared-types';

export interface UserDoc {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  businessName?: string;
  avatarUrl?: string;
  authProvider?: 'password' | 'google';
  isVerified: boolean;
  isSuspended: boolean;
  passwordHash: string;
  createdAt: string;
}

const userSchema = new Schema<UserDoc>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['customer', 'vendor', 'event_manager', 'admin', 'guest'], default: 'customer' },
  businessName: { type: String },
  avatarUrl: { type: String },
  authProvider: { type: String, enum: ['password', 'google'], default: 'password' },
  isVerified: { type: Boolean, default: false },
  isSuspended: { type: Boolean, default: false },
  passwordHash: { type: String, required: true, select: false },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

export const UserModel = model<UserDoc>('User', userSchema);
