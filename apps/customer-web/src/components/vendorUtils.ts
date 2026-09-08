import { Vendor } from '../../../../packages/shared-types';

// A working cover photo per vendor category, shown when a vendor hasn't uploaded
// their own photo. Every category has one so no card is ever blank. (All URLs
// verified to load; the old per-category fallbacks had some dead Unsplash links,
// e.g. the Pujari image, which left cards empty.)
const CATEGORY_COVER: Record<string, string> = {
  Catering: 'photo-1680993032090-1ef7ea9b51e5',
  Venue: 'photo-1519167758481-83f550bb49b3',
  Decoration: 'photo-1519225421980-715cb0215aed',
  'Makeup & Beauty': 'photo-1596704017254-9b121068fb31',
  Media: 'photo-1519741497674-611481863552',
  Transport: 'photo-1549317661-bd32c8ce0db2',
  'Pujari/Priest': 'photo-1582510003544-4d00b7f74220',
  Invitation: 'photo-1632610992723-82d7c212f6d7',
  Printing: 'photo-1503694978374-8a2fa686963a',
  'Return Gifts': 'photo-1549465220-1a8b9238cd48',
  Entertainment: 'photo-1563841930606-67e2bce48b78',
  'Music/DJ': 'photo-1470225620780-dba8ba36b745',
  'Lights & Sounds': 'photo-1576514129883-2f1d47a65da6',
  Lighting: 'photo-1576514129883-2f1d47a65da6',
  Flowers: 'photo-1469371670807-013ccf25f16a',
  Mehendi: 'photo-1732118400647-a81e3b37be87',
  'Event Host/Anchor': 'photo-1702562546665-4632bdb96e04',
  Security: 'photo-1566245024852-04fbf7842ce9',
  Cleaning: 'photo-1580842402762-6f5868c17412',
  'Rental Equipment': 'photo-1695393386569-cf141ff2c552',
  'Utensils for Rent': 'photo-1633504785850-018cae02cb47',
  'Wedding Planner': 'photo-1568847811512-803314424fdc',
  'Corporate Event Services': 'photo-1540575467063-178a50c2df87',
  Other: 'photo-1529636798458-92182e662485',
};

// The category cover as a full URL. Exported so callers can also use it as an
// <img onError> fallback (a guaranteed-working, category-appropriate image).
export function categoryCoverImage(category?: string): string {
  const id = CATEGORY_COVER[category || 'Other'] || CATEGORY_COVER.Other;
  return `https://images.unsplash.com/${id}?w=800`;
}

export function getVendorCoverImage(vendor: Vendor): string {
  const images = (vendor.galleryImages || []).filter(Boolean);
  // A photo the vendor actually uploaded lives on our own storage, never on
  // unsplash. Any unsplash.com URL here is an auto-assigned placeholder (some of
  // which are dead links), so skip those and fall back to the category cover.
  const realUpload = images.find((u) => !u.includes('images.unsplash.com'));
  if (realUpload) return realUpload;
  return categoryCoverImage(vendor.category);
}
