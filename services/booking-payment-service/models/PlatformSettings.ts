import { Schema, model } from 'mongoose';
import { PlatformSettings } from '../../../packages/shared-types';

const platformSettingsSchema = new Schema<PlatformSettings>({
  commissionRate: { type: Number, default: 0.1 },
  advanceDepositRate: { type: Number, default: 0.3 },
  gstRate: { type: Number, default: 0.18 },
  advanceDepositMinRate: { type: Number, default: 0 },
  advanceDepositMaxRate: { type: Number, default: 1 },
  vendorPayoutHoldDays: { type: Number, default: 0 },
  theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

export const PlatformSettingsModel = model<PlatformSettings>('PlatformSettings', platformSettingsSchema);

const SETTINGS_QUERY = {};

export interface ResolvedSettings {
  commissionRate: number;
  advanceDepositRate: number;
  gstRate: number;
  advanceDepositMinRate: number;
  advanceDepositMaxRate: number;
  vendorPayoutHoldDays: number;
  theme: 'light' | 'dark';
}

export async function getSettings(): Promise<ResolvedSettings> {
  let settings = await PlatformSettingsModel.findOne(SETTINGS_QUERY);
  if (!settings) {
    settings = await PlatformSettingsModel.create({ commissionRate: 0.1, advanceDepositRate: 0.3, gstRate: 0.18, theme: 'dark' });
  }
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && !isNaN(v) ? v : fallback);
  return {
    commissionRate: settings.commissionRate,
    advanceDepositRate: settings.advanceDepositRate,
    gstRate: num(settings.gstRate, 0.18),
    advanceDepositMinRate: num(settings.advanceDepositMinRate, 0),
    advanceDepositMaxRate: num(settings.advanceDepositMaxRate, 1),
    vendorPayoutHoldDays: Math.max(0, Math.round(num(settings.vendorPayoutHoldDays, 0))),
    theme: (settings.theme as 'light' | 'dark') || 'dark',
  };
}
