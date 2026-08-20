import { Schema, model } from 'mongoose';

export interface OtpDoc {
  email: string;
  code: string;
  expiresAt: Date;
}

const otpSchema = new Schema<OtpDoc>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

export const OtpModel = model<OtpDoc>('Otp', otpSchema);
