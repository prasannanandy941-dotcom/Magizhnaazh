import { Schema, model } from 'mongoose';
import { PlatformSettings } from '../../../packages/shared-types';

const platformSettingsSchema = new Schema<PlatformSettings>({
  commissionRate: { type: Number, default: 0.1 },
  advanceDepositRate: { type: Number, default: 0.3 },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

export const PlatformSettingsModel = model<PlatformSettings>('PlatformSettings', platformSettingsSchema);

const SETTINGS_QUERY = {};

export async function getSettings(): Promise<{ commissionRate: number; advanceDepositRate: number }> {
  let settings = await PlatformSettingsModel.findOne(SETTINGS_QUERY);
  if (!settings) {
    settings = await PlatformSettingsModel.create({ commissionRate: 0.1, advanceDepositRate: 0.3 });
  }
  return { commissionRate: settings.commissionRate, advanceDepositRate: settings.advanceDepositRate };
}
