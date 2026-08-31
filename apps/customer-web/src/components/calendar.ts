import { Booking } from '../../../../packages/shared-types';

const pad = (n: number) => String(n).padStart(2, '0');
const toIcsDate = (d: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  return m ? `${m[1]}${m[2]}${m[3]}` : '';
};
const plusOne = (d: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  if (!m) return '';
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`;
};
const esc = (s: string) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Build a single-event .ics for a booking and trigger a download so the customer
// can add their event date to any calendar app. Purely client-side.
export function downloadBookingIcs(booking: Booking): void {
  const start = toIcsDate(booking.eventDate);
  if (!start) {
    alert('This booking has no event date to add.');
    return;
  }
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Magizhnaazh//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@magizhnaazh`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${plusOne(booking.eventDate)}`,
    `SUMMARY:${esc(`${booking.vendorName} — ${booking.vendorCategory}`)}`,
    `DESCRIPTION:${esc(`Booking ${booking.bookingNumber}. ${booking.packageName || ''}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${booking.bookingNumber}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
