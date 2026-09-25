import type { Vendor } from './types';

// Mirrors packages/shared-types (slot capacity + booking rules).
export const AVAILABILITY_SLOTS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'fullday', label: 'Full Day' },
] as const;

export type AvailabilitySlotId = (typeof AVAILABILITY_SLOTS)[number]['id'];

// Categories whose vendors can take several bookings in the same slot.
export const SLOT_CAPACITY_CATEGORIES: string[] = [
  'Catering', 'Decoration', 'Makeup & Beauty', 'Media', 'Transport', 'Invitation', 'Printing',
  'Return Gifts', 'Entertainment', 'Music/DJ', 'Flowers', 'Mehendi', 'Event Host/Anchor',
  'Security', 'Utensils for Rent', 'Wedding Planner', 'Rental Equipment',
];
const MAX_SLOT_CAPACITY = 50;
const SESSION_SLOT_IDS = ['morning', 'afternoon', 'evening'];

type SlotVendor = Partial<Pick<Vendor, 'category' | 'bookedDates' | 'bookedSlots' | 'availableSlots' | 'slotCapacity'>>;

export function slotCapacityFor(vendor: SlotVendor, date: string, slot: string): number {
  if (!vendor.category || !SLOT_CAPACITY_CATEGORIES.includes(vendor.category)) return 1;
  const n = Math.floor(Number(vendor.slotCapacity?.[date]?.[slot || 'fullday']));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_SLOT_CAPACITY) : 1;
}

export function offeredSlotIds(vendor: SlotVendor, date: string): string[] {
  const chosen = vendor.availableSlots?.[date];
  return chosen && chosen.length ? chosen : AVAILABILITY_SLOTS.map((s) => s.id);
}

// A Full Day booking also occupies one spot in each session.
export function slotsLeft(vendor: SlotVendor, date: string, slot: string): number {
  const s = slot || 'fullday';
  // Frequency map slot -> bookings on this date, built in one pass (instead of
  // re-filtering the booking list for every slot we ask about).
  const counts = new Map<string, number>();
  for (const b of vendor.bookedSlots || []) {
    if (b.date !== date) continue;
    const id = b.slot || 'fullday';
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const count = (id: string) => counts.get(id) || 0;
  const fullDay = count('fullday');
  const sessionLeft = (id: string) => slotCapacityFor(vendor, date, id) - count(id) - fullDay;
  if (s !== 'fullday') return Math.max(0, sessionLeft(s));
  const offered = offeredSlotIds(vendor, date);
  let left = slotCapacityFor(vendor, date, 'fullday') - fullDay;
  for (const id of SESSION_SLOT_IDS) {
    if (offered.includes(id) || count(id) > 0) left = Math.min(left, sessionLeft(id));
  }
  return Math.max(0, left);
}

export function isSlotBooked(vendor: SlotVendor, date: string, slot: string): boolean {
  if ((vendor.bookedDates || []).includes(date)) return true;
  return slotsLeft(vendor, date, slot) <= 0;
}

export function openSlots(vendor: SlotVendor, date: string) {
  const offered = offeredSlotIds(vendor, date);
  return AVAILABILITY_SLOTS.filter((s) => offered.includes(s.id) && !isSlotBooked(vendor, date, s.id));
}

export function slotLabel(id?: string): string {
  return AVAILABILITY_SLOTS.find((s) => s.id === id)?.label || '';
}
