import type { Vendor } from './types';

export const AVAILABILITY_SLOTS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'fullday', label: 'Full Day' },
] as const;

export type AvailabilitySlotId = (typeof AVAILABILITY_SLOTS)[number]['id'];

export function isSlotBooked(
  vendor: Pick<Vendor, 'bookedDates' | 'bookedSlots'>,
  date: string,
  slot: string,
): boolean {
  if ((vendor.bookedDates || []).includes(date)) return true;
  const booked = (vendor.bookedSlots || []).filter((b) => b.date === date).map((b) => b.slot);
  if (booked.includes('fullday')) return true;
  if (slot === 'fullday' && booked.length > 0) return true;
  return booked.includes(slot);
}

export function offeredSlotIds(vendor: Pick<Vendor, 'availableSlots'>, date: string): string[] {
  const chosen = vendor.availableSlots?.[date];
  return chosen && chosen.length ? chosen : AVAILABILITY_SLOTS.map((s) => s.id);
}

export function openSlots(vendor: Pick<Vendor, 'bookedDates' | 'bookedSlots' | 'availableSlots'>, date: string) {
  const offered = offeredSlotIds(vendor, date);
  return AVAILABILITY_SLOTS.filter((s) => offered.includes(s.id) && !isSlotBooked(vendor, date, s.id));
}

export function slotLabel(id?: string): string {
  return AVAILABILITY_SLOTS.find((s) => s.id === id)?.label || '';
}
