import React, { useState, useEffect, useRef } from 'react';
import { Store, Star, Upload, Check, LogOut, Loader2, Plus, SlidersHorizontal, ChevronDown, Receipt, X, Bell, ShieldCheck, Clock as ClockIcon, AlertCircle, FileText, CalendarDays, Sparkles } from 'lucide-react';
import { User, Vendor, Booking, Review, VendorFacilities, VendorPackage, VendorDeal, OfferedOptionItem, VENDOR_CATEGORIES, CATEGORY_OPTIONS, CATERING_OPTION_STYLE, MEDIA_QUALITY_OPTIONS, MEDIA_EQUIPMENT_OPTIONS, mediaExtraField, isDealLive, CATERING_MENU_TIERS, CATERING_FOOD_TYPES, CATERING_CUISINES, CATERING_LIVE_COUNTERS, CATERING_SERVICE_STYLES, slotLabelWithTime, AVAILABILITY_SLOTS, offeredSlotIds, VENUE_SESSIONS, VENUE_HALL_TYPES, VENUE_HALL_CLASSES, VENUE_CATERING_POLICIES, DECORATION_TIERS, DECORATION_THEMES, DECORATION_AREAS, DECORATION_FLOWER_TYPES, MAKEUP_TYPES, MAKEUP_FINISHES, MEDIA_TIERS, MEDIA_COVERAGE, MEDIA_STYLES, TRANSPORT_TIERS, TRANSPORT_VEHICLE_TYPES, TRANSPORT_PRICING_BASIS, TRANSPORT_USES, PRIEST_CEREMONY_TYPES, PRIEST_LANGUAGES, INVITATION_TIERS, INVITATION_TYPES, INVITATION_DESIGNS, INVITATION_ADDONS, INVITATION_LANGUAGES, PRINTING_PRODUCTS, PRINTING_FINISHES, RETURN_GIFTS_TIERS, RETURN_GIFT_TYPES, ENTERTAINMENT_ACT_TYPES, MUSIC_DJ_TIERS, MUSIC_DJ_TYPES, MUSIC_DJ_VENUE_TYPES, LIGHTING_TIERS, LIGHTING_TYPES, FLOWERS_VARIETIES, FLOWERS_ITEMS, FLOWERS_KINDS, MEHENDI_TIERS, MEHENDI_TYPES, MEHENDI_INTRICACY, EVENT_HOST_EVENT_TYPES, EVENT_HOST_LANGUAGES, EVENT_HOST_MODES, SECURITY_TYPES, SECURITY_GENDERS, RENTAL_ITEMS, UTENSILS_MATERIALS, UTENSILS_VESSEL_TYPES, WEDDING_PLANNER_SCOPES, CORPORATE_EVENT_TYPES } from '../../../packages/shared-types';
import { STATIC_CITY_GROUPS } from '../../../packages/shared-utils';
import { AuthGate } from './components/AuthGate';
import { FloralGoldBackground } from './components/FloralGoldBackground';
import { fetchMyVendor, createVendor, updateVendor, fetchVendorBookings, fetchVendorBookingsSilent, confirmBooking, sendCounterQuote, updateBookingStatus, updateSpendBreakdown, fetchVendorReviews, replyToReview, submitVerification, confirmBookingPayment, fetchBookingInvoice, fetchCalendarToken, GATEWAY_URL } from './api';
import { openInvoicePrintWindow } from './invoice';
import { playNotificationSound } from './notificationSound';
import { getItemSuggestions, getAmenitySuggestions, suggestionListId } from './itemSuggestions';

// Work-progress stages a confirmed booking moves through, tracked on the
// existing BookingStatus field — applies to every vendor category, not just
// catering, since there's nothing category-specific about "are we done yet".
const ORDER_STEPS: { key: string; label: string }[] = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

// Mirrors STATUS_LABEL in customer-web/MyOrders.tsx so both sides describe
// the same BookingStatus values the same way.
const STATUS_LABEL: Record<string, string> = {
  enquiry: 'Enquiry',
  quote_requested: 'Quote Requested',
  quote_received: 'Quote Received',
  quote_sent: 'Counter Sent',
  negotiation: 'Negotiating',
  pending_payment: 'Advance Claimed — Confirm',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

// Amenity toggles a vendor can advertise (these become the chips customers filter by).
// These are Venue-specific concepts (AC room, dormitory hall, etc.) and only apply to Venue vendors.
// `example` is a per-amenity placeholder for the rate-option name field, so
// each amenity suggests a fitting example (chairs vs halls vs rooms) instead
// of a one-size-fits-all "1 hall with 1 AC".
// Per-category name for the vendor's "Facilities & Options" tab + heading, so a
// logged-in vendor sees their own trade (a Catering vendor sees "Food Services",
// a Venue sees "Hall Facilities", …). Mirrors the customer-side SERVICES_TAB_LABEL.
const FACILITIES_SECTION_LABEL: Record<string, string> = {
  Catering: 'Food Services',
  Venue: 'Hall Facilities',
  Decoration: 'Decor Services',
  'Makeup & Beauty': 'Beauty Services',
  Media: 'Shoot Services',
  Transport: 'Vehicles & Services',
  'Pujari/Priest': 'Ceremony Services',
  Invitation: 'Design Services',
  Printing: 'Print Services',
  'Return Gifts': 'Gifting Choices',
  Entertainment: 'Performances Offered',
  'Music/DJ': 'Sound Services',
  Lighting: 'Lighting Services',
  Flowers: 'Floral Services',
  Mehendi: 'Designs & Services',
  'Event Host/Anchor': 'Hosting Services',
  Security: 'Protection & Staffing',
  Cleaning: 'Housekeeping Services',
  'Rental Equipment': 'Rental Options',
  'Utensils for Rent': 'Services',
  'Wedding Planner': 'Planning Service',
  'Corporate Event Services': 'Corporate Solutions',
};
const facilitiesSectionLabel = (category?: string) =>
  (category && FACILITIES_SECTION_LABEL[category]) || 'Facilities & Options';

const AMENITY_OPTIONS: { key: keyof VendorFacilities; label: string; example: string }[] = [
  { key: 'acRoom', label: 'AC room', example: '1 hall with 1 AC' },
  { key: 'fansOnly', label: 'Fans only', example: '1 hall with fans' },
  { key: 'vipRoom', label: 'VIP room', example: '1 VIP room' },
  { key: 'vipFrontChairs', label: 'VIP front chairs', example: '2 chairs' },
  { key: 'garlands', label: 'Garlands', example: '1 pair of garlands' },
  { key: 'brideGroomRoom', label: 'Bride & groom room', example: '1 room' },
  { key: 'guestRoomAttachedWashroom', label: 'Guest rooms', example: '1 guest room' },
  { key: 'dormitoryHall', label: 'Dormitory hall', example: '1 dormitory hall' },
  { key: 'separateGuestWashroom', label: 'Separate guest washroom', example: '1 washroom' },
  { key: 'cookingUtensils', label: 'Cooking utensils', example: 'full utensil set' },
  { key: 'waterFilter', label: 'Water filter', example: '1 RO unit' },
];
const SERVICE_TIERS: { key: keyof VendorFacilities; label: string }[] = [
  { key: 'catering', label: 'Catering' },
  { key: 'decoration', label: 'Decoration' },
  { key: 'djService', label: 'DJ / Music' },
  { key: 'transport', label: 'Transport' },
];

// Extra options every category gets in addition to its CATEGORY_OPTIONS.
// (Advance was removed — a vendor's advance is set in Business Profile, not as
// a bookable option.)
const UNIVERSAL_OPTIONS: string[] = [];

// Category-appropriate package tier names, so a vendor can one-click create
// three priced tiers that make sense for their business (e.g. a videographer
// gets Standard / HD / Premium 4K, a venue gets Silver / Gold / Platinum).
// Customers then pick a tier on the Packages tab.
const PACKAGE_TIER_NAMES: Record<string, [string, string, string]> = {
  'Venue': ['Silver', 'Gold', 'Platinum'],
  'Catering': ['Standard', 'Premium', 'Royal'],
  'Media': ['Standard', 'HD', 'Premium 4K'],
  'Decoration': ['Economy', 'Premium', 'Luxury'],
  'Makeup & Beauty': ['Classic', 'HD', 'Airbrush'],
  'Transport': ['Standard', 'Premium', 'Luxury'],
  'Pujari/Priest': ['Basic', 'Standard', 'Premium'],
  'Return Gifts': ['Economy', 'Premium', 'Luxury'],
  'Music/DJ': ['Standard', 'Premium', 'Live Band'],
  'Invitation': ['Basic', 'Premium', 'Luxury'],
  'Printing': ['Basic', 'Premium', 'Luxury'],
  'Mehendi': ['Basic', 'Premium', 'Bridal'],
};
const tierNamesForCategory = (category: string): [string, string, string] =>
  PACKAGE_TIER_NAMES[category] || ['Basic', 'Standard', 'Premium'];

const isVideoUrl = (url: string) => {
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split('?')[0].split('#')[0];
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.m4v')
  );
};

// Options that are a simple yes/we-offer-this with no per-item breakdown, so
// their card hides the "Add items" editor entirely.
const NO_ITEM_OPTIONS = new Set<string>(['Live Streaming', 'Same-Day Edit', 'Highlight Reel', 'LED Screens']);

// Example item name shown as the placeholder in the per-option item editor,
// tailored to each vendor category so a caterer sees a dish and a cleaner sees
// a cleaning service (not "Paneer Butter Masala"). Falls back to a generic
// example for anything not listed.
const ITEM_NAME_EXAMPLE: Record<string, string> = {
  Catering: 'Paneer Butter Masala',
  Venue: 'AC Banquet Hall',
  Decoration: 'Rose & Marigold Backdrop',
  'Makeup & Beauty': 'HD Bridal Makeup',
  Media: 'Candid Album / Cinematic Reel',
  Transport: 'Innova Crysta (per trip)',
  'Pujari/Priest': 'Wedding Homam Ritual',
  Invitation: 'Digital E-Invite Design',
  Printing: 'Wedding Cards (per 100)',
  'Return Gifts': 'Silver Coin Gift Box',
  Entertainment: 'Live Band (2 hours)',
  'Music/DJ': 'DJ Setup (4 hours)',
  Lighting: 'Fairy Light Setup',
  Flowers: 'Jasmine Garland (per metre)',
  Mehendi: 'Bridal Mehendi (full hands)',
  'Event Host/Anchor': 'Wedding Anchor (per event)',
  Security: 'Bouncer (per guard)',
  Cleaning: 'Deep Cleaning (per hall)',
  'Rental Equipment': 'Chairs (per 100)',
  'Utensils for Rent': 'Cooking Vessel (per set)',
  'Wedding Planner': 'Full Planning Package',
  'Corporate Event Services': 'Conference Setup',
  Other: 'Service item',
};

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

export function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('magizhnaazh_vendor_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('magizhnaazh_vendor_token'));

  const handleAuthSuccess = (loggedInUser: User, newToken: string) => {
    localStorage.setItem('magizhnaazh_vendor_user', JSON.stringify(loggedInUser));
    localStorage.setItem('magizhnaazh_vendor_token', newToken);
    setUser(loggedInUser);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('magizhnaazh_vendor_user');
    localStorage.removeItem('magizhnaazh_vendor_token');
    setUser(null);
    setToken(null);
    setMyVendor(null);
    setBookings([]);
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'reviews' | 'portfolio' | 'facilities' | 'availability' | 'packages' | 'offers' | 'profile'>('dashboard');
  // Bookable packages the vendor offers — shown on the customer's "Packages" tab.
  const [packages, setPackages] = useState<VendorPackage[]>([]);
  // Promotional deals the vendor publishes on their listing.
  const [deals, setDeals] = useState<VendorDeal[]>([]);
  const [dealForm, setDealForm] = useState<{ title: string; description: string; discountType: 'percent' | 'flat'; discountValue: string; minOrderAmount: string; expiresAt: string }>({ title: '', description: '', discountType: 'percent', discountValue: '', minOrderAmount: '', expiresAt: '' });
  const [dealSaving, setDealSaving] = useState(false);
  const [dealNotice, setDealNotice] = useState('');
  // Private .ics subscribe URL for syncing bookings to Google/Apple/Outlook.
  const [calendarUrl, setCalendarUrl] = useState('');
  const [calendarCopied, setCalendarCopied] = useState(false);
  const [savingPackages, setSavingPackages] = useState(false);
  const [packagesNotice, setPackagesNotice] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  // Which review's reply box is open, the draft text, and in-flight state.
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replySaving, setReplySaving] = useState(false);
  // Verification request form (KYC + proof documents) shown on the Profile tab.
  const [verifyForm, setVerifyForm] = useState({ legalName: '', registrationNumber: '', gstNumber: '', contactPerson: '' });
  const [verifyDocs, setVerifyDocs] = useState<string[]>([]);
  const [verifyUploading, setVerifyUploading] = useState(false);
  const [verifySaving, setVerifySaving] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState('');
  const [facilities, setFacilities] = useState<Partial<VendorFacilities>>({});
  const [savingFacilities, setSavingFacilities] = useState(false);
  const [facilitiesNotice, setFacilitiesNotice] = useState('');
  const [offeredOptions, setOfferedOptions] = useState<string[]>([]);
  const [offeredOptionPrices, setOfferedOptionPrices] = useState<Record<string, number>>({});
  const [offeredOptionItems, setOfferedOptionItems] = useState<Record<string, OfferedOptionItem[]>>({});
  const [offeredOptionImages, setOfferedOptionImages] = useState<Record<string, string[]>>({});
  // Option-level quality tier for options that have no item list (e.g. Live Streaming).
  const [offeredOptionQuality, setOfferedOptionQuality] = useState<Record<string, string>>({});
  // Which offered option's item-editor is currently expanded (only one open at a time).
  const [expandedOption, setExpandedOption] = useState<string | null>(null);
  const [customOption, setCustomOption] = useState('');
  // Return Gifts vendors: number of gift pieces + a quantity discount note.
  const [giftCount, setGiftCount] = useState<string>('');
  const [giftDiscount, setGiftDiscount] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  // Which time slots the vendor offers per date (date -> slot ids).
  const [availableSlots, setAvailableSlots] = useState<Record<string, string[]>>({});
  const [newDate, setNewDate] = useState('');
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityNotice, setAvailabilityNotice] = useState('');

  const [myVendor, setMyVendor] = useState<Vendor | null>(null);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [vendorNotFound, setVendorNotFound] = useState(false);
  // Set when the load fails because the backend was unreachable (services /
  // database down), as opposed to the account simply having no listing. Lets
  // us show an actionable "can't reach server + Retry" screen instead of a
  // misleading "No Listing Found".
  const [loadError, setLoadError] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Venue');
  const [city, setCity] = useState('Chennai');
  const [startingPrice, setStartingPrice] = useState(50000);
  const [advancePercentage, setAdvancePercentage] = useState(20);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [contactPhone, setContactPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [description, setDescription] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  // Self-service listing creation, shown when a signed-in vendor has no
  // marketplace listing yet (e.g. a Google sign-up whose listing was never
  // created, or a returning account that skipped setup). Lets them create it
  // in-place instead of dead-ending on "No Listing Found / Contact support".
  const [creatingListing, setCreatingListing] = useState(false);
  const [createNotice, setCreateNotice] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);
  const [uploadQrNotice, setUploadQrNotice] = useState('');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Live payment alerts: when a customer confirms they've paid an advance on
  // the customer app, that booking arrives here as `pending_payment`. We track
  // which pending IDs we've already seen so a newly-arrived one pops a banner
  // the vendor can act on, rather than sitting silently in the list until the
  // next manual reload.
  const [paymentAlerts, setPaymentAlerts] = useState<Booking[]>([]);
  const knownPendingRef = useRef<Set<string>>(new Set());

  // Reconcile a freshly-fetched bookings list into state. When `notify` is on,
  // any pending_payment booking whose ID we haven't seen before raises an
  // alert; the initial load and vendor-triggered refreshes pass notify=false
  // so pre-existing claims don't spam the banner.
  const applyBookings = (list: Booking[], notify: boolean) => {
    const pending = list.filter((b) => b.status === 'pending_payment');
    if (notify) {
      const fresh = pending.filter((b) => !knownPendingRef.current.has(b.id));
      if (fresh.length > 0) {
        setPaymentAlerts((prev) => [...fresh, ...prev]);
        playNotificationSound();
      }
    }
    knownPendingRef.current = new Set(pending.map((b) => b.id));
    setBookings(list);
  };

  const dismissAlert = (id: string) =>
    setPaymentAlerts((prev) => prev.filter((b) => b.id !== id));

  const loadVendorAndBookings = async () => {
    if (!token) return;
    setVendorLoading(true);
    setVendorNotFound(false);
    setLoadError('');
    try {
      const res = await fetchMyVendor(token);
      if (res.success && res.data?.vendor) {
        const v = res.data.vendor;
        setMyVendor(v);
        setBusinessName(v.businessName);
        setCategory(v.category);
        setCity(v.location.city);
        setStartingPrice(v.startingPrice);
        setAdvancePercentage(v.policies?.advancePercentage ?? 20);
        setAdvanceAmount(v.policies?.advanceAmount ?? 0);
        // Older listings (and any created before signup carried the phone
        // through) store the marketplace service's default placeholder. When
        // that's the case, self-heal from the phone the owner gave at signup so
        // both this profile and the public listing show a real number.
        const PLACEHOLDER_PHONE = '+91 9000000000';
        const ownerPhone = user?.phone?.trim();
        if ((!v.contactPhone || v.contactPhone === PLACEHOLDER_PHONE) && ownerPhone) {
          setContactPhone(ownerPhone);
          updateVendor(token, v.id, { contactPhone: ownerPhone } as any).catch(() => {});
        } else {
          setContactPhone(v.contactPhone || '');
        }
        setUpiId(v.upiId || '');
        setQrCodeImage(v.qrCodeImage || '');
        setDescription(v.description);
        setFacilities(v.facilities || {});
        setGiftCount(v.giftCount != null ? String(v.giftCount) : '');
        setGiftDiscount(v.giftDiscount || '');
        setOfferedOptions(v.offeredOptions || []);
        setOfferedOptionPrices(v.offeredOptionPrices || {});
        setOfferedOptionItems(v.offeredOptionItems || {});
        setOfferedOptionImages(v.offeredOptionImages || {});
        setOfferedOptionQuality(v.offeredOptionQuality || {});
        setAvailableDates(v.availableDates || []);
        setAvailableSlots(v.availableSlots || {});
        setPackages(v.packages || []);
        setDeals(v.deals || []);
        // Build the private calendar-subscribe URL for this vendor.
        fetchCalendarToken(token, v.id)
          .then((r) => { if (r.data?.token) setCalendarUrl(`${GATEWAY_URL}/api/v1/bookings/vendor/${v.id}/calendar.ics?token=${r.data.token}`); })
          .catch(() => {});
        // Seed the verification form from any prior submission.
        setVerifyForm({
          legalName: v.verification?.legalName || v.businessName || '',
          registrationNumber: v.verification?.registrationNumber || '',
          gstNumber: v.verification?.gstNumber || '',
          contactPerson: v.verification?.contactPerson || '',
        });
        setVerifyDocs(v.verification?.documents || []);

        // Bookings/reviews are secondary — a hiccup here must not blank out the
        // listing that already loaded, so they get their own error handling
        // rather than falling through to the page-level "can't reach server".
        setBookingsLoading(true);
        try {
          const bkRes = await fetchVendorBookings(token, v.id);
          applyBookings(bkRes.data?.bookings || [], false);
        } catch {
          /* leave bookings as-is; the listing itself is fine */
        } finally {
          setBookingsLoading(false);
        }

        // Load customer reviews for this vendor (public endpoint).
        fetchVendorReviews(v.id)
          .then((rv) => setReviews(rv.data?.reviews || []))
          .catch(() => setReviews([]));
      } else {
        setVendorNotFound(true);
      }
    } catch (err: any) {
      // A thrown error means the request never got a valid JSON response —
      // i.e. the gateway/services/DB are unreachable, not "no listing".
      setLoadError(err?.message || 'Could not reach the server.');
    } finally {
      setVendorLoading(false);
    }
  };

  useEffect(() => {
    // Proactively wake up backend microservices on mount to avoid cold-start 502/504 errors on Render
    const endpoints = [
      '/api/v1/auth/me',
      '/api/v1/vendors',
      '/api/v1/bookings',
      '/api/v1/events',
      '/api/v1/invitations',
      '/api/v1/guests'
    ];
    endpoints.forEach(path => {
      fetch(`${GATEWAY_URL}${path}`).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (user && token) {
      loadVendorAndBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const handleReplySubmit = async (reviewId: string) => {
    if (!token) return;
    setReplySaving(true);
    try {
      const res = await replyToReview(token, reviewId, replyDraft.trim());
      if (res.data?.review) {
        setReviews((prev) => prev.map((r) => (r.id === reviewId ? res.data!.review : r)));
      }
      setReplyingTo(null);
      setReplyDraft('');
    } catch (err: any) {
      alert(err?.message || 'Could not post your reply. Please try again.');
    } finally {
      setReplySaving(false);
    }
  };

  const handleVerifyDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myVendor || !token) return;
    setVerifyUploading(true);
    setVerifyNotice('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${GATEWAY_URL}/api/v1/vendors/${myVendor.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (json.success && json.data?.fileUrl) {
        setVerifyDocs((prev) => [...prev, json.data.fileUrl]);
      } else {
        setVerifyNotice(json.message || 'Upload failed.');
      }
    } catch {
      setVerifyNotice('Upload failed — is the gateway running?');
    } finally {
      setVerifyUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmitVerification = async () => {
    if (!token || !myVendor) return;
    if (!verifyForm.legalName.trim() || !verifyForm.registrationNumber.trim()) {
      setVerifyNotice('Legal business name and registration number are required.');
      return;
    }
    if (verifyDocs.length === 0) {
      setVerifyNotice('Please upload at least one proof document (registration / GST / ID).');
      return;
    }
    setVerifySaving(true);
    setVerifyNotice('');
    try {
      const res = await submitVerification(token, myVendor.id, { ...verifyForm, documents: verifyDocs });
      if (res.data?.vendor) setMyVendor(res.data.vendor);
      setVerifyNotice('Verification request submitted — our team will review it shortly.');
    } catch (err: any) {
      setVerifyNotice(err?.message || 'Could not submit verification. Please try again.');
    } finally {
      setVerifySaving(false);
    }
  };

  // Persist a new deals array to the vendor and reflect it locally.
  const persistDeals = async (next: VendorDeal[]) => {
    if (!token || !myVendor) return;
    setDeals(next);
    try {
      const res = await updateVendor(token, myVendor.id, { deals: next } as any);
      if (res.data?.vendor) setMyVendor(res.data.vendor);
    } catch (err: any) {
      setDealNotice(err?.message || 'Could not save the offer. Please try again.');
    }
  };

  const handleAddDeal = async () => {
    if (!dealForm.title.trim()) { setDealNotice('Give the offer a title.'); return; }
    const value = Number(dealForm.discountValue);
    if (!value || value <= 0) { setDealNotice('Enter a discount value greater than zero.'); return; }
    if (dealForm.discountType === 'percent' && value > 100) { setDealNotice('A percentage discount can’t exceed 100%.'); return; }
    setDealSaving(true);
    setDealNotice('');
    const deal: VendorDeal = {
      id: `deal-${Date.now()}`,
      title: dealForm.title.trim(),
      description: dealForm.description.trim(),
      discountType: dealForm.discountType,
      discountValue: value,
      minOrderAmount: dealForm.minOrderAmount ? Number(dealForm.minOrderAmount) : undefined,
      expiresAt: dealForm.expiresAt || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    await persistDeals([deal, ...deals]);
    setDealForm({ title: '', description: '', discountType: 'percent', discountValue: '', minOrderAmount: '', expiresAt: '' });
    setDealSaving(false);
  };

  const handleToggleDeal = (id: string) =>
    persistDeals(deals.map((d) => (d.id === id ? { ...d, isActive: !d.isActive } : d)));

  const handleDeleteDeal = (id: string) => persistDeals(deals.filter((d) => d.id !== id));

  const handleSaveProfile = async () => {
    if (!token || !myVendor) return;
    setSavingProfile(true);
    setProfileNotice('');
    try {
      const res = await updateVendor(token, myVendor.id, {
        businessName,
        category,
        description,
        city,
        startingPrice,
        contactPhone,
        upiId,
        policies: { ...(myVendor.policies || {}), advancePercentage, advanceAmount: advanceAmount || null },
      } as any);
      if (res.data?.vendor) {
        setMyVendor(res.data.vendor);
        setAdvancePercentage(res.data.vendor.policies?.advancePercentage ?? advancePercentage);
        setAdvanceAmount(res.data.vendor.policies?.advanceAmount ?? 0);
        setContactPhone(res.data.vendor.contactPhone || '');
        setUpiId(res.data.vendor.upiId || '');
      }
      setProfileNotice('Profile changes saved.');
    } catch (err: any) {
      setProfileNotice(err.message || 'Could not save changes.');
    } finally {
      setSavingProfile(false);
      setTimeout(() => setProfileNotice(''), 4000);
    }
  };

  const handleCreateListing = async () => {
    if (!token) return;
    if (!businessName.trim()) {
      setCreateNotice('Please enter your business name.');
      return;
    }
    setCreatingListing(true);
    setCreateNotice('');
    try {
      const res = await createVendor(token, {
        businessName: businessName.trim(),
        category,
        city,
        description,
        contactPhone: user?.phone?.trim() || undefined,
        contactEmail: user?.email,
      } as any);
      if (res.success && res.data?.vendor) {
        // Listing created — reload so the dashboard renders in full.
        setVendorNotFound(false);
        await loadVendorAndBookings();
      } else {
        setCreateNotice(res.message || 'Could not create your listing. Please try again.');
      }
    } catch (err: any) {
      setCreateNotice(err.message || 'Could not reach the server. Please try again.');
    } finally {
      setCreatingListing(false);
    }
  };

  const toggleAmenity = (key: keyof VendorFacilities) => {
    const turningOff = !!facilities[key];
    setFacilities((prev) => ({ ...prev, [key]: !prev[key] }));
    // When an amenity is switched off, drop any priced rate-options the vendor
    // listed under it so stale rates aren't kept for something no longer offered.
    if (turningOff) {
      const label = AMENITY_OPTIONS.find((a) => a.key === key)?.label;
      if (label) {
        setOfferedOptionItems((prev) => {
          if (!(label in prev)) return prev;
          const next = { ...prev };
          delete next[label];
          return next;
        });
      }
    }
  };
  const setServiceTier = (key: keyof VendorFacilities, val: string) =>
    setFacilities((prev) => ({ ...prev, [key]: val }));

  const toggleOffered = (opt: string) => {
    const removing = offeredOptions.includes(opt);
    setOfferedOptions((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
    // Clear the price too when deselecting, so a later re-add starts blank
    // instead of silently resurrecting a stale price the vendor never set.
    setOfferedOptionPrices((prev) => {
      if (!(opt in prev)) return prev;
      const next = { ...prev };
      delete next[opt];
      return next;
    });
    // Same for the option's line-items, and collapse its editor if open.
    if (removing) {
      setOfferedOptionItems((prev) => {
        if (!(opt in prev)) return prev;
        const next = { ...prev };
        delete next[opt];
        return next;
      });
      setExpandedOption((cur) => (cur === opt ? null : cur));
      setOfferedOptionQuality((prev) => {
        if (!(opt in prev)) return prev;
        const next = { ...prev };
        delete next[opt];
        return next;
      });
    }
  };

  // Option-level quality (for NO_ITEM_OPTIONS like Live Streaming).
  const setOptionQuality = (opt: string, val: string) =>
    setOfferedOptionQuality((prev) => {
      if (val === '') {
        if (!(opt in prev)) return prev;
        const next = { ...prev };
        delete next[opt];
        return next;
      }
      return { ...prev, [opt]: val };
    });

  // --- Per-option line-item editing (name + rate + optional note) ---
  const addOptionItem = (opt: string) =>
    setOfferedOptionItems((prev) => ({
      ...prev,
      [opt]: [...(prev[opt] || []), { name: '', price: 0, note: '' }],
    }));

  const updateOptionItem = (opt: string, index: number, field: keyof OfferedOptionItem, raw: string) =>
    setOfferedOptionItems((prev) => {
      const list = [...(prev[opt] || [])];
      const item = { ...list[index] };
      if (field === 'price') {
        item.price = raw === '' ? 0 : Number(raw);
      } else if (field === 'areaCharge') {
        item.areaCharge = raw === '' ? 0 : Number(raw);
      } else if (field === 'photo') {
        item.photo = raw;
      } else if (field === 'name') {
        item.name = raw;
      } else if (field === 'equipments') {
        item.equipments = raw;
      } else if (field === 'quality') {
        item.quality = raw;
      } else {
        item.note = raw;
      }
      list[index] = item;
      return { ...prev, [opt]: list };
    });

  const removeOptionItem = (opt: string, index: number) =>
    setOfferedOptionItems((prev) => {
      const list = (prev[opt] || []).filter((_, i) => i !== index);
      const next = { ...prev };
      if (list.length) next[opt] = list;
      else delete next[opt];
      return next;
    });

  // Takes the raw input string (not a pre-parsed number) so an emptied field
  // can go back to truly empty instead of snapping to 0 — a 0 fallback here
  // would make the input un-clearable, since backspacing to "" would
  // immediately redisplay "0" and any further typing would land after it
  // (e.g. typing "45" into a "0"-filled field would end up as "045").
  const setOfferedOptionPrice = (opt: string, raw: string) => {
    setOfferedOptionPrices((prev) => {
      if (raw === '') {
        if (!(opt in prev)) return prev;
        const next = { ...prev };
        delete next[opt];
        return next;
      }
      return { ...prev, [opt]: Number(raw) };
    });
  };

  // Renders one offered option as an expandable card: the option chip + a
  // "from" price on top, and — when expanded — an editable list of named,
  // priced line-items (with an optional note) the vendor offers under it.
  // Used for both preset category options and custom ones, so every vendor,
  // whatever their category, can break an option down into priced items.
  const renderOfferedOptionCard = (opt: string, accent: 'emerald' | 'indigo') => {
    const items = offeredOptionItems[opt] || [];
    const isOpen = expandedOption === opt;
    const headerBg = accent === 'emerald' ? 'bg-emerald-600' : 'bg-indigo-600';
    // Autocomplete hints for the "Item name" field, matched to this vendor's
    // category + this option (e.g. Catering "Veg" → paneer dishes). Rendered
    // once per card as a <datalist> and shared by every row's input below.
    const nameSuggestions = getItemSuggestions(myVendor?.category, opt);
    const nameListId = suggestionListId(myVendor?.category, opt);
    // Placeholder example matched to THIS option — the first suggestion (e.g.
    // Veg → "Paneer Butter Masala", Non-Veg → "Chicken Biryani", Snacks →
    // "Samosa"). Falls back to the per-category example, then a generic label.
    const nameExample = nameSuggestions[0] ?? ITEM_NAME_EXAMPLE[myVendor?.category ?? ''] ?? 'Service item';
    return (
      <div key={opt} className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className={`flex items-center gap-2 flex-wrap px-3.5 py-2 ${headerBg}`}>
          <span className="flex items-center gap-1.5 text-xs text-white font-bold">
            <Check className="w-3 h-3" />
            {CATERING_OPTION_STYLE[opt] && <span className={`w-2 h-2 rounded-full ${CATERING_OPTION_STYLE[opt].dot}`} />}
            {opt}
          </span>
          {!NO_ITEM_OPTIONS.has(opt) && (
            <button
              type="button"
              onClick={() => setExpandedOption((cur) => (cur === opt ? null : opt))}
              className="ml-auto flex items-center gap-1 text-[11px] text-white font-bold px-2 py-1 rounded-lg bg-black/20 hover:bg-black/30"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              {items.length > 0 ? `${items.length} item${items.length === 1 ? '' : 's'}` : 'Add items'}
            </button>
          )}
          {NO_ITEM_OPTIONS.has(opt) && myVendor?.category === 'Media' && (
            <select
              value={offeredOptionQuality[opt] ?? ''}
              onChange={(e) => setOptionQuality(opt, e.target.value)}
              className="ml-auto w-36 p-1.5 rounded-lg bg-black/20 text-white text-[11px] font-bold focus:outline-none"
            >
              <option value="">Quality (optional)</option>
              {MEDIA_QUALITY_OPTIONS.map((q) => (
                <option key={q} value={q} className="bg-slate-900">{q}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => toggleOffered(opt)}
            aria-label={`Remove ${opt}`}
            className={`w-5 h-5 rounded-full flex items-center justify-center text-white hover:bg-white/20 shrink-0 ${NO_ITEM_OPTIONS.has(opt) && myVendor?.category !== 'Media' ? 'ml-auto' : ''}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {isOpen && !NO_ITEM_OPTIONS.has(opt) && (
          <div className="p-3 space-y-2">
            {nameSuggestions.length > 0 && (
              <datalist id={nameListId}>
                {nameSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
            {items.length === 0 && (
              <p className="text-[11px] text-slate-500">
                No items yet — add {opt.toLowerCase()} items with a rate. Customers see each one on your listing.
              </p>
            )}
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateOptionItem(opt, i, 'name', e.target.value)}
                  placeholder={`Item name (e.g. ${nameExample})`}
                  list={nameSuggestions.length > 0 ? nameListId : undefined}
                  className="flex-1 min-w-[150px] p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                />
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    value={item.price === 0 ? '' : item.price}
                    onChange={(e) => updateOptionItem(opt, i, 'price', e.target.value)}
                    placeholder="rate"
                    className="w-20 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                </div>
                {myVendor?.category === 'Media' && (
                  <>
                    {mediaExtraField(opt) === 'equipments' && (
                      <select
                        value={item.equipments ?? ''}
                        onChange={(e) => updateOptionItem(opt, i, 'equipments', e.target.value)}
                        className="w-36 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                      >
                        <option value="">Equipments (optional)</option>
                        {MEDIA_EQUIPMENT_OPTIONS.map((eq) => (
                          <option key={eq} value={eq}>{eq}</option>
                        ))}
                      </select>
                    )}
                    <select
                      value={item.quality ?? ''}
                      onChange={(e) => updateOptionItem(opt, i, 'quality', e.target.value)}
                      className="w-32 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                    >
                      <option value="">Quality (optional)</option>
                      {MEDIA_QUALITY_OPTIONS.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1" title="Extra charge for outstation / other areas">
                      <span className="text-slate-400 text-xs">+₹</span>
                      <input
                        type="number"
                        value={item.areaCharge ? item.areaCharge : ''}
                        onChange={(e) => updateOptionItem(opt, i, 'areaCharge', e.target.value)}
                        placeholder="area charge"
                        className="w-24 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                      />
                    </div>
                  </>
                )}
                <input
                  type="text"
                  value={item.note ?? ''}
                  onChange={(e) => updateOptionItem(opt, i, 'note', e.target.value)}
                  placeholder="note (optional)"
                  className="flex-1 min-w-[120px] p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                />
                <div className="flex items-center gap-2 shrink-0">
                  {item.photo ? (
                    <div className="flex items-center gap-1.5">
                      <div className="relative h-9 w-9 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shrink-0">
                        <img src={item.photo} alt="item" className="w-full h-full object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateOptionItem(opt, i, 'photo', '')}
                        className="text-[10px] text-rose-400 font-bold hover:underline"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex items-center gap-1 text-[10px] px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700 shrink-0">
                      {uploadingItemPhoto === `${opt}-${i}` ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      Add Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingItemPhoto === `${opt}-${i}`}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleItemPhotoUpload(opt, i, f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeOptionItem(opt, i)}
                  aria-label="Remove item"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOptionItem(opt)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add item
            </button>

            {/* Photos for this option — shown to customers under it. Restricted to Flowers vendors only. */}
            {myVendor?.category === 'Flowers' && (
              <div className="pt-2 mt-1 border-t border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Photos</span>
                  {(offeredOptionImages[opt] || []).map((url) => (
                    <div key={url} className="relative h-14 w-14 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                      <img src={url} alt="option" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeOptionImage(opt, url)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-slate-950/80 text-slate-300 hover:text-rose-400 flex items-center justify-center"
                        title="Remove photo"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  <label className="cursor-pointer flex items-center gap-1 text-[11px] px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700">
                    {uploadingOptionPhoto === opt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Add photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingOptionPhoto === opt}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOptionPhotoUpload(opt, f); e.target.value = ''; }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const addCustomOption = () => {
    const val = customOption.trim();
    if (val && !offeredOptions.includes(val)) {
      setOfferedOptions((prev) => [...prev, val]);
    }
    setCustomOption('');
  };

  const handleSaveFacilities = async () => {
    if (!token || !myVendor) return;
    setSavingFacilities(true);
    setFacilitiesNotice('');
    try {
      const res = await updateVendor(token, myVendor.id, { facilities, offeredOptions, offeredOptionPrices, offeredOptionItems, offeredOptionQuality, offeredOptionImages, giftCount: giftCount === '' ? null : Number(giftCount), giftDiscount } as any);
      if (res.data?.vendor) {
        setMyVendor(res.data.vendor);
        setFacilities(res.data.vendor.facilities || {});
        setOfferedOptions(res.data.vendor.offeredOptions || []);
        setOfferedOptionPrices(res.data.vendor.offeredOptionPrices || {});
        setOfferedOptionItems(res.data.vendor.offeredOptionItems || {});
        setOfferedOptionQuality(res.data.vendor.offeredOptionQuality || {});
        setOfferedOptionImages(res.data.vendor.offeredOptionImages || {});
      }
      setFacilitiesNotice('Options saved — these now show on your marketplace listing.');
    } catch (err: any) {
      setFacilitiesNotice(err.message || 'Could not save options.');
    } finally {
      setSavingFacilities(false);
      setTimeout(() => setFacilitiesNotice(''), 4000);
    }
  };

  // --- Package management (name, price, description, capacity, duration) ---
  const addPackage = () =>
    setPackages((prev) => [
      ...prev,
      { id: `pkg-${Date.now()}`, packageName: '', price: 0, description: '', includedServices: [] },
    ]);

  // One-click: add three tiered packages named for this vendor's category
  // (e.g. Standard / HD / Premium 4K for Media). The vendor just fills in the
  // prices/descriptions; customers pick a tier on the Packages tab.
  const addTierPackages = () => {
    if (!myVendor) return;
    const [t1, t2, t3] = tierNamesForCategory(myVendor.category);
    const base = Date.now();
    setPackages((prev) => [
      ...prev,
      ...[t1, t2, t3].map((name, i) => ({
        id: `pkg-${base + i}`,
        packageName: name,
        price: 0,
        description: '',
        includedServices: [],
      })),
    ]);
  };

  const updatePackageField = (id: string, field: keyof VendorPackage, raw: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (field === 'price') return { ...p, price: raw === '' ? 0 : Number(raw) };
        if (field === 'durationHours') return { ...p, durationHours: raw === '' ? undefined : Number(raw) };
        if (field === 'capacityPersons') return { ...p, capacityPersons: raw === '' ? undefined : Number(raw) };
        if (field === 'includedServices') return { ...p, includedServices: raw.split(',').map((s) => s.trim()).filter(Boolean) };
        if (field === 'packageName') return { ...p, packageName: raw };
        if (field === 'description') return { ...p, description: raw };
        return p;
      })
    );

  const removePackage = (id: string) => setPackages((prev) => prev.filter((p) => p.id !== id));

  // Vendor-defined price tiers within a package (name + price), e.g. Normal /
  // HD / Premium. Customers pick one when booking.
  const addPackageTier = (pkgId: string) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, tiers: [...(p.tiers || []), { name: '', price: 0 }] } : p)));
  const updatePackageTier = (pkgId: string, idx: number, field: 'name' | 'price', raw: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const tiers = [...(p.tiers || [])];
        tiers[idx] = { ...tiers[idx], [field]: field === 'price' ? (raw === '' ? 0 : Number(raw)) : raw };
        return { ...p, tiers };
      })
    );
  const removePackageTier = (pkgId: string, idx: number) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, tiers: (p.tiers || []).filter((_, i) => i !== idx) } : p)));

  // Catering packages carry a structured menu spec (food types, cuisines, dish
  // counts, live counters, service style, inclusions). Update one field:
  const updatePackageCatering = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, catering: { ...(p.catering || {}), [field]: value } } : p)));
  // Toggle membership of a value in one of the catering multi-select arrays.
  const toggleCateringOption = (pkgId: string, field: 'foodTypes' | 'cuisines' | 'liveCounters', item: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = ((p.catering as any)?.[field]) || [];
      const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
      return { ...p, catering: { ...(p.catering || {}), [field]: next } };
    }));
  const catChip = (active: boolean) =>
    `px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${active ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'}`;

  // Venue packages carry structured hall details (sessions, AC/Non-AC, class,
  // amenities). Same shape of helpers as catering.
  const updatePackageVenue = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, venue: { ...(p.venue || {}), [field]: value } } : p)));
  const toggleVenueSession = (pkgId: string, session: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = (p.venue?.sessions) || [];
      const next = current.includes(session) ? current.filter((x) => x !== session) : [...current, session];
      return { ...p, venue: { ...(p.venue || {}), sessions: next } };
    }));

  // Decoration packages carry structured details (theme, areas, flowers, etc.).
  const updatePackageDecoration = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, decoration: { ...(p.decoration || {}), [field]: value } } : p)));
  const toggleDecorationOption = (pkgId: string, field: 'themes' | 'areas', item: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = ((p.decoration as any)?.[field]) || [];
      const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
      return { ...p, decoration: { ...(p.decoration || {}), [field]: next } };
    }));

  // Makeup & Beauty packages carry structured details.
  const updatePackageMakeup = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, makeup: { ...(p.makeup || {}), [field]: value } } : p)));
  const toggleMakeupType = (pkgId: string, item: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = (p.makeup?.makeupTypes) || [];
      const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
      return { ...p, makeup: { ...(p.makeup || {}), makeupTypes: next } };
    }));

  // Media packages carry structured details (coverage, style, deliverables).
  const updatePackageMedia = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, media: { ...(p.media || {}), [field]: value } } : p)));
  const toggleMediaStyle = (pkgId: string, item: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = (p.media?.styles) || [];
      const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
      return { ...p, media: { ...(p.media || {}), styles: next } };
    }));

  // Transport packages carry structured details (vehicle, capacity, inclusions).
  const updatePackageTransport = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, transport: { ...(p.transport || {}), [field]: value } } : p)));

  // Pujari/Priest packages carry structured ceremony details.
  const updatePackagePriest = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, priest: { ...(p.priest || {}), [field]: value } } : p)));
  const togglePriestLanguage = (pkgId: string, lang: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = (p.priest?.languages) || [];
      const next = current.includes(lang) ? current.filter((x) => x !== lang) : [...current, lang];
      return { ...p, priest: { ...(p.priest || {}), languages: next } };
    }));

  // Invitation packages carry structured design details.
  const updatePackageInvitation = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, invitation: { ...(p.invitation || {}), [field]: value } } : p)));
  const toggleInvitationArray = (pkgId: string, field: 'addOns' | 'languages', item: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = ((p.invitation as any)?.[field]) || [];
      const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
      return { ...p, invitation: { ...(p.invitation || {}), [field]: next } };
    }));

  // Printing packages carry structured product details.
  const updatePackagePrinting = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, printing: { ...(p.printing || {}), [field]: value } } : p)));
  const togglePrintingFinish = (pkgId: string, finish: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = (p.printing?.finishes) || [];
      const next = current.includes(finish) ? current.filter((x) => x !== finish) : [...current, finish];
      return { ...p, printing: { ...(p.printing || {}), finishes: next } };
    }));

  // Return Gifts packages carry structured gift details.
  const updatePackageReturnGifts = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, returnGifts: { ...(p.returnGifts || {}), [field]: value } } : p)));

  // Entertainment packages carry structured act details.
  const updatePackageEntertainment = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, entertainment: { ...(p.entertainment || {}), [field]: value } } : p)));

  // Music/DJ packages carry structured details.
  const updatePackageMusicDj = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, musicDj: { ...(p.musicDj || {}), [field]: value } } : p)));

  // Lighting packages carry structured details.
  const updatePackageLighting = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, lighting: { ...(p.lighting || {}), [field]: value } } : p)));
  const toggleLightingType = (pkgId: string, item: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = (p.lighting?.lightingTypes) || [];
      const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
      return { ...p, lighting: { ...(p.lighting || {}), lightingTypes: next } };
    }));

  // Flowers packages carry structured details.
  const updatePackageFlowers = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, flowers: { ...(p.flowers || {}), [field]: value } } : p)));

  // Mehendi packages carry structured details.
  const updatePackageMehendi = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, mehendi: { ...(p.mehendi || {}), [field]: value } } : p)));

  // Event Host/Anchor packages carry structured details.
  const updatePackageEventHost = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, eventHost: { ...(p.eventHost || {}), [field]: value } } : p)));

  // Security packages carry structured details.
  const updatePackageSecurity = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, security: { ...(p.security || {}), [field]: value } } : p)));

  // Rental Equipment packages carry structured details.
  const updatePackageRental = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, rental: { ...(p.rental || {}), [field]: value } } : p)));
  const toggleRentalItem = (pkgId: string, item: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = (p.rental?.items) || [];
      const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
      return { ...p, rental: { ...(p.rental || {}), items: next } };
    }));

  // Utensils for Rent packages carry structured details.
  const updatePackageUtensils = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, utensils: { ...(p.utensils || {}), [field]: value } } : p)));

  // Wedding Planner packages carry structured details.
  const updatePackageWeddingPlanner = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, weddingPlanner: { ...(p.weddingPlanner || {}), [field]: value } } : p)));
  // Corporate Event Services packages carry structured details.
  const updatePackageCorporate = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, corporate: { ...(p.corporate || {}), [field]: value } } : p)));
  const toggleUtensilsVessel = (pkgId: string, item: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = (p.utensils?.vesselTypes) || [];
      const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
      return { ...p, utensils: { ...(p.utensils || {}), vesselTypes: next } };
    }));
  const toggleEventHostLanguage = (pkgId: string, lang: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = (p.eventHost?.languages) || [];
      const next = current.includes(lang) ? current.filter((x) => x !== lang) : [...current, lang];
      return { ...p, eventHost: { ...(p.eventHost || {}), languages: next } };
    }));
  const toggleFlowersItem = (pkgId: string, item: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = (p.flowers?.items) || [];
      const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
      return { ...p, flowers: { ...(p.flowers || {}), items: next } };
    }));

  // Photos of a package / hall — uploaded to the shared storage endpoint and
  // attached to that package so customers see them on the package card.
  const [uploadingPkgId, setUploadingPkgId] = useState<string | null>(null);
  const handlePackagePhotoUpload = async (pkgId: string, file: File) => {
    if (!token) return;
    setUploadingPkgId(pkgId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${GATEWAY_URL}/api/v1/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (json?.data?.fileUrl) {
        setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, images: [...(p.images || []), json.data.fileUrl] } : p)));
      }
    } catch {
      /* upload is best-effort; vendor can retry */
    } finally {
      setUploadingPkgId(null);
    }
  };
  const removePackageImage = (pkgId: string, url: string) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, images: (p.images || []).filter((u) => u !== url) } : p)));

  // Photos per offered option (keyed by option label) — uploaded to the shared
  // storage endpoint and shown to customers under that option on the listing.
  const [uploadingOptionPhoto, setUploadingOptionPhoto] = useState<string | null>(null);
  const handleOptionPhotoUpload = async (opt: string, file: File) => {
    if (!token) return;
    setUploadingOptionPhoto(opt);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${GATEWAY_URL}/api/v1/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (json?.data?.fileUrl) {
        setOfferedOptionImages((prev) => ({ ...prev, [opt]: [...(prev[opt] || []), json.data.fileUrl] }));
      }
    } catch {
      /* best-effort */
    } finally {
      setUploadingOptionPhoto(null);
    }
  };
  const removeOptionImage = (opt: string, url: string) =>
    setOfferedOptionImages((prev) => ({ ...prev, [opt]: (prev[opt] || []).filter((u) => u !== url) }));

  const [uploadingItemPhoto, setUploadingItemPhoto] = useState<string | null>(null);
  const handleItemPhotoUpload = async (opt: string, itemIdx: number, file: File) => {
    if (!token) return;
    const key = `${opt}-${itemIdx}`;
    setUploadingItemPhoto(key);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${GATEWAY_URL}/api/v1/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (json?.data?.fileUrl) {
        updateOptionItem(opt, itemIdx, 'photo', json.data.fileUrl);
      }
    } catch {
      /* best-effort */
    } finally {
      setUploadingItemPhoto(null);
    }
  };

  const handleSavePackages = async () => {
    if (!token || !myVendor) return;
    // Drop empty rows (no name and no price) so blank cards aren't persisted.
    const cleaned = packages.filter((p) => p.packageName.trim() || p.price > 0);
    setSavingPackages(true);
    setPackagesNotice('');
    try {
      const res = await updateVendor(token, myVendor.id, { packages: cleaned } as any);
      if (res.data?.vendor) {
        setMyVendor(res.data.vendor);
        setPackages(res.data.vendor.packages || []);
      }
      setPackagesNotice('Packages saved — customers see these on your listing.');
    } catch (err: any) {
      setPackagesNotice(err.message || 'Could not save packages.');
    } finally {
      setSavingPackages(false);
      setTimeout(() => setPackagesNotice(''), 4000);
    }
  };

  const addDate = () => {
    if (newDate && !availableDates.includes(newDate)) {
      setAvailableDates((prev) => [...prev, newDate].sort());
      // A new date offers all slots by default; the vendor can trim them below.
      setAvailableSlots((prev) => ({ ...prev, [newDate]: AVAILABILITY_SLOTS.map((s) => s.id) }));
    }
    setNewDate('');
  };
  const removeDate = (d: string) => {
    setAvailableDates((prev) => prev.filter((x) => x !== d));
    setAvailableSlots((prev) => { const next = { ...prev }; delete next[d]; return next; });
  };
  // Toggle whether the vendor offers a given slot on a given date.
  const toggleDateSlot = (date: string, slot: string) =>
    setAvailableSlots((prev) => {
      const current = prev[date] && prev[date].length ? prev[date] : AVAILABILITY_SLOTS.map((s) => s.id);
      const next = current.includes(slot) ? current.filter((x) => x !== slot) : [...current, slot];
      return { ...prev, [date]: next };
    });

  const handleSaveAvailability = async () => {
    if (!token || !myVendor) return;
    setSavingAvailability(true);
    setAvailabilityNotice('');
    try {
      const res = await updateVendor(token, myVendor.id, { availableDates, availableSlots } as any);
      if (res.data?.vendor) {
        setMyVendor(res.data.vendor);
        setAvailableDates(res.data.vendor.availableDates || []);
        setAvailableSlots(res.data.vendor.availableSlots || {});
      }
      setAvailabilityNotice('Availability saved — customers see only your open dates.');
    } catch (err: any) {
      setAvailabilityNotice(err.message || 'Could not save availability.');
    } finally {
      setSavingAvailability(false);
      setTimeout(() => setAvailabilityNotice(''), 4000);
    }
  };

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myVendor || !token) return;

    setUploading(true);
    setUploadNotice('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${GATEWAY_URL}/api/v1/vendors/${myVendor.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.fileUrl) {
        const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.name);
        setMyVendor((prev) => {
          if (!prev) return null;
          if (isVideo) {
            return {
              ...prev,
              galleryVideos: [...(prev.galleryVideos || []), json.data.fileUrl],
            };
          } else {
            return {
              ...prev,
              galleryImages: [...(prev.galleryImages || []), json.data.fileUrl],
            };
          }
        });
        setUploadNotice('Portfolio asset saved to local disk storage (/uploads)!');
      } else {
        setUploadNotice(json.message || 'Upload failed.');
      }
    } catch (err) {
      setUploadNotice('Upload failed — is the gateway running?');
    } finally {
      setUploading(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myVendor || !token) return;

    setUploadingQr(true);
    setUploadQrNotice('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${GATEWAY_URL}/api/v1/vendors/${myVendor.id}/upload-qr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.fileUrl) {
        setQrCodeImage(json.data.fileUrl);
        setMyVendor((prev) => (prev ? { ...prev, qrCodeImage: json.data.fileUrl } : prev));
        setUploadQrNotice('UPI QR code saved!');
      } else {
        setUploadQrNotice(json.message || 'Upload failed.');
      }
    } catch (err) {
      setUploadQrNotice('Upload failed — is the gateway running?');
    } finally {
      setUploadingQr(false);
    }
  };

  const [counterAmount, setCounterAmount] = useState<Record<string, string>>({});

  // Draft spend line-items per booking, keyed by booking id. Each booking gets a
  // working list the vendor edits inline, plus a saving flag for feedback.
  const [spendDrafts, setSpendDrafts] = useState<Record<string, { label: string; amount: string }[]>>({});
  const [spendSaving, setSpendSaving] = useState<Record<string, boolean>>({});
  const [spendOpen, setSpendOpen] = useState<Record<string, boolean>>({});

  // Seed the draft from the booking's saved items the first time the vendor
  // opens the editor, so existing line-items are shown for editing.
  const openSpendEditor = (b: Booking) => {
    setSpendOpen((prev) => ({ ...prev, [b.id]: !prev[b.id] }));
    setSpendDrafts((prev) => {
      if (prev[b.id]) return prev;
      const seed = (b.spendItems && b.spendItems.length > 0)
        ? b.spendItems.map((s) => ({ label: s.label, amount: String(s.amount) }))
        : [{ label: '', amount: '' }];
      return { ...prev, [b.id]: seed };
    });
  };

  const setSpendRow = (bookingId: string, idx: number, field: 'label' | 'amount', value: string) => {
    setSpendDrafts((prev) => {
      const rows = [...(prev[bookingId] || [])];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...prev, [bookingId]: rows };
    });
  };

  const addSpendRow = (bookingId: string) => {
    setSpendDrafts((prev) => ({ ...prev, [bookingId]: [...(prev[bookingId] || []), { label: '', amount: '' }] }));
  };

  const removeSpendRow = (bookingId: string, idx: number) => {
    setSpendDrafts((prev) => ({ ...prev, [bookingId]: (prev[bookingId] || []).filter((_, i) => i !== idx) }));
  };

  const handleSaveSpend = async (bookingId: string) => {
    if (!token) return;
    const rows = (spendDrafts[bookingId] || [])
      .map((r) => ({ label: r.label.trim(), amount: Number(r.amount) }))
      .filter((r) => r.label.length > 0 && Number.isFinite(r.amount) && r.amount > 0);
    setSpendSaving((prev) => ({ ...prev, [bookingId]: true }));
    try {
      await updateSpendBreakdown(token, bookingId, rows);
      await refreshBookings();
      setSpendOpen((prev) => ({ ...prev, [bookingId]: false }));
    } finally {
      setSpendSaving((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  const refreshBookings = async (notify = false) => {
    if (token && myVendor) {
      // Silent fetch: a booking-list refresh (poll or post-action) must never
      // trigger a full-page reload on a transient 401, which would reset the
      // vendor's current tab. A real session expiry is still caught when the
      // vendor next confirms/saves something.
      const bkRes = await fetchVendorBookingsSilent(token, myVendor.id);
      applyBookings(bkRes.data?.bookings || [], notify);
    }
  };

  // Poll every 15s while the vendor is signed in so a new advance-payment
  // claim shows up (and rings the banner) without a manual reload.
  useEffect(() => {
    if (!token || !myVendor) return;
    const id = setInterval(() => {
      refreshBookings(true).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, myVendor]);

  const handleAcceptQuote = async (id: string) => {
    if (!token) return;
    await confirmBooking(token, id);
    await refreshBookings();
  };

  const handleSendCounter = async (id: string) => {
    if (!token) return;
    const amt = Number(counterAmount[id]);
    if (!amt || amt <= 0) return;
    await sendCounterQuote(token, id, amt);
    setCounterAmount((prev) => ({ ...prev, [id]: '' }));
    await refreshBookings();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!token) return;
    await updateBookingStatus(token, id, status);
    await refreshBookings();
  };

  const handleConfirmPayment = async (bookingId: string, paymentId: string) => {
    if (!token) return;
    try {
      await confirmBookingPayment(token, bookingId, paymentId);
      await refreshBookings();
    } catch (err: any) {
      alert(err?.message || 'Could not confirm the payment.');
    }
  };

  const handleViewInvoice = async (bookingId: string) => {
    if (!token) return;
    try {
      const res = await fetchBookingInvoice(token, bookingId);
      if (res.data?.invoice) openInvoicePrintWindow(res.data.invoice);
    } catch (err: any) {
      alert(err?.message || 'Could not load the invoice.');
    }
  };

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'completed');
  const totalEarnings = confirmedBookings.reduce((acc, b) => acc + b.advanceAmountPaid, 0);
  const [earningsExpanded, setEarningsExpanded] = useState(false);

  if (!user) {
    return <AuthGate onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col font-sans">
      {/* App-wide romantic-celebration backdrop, fixed behind all scrolling content */}
      <div className="fixed inset-0 -z-10">
        <FloralGoldBackground />
      </div>

      {/* Header — auspicious gold banner */}
      <header className="sticky top-0 z-50 relative overflow-hidden border-b border-amber-500/30 bg-gradient-to-r from-[#1a1030] via-[#140b22] to-[#1a1030] backdrop-blur-xl shadow-[0_4px_22px_-14px_rgba(245,158,11,0.28)]">
        {/* soft gold glow + decorative bottom accent line */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-[36rem] h-32 rounded-full bg-amber-500/10 blur-3xl"></div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-200 via-amber-400 to-orange-600 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-amber-500/40 ring-2 ring-amber-300/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-extrabold text-xl bg-gradient-to-r from-amber-100 via-white to-amber-200 bg-clip-text text-transparent">Magizhnaazh Vendor Portal</span>
              <span className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Business Partner Workspace
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="hidden sm:block text-slate-400">
              Signed in as <strong className="text-amber-300">{user.name}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/60 border border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/10 text-rose-400 font-bold text-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Live advance-payment alerts — a customer just confirmed payment on
          the customer app. Stacked toasts the vendor can confirm or dismiss. */}
      {paymentAlerts.length > 0 && (
        <div className="fixed top-24 right-4 z-[90] w-full max-w-xs space-y-2">
          {paymentAlerts.map((b) => (
            <div
              key={b.id}
              className="glass-card rounded-2xl border border-amber-500/40 bg-slate-950/90 shadow-2xl p-4 animate-in"
            >
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">New advance payment claimed</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    <strong className="text-slate-200">{b.bookingNumber}</strong> • {b.packageName}
                  </p>
                  <p className="text-[11px] text-amber-300 mt-0.5">
                    Advance ₹{(b.advanceAmountPaid || b.agreedPrice).toLocaleString('en-IN')} — verify it landed, then confirm.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={async () => { await handleAcceptQuote(b.id); dismissAlert(b.id); }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] shadow"
                    >
                      Confirm Received
                    </button>
                    <button
                      onClick={() => dismissAlert(b.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-[11px] hover:text-white"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => dismissAlert(b.id)}
                  className="text-slate-500 hover:text-white shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {vendorLoading && (
        <div className="flex-1 flex items-center justify-center py-32 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading your vendor listing...
        </div>
      )}

      {!vendorLoading && loadError && !myVendor && (
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 w-full">
          <div className="glass-card p-8 rounded-3xl border border-slate-800 space-y-3 text-center">
            <h2 className="font-display font-bold text-xl text-white">Can't reach the server</h2>
            <p className="text-xs text-slate-400">
              We couldn't load your listing — the backend may be starting up or a
              service/database is down. Check that the services are running, then retry.
            </p>
            <p className="text-[11px] text-slate-600 font-mono">{loadError}</p>
            <button
              onClick={loadVendorAndBookings}
              className="mt-1 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md hover:brightness-110"
            >
              Retry
            </button>
          </div>
        </main>
      )}

      {!vendorLoading && !loadError && vendorNotFound && (
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 w-full">
          {/* Auspicious gold-framed onboarding card — warm, celebratory welcome. */}
          <div className="relative rounded-[28px] p-[1.5px] bg-gradient-to-br from-amber-300/80 via-amber-500/25 to-rose-500/50 shadow-[0_0_40px_-20px_rgba(245,158,11,0.35)]">
            <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-b from-[#1c1030] via-[#160c24] to-[#0a0611] p-8 space-y-5">
              {/* soft festive glow blobs */}
              <div className="pointer-events-none absolute -top-20 -right-12 w-52 h-52 rounded-full bg-amber-500/20 blur-3xl"></div>
              <div className="pointer-events-none absolute -bottom-20 -left-12 w-52 h-52 rounded-full bg-rose-500/15 blur-3xl"></div>
              {/* faint corner flourishes */}
              <Sparkles className="pointer-events-none absolute top-5 left-5 w-4 h-4 text-amber-400/30" />
              <Sparkles className="pointer-events-none absolute bottom-5 right-5 w-4 h-4 text-amber-400/30" />

              <div className="relative text-center space-y-3">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/40 ring-4 ring-amber-400/10">
                  <Store className="w-8 h-8 text-slate-950" />
                </div>
                {/* decorative divider — a small auspicious motif */}
                <div className="flex items-center justify-center gap-2 text-amber-400/80">
                  <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/70"></span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400/70"></span>
                </div>
                <h2 className="font-display font-extrabold text-2xl bg-gradient-to-r from-[#e9d5a0] via-[#f2e3ba] to-[#e9d5a0] bg-clip-text text-transparent">
                  Set Up Your Business Listing
                </h2>
                <p className="text-xs text-slate-300/85 leading-relaxed max-w-sm mx-auto">
                  Welcome{user?.name ? `, ${user.name}` : ''}! Your account doesn't have a
                  marketplace listing yet. Add a few details to create it and open your dashboard.
                </p>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-amber-200/70 mb-1">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Rohini Caterers"
                  className="w-full p-3 rounded-xl bg-slate-950/60 border-2 border-amber-500/50 text-white font-bold text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-500/25 transition-colors"
                />
              </div>

              <div className="relative grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-200/70 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950/60 border-2 border-amber-500/50 text-white font-semibold text-xs focus:outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-500/25 transition-colors"
                  >
                    {VENDOR_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-200/70 mb-1">City / Locality</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950/60 border-2 border-amber-500/50 text-white font-semibold text-xs focus:outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-500/25 transition-colors"
                  >
                    {STATIC_CITY_GROUPS.map(([state, cities]) => (
                      <optgroup key={state} label={state} className="bg-slate-900">
                        {cities.map((c) => (
                          <option key={`${state}-${c}`} value={c} className="bg-slate-900">{c}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-amber-200/70 mb-1">Short Description <span className="text-slate-500 font-normal">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Tell customers what your business offers."
                  className="w-full p-3 rounded-xl bg-slate-950/60 border-2 border-amber-500/50 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-500/25 transition-colors"
                />
              </div>

              {createNotice && (
                <p className="relative text-xs text-rose-400 text-center">{createNotice}</p>
              )}

              <button
                onClick={handleCreateListing}
                disabled={creatingListing}
                className="shine-sweep relative w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#e6c66e] to-[#d29f3c] text-slate-950 font-bold text-sm shadow-md shadow-amber-900/20 hover:brightness-105 disabled:opacity-60 transition"
              >
                {creatingListing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {creatingListing ? 'Creating your listing…' : 'Create Listing & Continue'}
              </button>
              <p className="relative text-[11px] text-slate-500 text-center">
                You can edit all of this later in Business Profile.
              </p>
            </div>
          </div>
        </main>
      )}

      {!vendorLoading && myVendor && (
      <main className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full space-y-8">

        {/* Vendor Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl text-white">{myVendor.businessName}</h1>
            <p className="text-slate-400 text-sm mt-1">{myVendor.category} • {myVendor.location.city}</p>
          </div>

          <button
            type="button"
            onClick={() => setEarningsExpanded((s) => !s)}
            aria-expanded={earningsExpanded}
            className="p-4 rounded-2xl glass-card border border-emerald-500/30 flex items-center gap-3 hover:border-emerald-500/60 transition-colors"
          >
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Earnings</span>
              <span className="font-display font-extrabold text-2xl text-emerald-400">
                ₹{totalEarnings.toLocaleString('en-IN')}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${earningsExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {earningsExpanded && (
          <div className="glass-card p-6 rounded-3xl border border-emerald-500/30">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-emerald-400" /> Where Your Earnings Came From
            </h3>
            {confirmedBookings.length === 0 ? (
              <p className="text-xs text-slate-500">No confirmed bookings yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {confirmedBookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-200">
                      {b.packageName} <span className="text-slate-500">({b.bookingNumber})</span>
                    </span>
                    <span className="text-emerald-400 font-semibold">₹{b.advanceAmountPaid.toLocaleString('en-IN')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 border-b border-slate-800">
          {[
            { key: 'dashboard', label: 'Bookings & Quotes' },
            { key: 'reviews', label: `Reviews${reviews.length ? ` (${reviews.length})` : ''}` },
            { key: 'facilities', label: facilitiesSectionLabel(myVendor?.category) },
            { key: 'packages', label: `${myVendor?.category === 'Venue' ? 'Halls' : 'Packages'}${packages.length ? ` (${packages.length})` : ''}` },
            ...(myVendor?.category !== 'Security' ? [{ key: 'offers', label: `Offers${deals.length ? ` (${deals.length})` : ''}` }] : []),
            { key: 'availability', label: 'Availability' },
            { key: 'portfolio', label: 'Local Disk Portfolio' },
            { key: 'profile', label: 'Business Profile' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-100 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card relative overflow-hidden rounded-2xl p-5">
                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#cbb06a] uppercase tracking-wide">Confirmed Bookings</span>
                    <div className="font-display font-extrabold text-3xl text-white mt-1">{confirmedBookings.length}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                    <Check className="w-5 h-5 text-slate-950" />
                  </div>
                </div>
              </div>

              <div className="glass-card relative overflow-hidden rounded-2xl p-5">
                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#cbb06a] uppercase tracking-wide">Pending Quotes</span>
                    <div className="font-display font-extrabold text-3xl text-amber-400 mt-1">
                      {bookings.filter((b) => b.status === 'quote_requested' || b.status === 'enquiry').length}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                    <ClockIcon className="w-5 h-5 text-slate-950" />
                  </div>
                </div>
              </div>

              <div className="glass-card relative overflow-hidden rounded-2xl p-5">
                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#cbb06a] uppercase tracking-wide">Partner Rating</span>
                    <div className="font-display font-extrabold text-3xl text-amber-400 mt-1 flex items-center gap-1.5">
                      <Star className="w-6 h-6 fill-amber-400" /> {myVendor.ratingAverage} <span className="text-base text-slate-300 font-bold">({myVendor.reviewCount} Reviews)</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                    <Star className="w-5 h-5 fill-slate-950 text-slate-950" />
                  </div>
                </div>
              </div>
            </div>

            {bookings.length > 0 && (
              <div className="glass-card p-6 rounded-3xl border border-slate-800">
                <h3 className="font-bold text-lg text-white mb-4">Booking Analytics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-3">Bookings by status</p>
                    {(() => {
                      const byStatus = bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {} as Record<string, number>);
                      const max = Math.max(1, ...Object.values(byStatus));
                      return (
                        <div className="space-y-2">
                          {Object.entries(byStatus).map(([s, n]) => (
                            <div key={s}>
                              <div className="flex justify-between text-xs mb-1"><span className="text-slate-300 capitalize">{s.replace(/_/g, ' ')}</span><span className="text-slate-400 font-semibold">{n}</span></div>
                              <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${(n / max) * 100}%` }} /></div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="grid grid-cols-2 gap-3 content-start">
                    <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Gross Booked</span>
                      <span className="text-lg font-extrabold text-white">{inr(confirmedBookings.reduce((a, b) => a + b.agreedPrice, 0))}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Advance In</span>
                      <span className="text-lg font-extrabold text-emerald-400">{inr(totalEarnings)}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Requests</span>
                      <span className="text-lg font-extrabold text-white">{bookings.length}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Rating</span>
                      <span className="text-lg font-extrabold text-amber-400 flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400" />{myVendor.ratingAverage}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="glass-card relative rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-amber-500/15 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                  <Receipt className="w-4 h-4 text-slate-950" />
                </div>
                <h3 className="font-bold text-lg text-white">Client Bookings & Quote Requests</h3>
              </div>

              {bookingsLoading ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading bookings...
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No bookings yet.</div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {bookings.map((b) => (
                    <div key={b.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">{b.bookingNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                            b.status === 'pending_payment' ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'
                          }`}>
                            {STATUS_LABEL[b.status] || b.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-1">
                          Package: <strong className="text-slate-200">{b.packageName}</strong> • Date: <strong className="text-amber-400">{b.eventDate}</strong>{b.timeSlot ? <> • <span className="text-indigo-300">{slotLabelWithTime(b.timeSlot)}</span></> : null}
                        </p>

                        {b.selectedOptions && b.selectedOptions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {b.selectedOptions.map((opt) => (
                              <span key={opt} className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-[11px] font-semibold">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}

                        {b.specialInstructions && <p className="text-xs text-slate-300 mt-2 italic">"{b.specialInstructions}"</p>}

                        {b.referenceImages && b.referenceImages.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Customer reference images</p>
                            <div className="flex flex-wrap gap-2">
                              {b.referenceImages.map((img) => (
                                <a key={img} href={img} target="_blank" rel="noreferrer">
                                  {isVideoUrl(img) ? (
                                    <div className="relative h-16 w-16 rounded-lg border border-slate-700 overflow-hidden flex items-center justify-center bg-black hover:border-amber-500 transition-colors">
                                      <video src={img} className="w-full h-full object-cover" preload="metadata" />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <span className="text-white text-[10px]">▶</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <img src={img} alt="Customer reference" className="h-16 w-16 object-cover rounded-lg border border-slate-700 hover:border-amber-500 transition-colors" />
                                  )}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {(b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'completed') && (
                          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                            {ORDER_STEPS.map((step) => {
                              const isActive = b.status === step.key;
                              const isPast = ORDER_STEPS.findIndex((s) => s.key === b.status) > ORDER_STEPS.findIndex((s) => s.key === step.key);
                              return (
                                <button
                                  key={step.key}
                                  onClick={() => handleUpdateStatus(b.id, step.key)}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                                    isActive
                                      ? 'bg-amber-500 border-amber-500 text-slate-950'
                                      : isPast
                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {step.label}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {(b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'completed') && (
                          <div className="mt-3">
                            <button
                              onClick={() => openSpendEditor(b)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-bold"
                            >
                              <Receipt className="w-3.5 h-3.5 text-amber-400" />
                              {b.spendItems && b.spendItems.length > 0 ? 'Edit spend breakdown' : 'Add spend breakdown'}
                              {b.spendItems && b.spendItems.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                                  {b.spendItems.length}
                                </span>
                              )}
                            </button>

                            {spendOpen[b.id] && (
                              <div className="mt-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 max-w-md">
                                <p className="text-[11px] text-slate-400 mb-2">
                                  Tell the customer what this money was spent on. Each line shows under your name in their budget.
                                </p>
                                <div className="space-y-2">
                                  {(spendDrafts[b.id] || []).map((row, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        placeholder="Spent on (e.g. Mandap flowers)"
                                        value={row.label}
                                        onChange={(e) => setSpendRow(b.id, idx, 'label', e.target.value)}
                                        className="flex-1 min-w-0 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                                      />
                                      <input
                                        type="number"
                                        placeholder="₹"
                                        value={row.amount}
                                        onChange={(e) => setSpendRow(b.id, idx, 'amount', e.target.value)}
                                        className="w-24 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                                      />
                                      <button
                                        onClick={() => removeSpendRow(b.id, idx)}
                                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400"
                                        aria-label="Remove line"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex items-center justify-between mt-3 gap-2">
                                  <button
                                    onClick={() => addSpendRow(b.id)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-300 hover:text-indigo-200"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Add line
                                  </button>
                                  <button
                                    onClick={() => handleSaveSpend(b.id)}
                                    disabled={spendSaving[b.id]}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-[11px] disabled:opacity-60"
                                  >
                                    {spendSaving[b.id] && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Save breakdown
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="font-display font-extrabold text-xl text-emerald-400 block">
                          ₹{b.agreedPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Advance Paid: ₹{b.advanceAmountPaid.toLocaleString('en-IN')}
                        </span>
                        {(b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'completed') && (
                          <span className={`text-[11px] block ${(b.remainingAmount ?? 0) <= 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                            {(b.remainingAmount ?? 0) <= 0 ? '✓ Paid in full' : `Balance due: ₹${(b.remainingAmount ?? 0).toLocaleString('en-IN')}`}
                          </span>
                        )}

                        {/* A balance the customer has recorded, awaiting the vendor's confirmation. */}
                        {(() => {
                          const claim = (b.payments || []).find((p) => p.type === 'balance' && p.status === 'claimed');
                          return claim ? (
                            <div className="mt-2 flex flex-col items-end gap-1">
                              <p className="text-[10px] text-sky-300 text-right max-w-[220px]">
                                Customer recorded a balance payment of ₹{claim.amount.toLocaleString('en-IN')}{claim.reference ? ` (ref: ${claim.reference})` : ''}. Verify it landed, then confirm.
                              </p>
                              <button onClick={() => handleConfirmPayment(b.id, claim.id)}
                                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md">
                                Confirm Balance Received
                              </button>
                            </div>
                          ) : null;
                        })()}

                        {(b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'completed') && (
                          <button onClick={() => handleViewInvoice(b.id)}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-bold">
                            <Receipt className="w-3.5 h-3.5 text-indigo-400" /> Invoice
                          </button>
                        )}

                        {b.status === 'pending_payment' && (
                          <div className="mt-3 flex flex-col items-end gap-1.5">
                            <p className="text-[10px] text-amber-300 text-right max-w-[220px]">
                              Customer says they've paid the advance via UPI. Verify it landed, then confirm.
                            </p>
                            <button
                              onClick={() => handleAcceptQuote(b.id)}
                              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md"
                            >
                              Confirm Advance Received
                            </button>
                          </div>
                        )}

                        {(b.status === 'quote_requested' || b.status === 'enquiry' || b.status === 'quote_sent') && (
                          <div className="mt-3 flex flex-col items-end gap-2">
                            <button
                              onClick={() => handleAcceptQuote(b.id)}
                              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md"
                            >
                              Accept Booking Quote
                            </button>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                placeholder="Counter ₹"
                                value={counterAmount[b.id] ?? ''}
                                onChange={(e) => setCounterAmount((prev) => ({ ...prev, [b.id]: e.target.value }))}
                                className="w-28 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                              />
                              <button
                                onClick={() => handleSendCounter(b.id)}
                                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-xs hover:bg-slate-700"
                              >
                                Counter
                              </button>
                            </div>
                          </div>
                        )}
                        {b.quotesHistory && b.quotesHistory.length > 0 && (
                          <p className="text-[10px] text-slate-500 mt-1">{b.quotesHistory.length} quote(s) exchanged</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customer Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-5">
            <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Customer Reviews
                </h3>
                <p className="text-xs text-slate-400 mt-1">Verified feedback from customers after their booking was completed.</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                  <span className="font-display font-extrabold text-3xl text-white">
                    {reviews.length ? (reviews.reduce((s, r) => s + r.overallRating, 0) / reviews.length).toFixed(1) : '0.0'}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{reviews.length} review{reviews.length === 1 ? '' : 's'}</span>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="glass-card p-12 rounded-3xl border border-slate-800 text-center text-sm text-slate-400">
                No reviews yet. Once a customer's booking is marked completed, they can rate and review you — it'll appear here.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="glass-card p-5 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-bold text-xs">
                          {(r.customerName || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{r.customerName || 'Customer'}</p>
                          <p className="text-[10px] text-slate-500">{r.eventType} · {new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`w-4 h-4 ${n <= r.overallRating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-slate-300 mt-2.5 italic">"{r.comment}"</p>}

                    {/* Vendor's public reply */}
                    {r.vendorReply && replyingTo !== r.id && (
                      <div className="mt-3 ml-4 pl-3 border-l-2 border-amber-500/40">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Your reply</span>
                          {r.vendorReplyAt && (
                            <span className="text-[10px] text-slate-500">{new Date(r.vendorReplyAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300">{r.vendorReply}</p>
                        <button
                          onClick={() => { setReplyingTo(r.id); setReplyDraft(r.vendorReply || ''); }}
                          className="mt-1.5 text-[11px] font-semibold text-amber-400 hover:text-amber-300"
                        >
                          Edit reply
                        </button>
                      </div>
                    )}

                    {/* Reply composer */}
                    {replyingTo === r.id ? (
                      <div className="mt-3 ml-4 pl-3 border-l-2 border-amber-500/40">
                        <textarea
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          rows={3}
                          maxLength={1000}
                          autoFocus
                          placeholder="Write a public response to this customer…"
                          className="w-full rounded-xl bg-slate-900 border border-slate-700 text-sm text-white p-3 focus:outline-none focus:border-amber-500"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleReplySubmit(r.id)}
                            disabled={replySaving}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs disabled:opacity-50"
                          >
                            {replySaving ? 'Saving…' : r.vendorReply ? 'Update reply' : 'Post reply'}
                          </button>
                          <button
                            onClick={() => { setReplyingTo(null); setReplyDraft(''); }}
                            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
                          >
                            Cancel
                          </button>
                          {r.vendorReply && (
                            <button
                              onClick={() => { setReplyDraft(''); handleReplySubmit(r.id); }}
                              disabled={replySaving}
                              className="ml-auto text-[11px] font-semibold text-rose-400 hover:text-rose-300 disabled:opacity-50"
                            >
                              Delete reply
                            </button>
                          )}
                        </div>
                      </div>
                    ) : !r.vendorReply && (
                      <button
                        onClick={() => { setReplyingTo(r.id); setReplyDraft(''); }}
                        className="mt-3 text-[11px] font-semibold text-amber-400 hover:text-amber-300"
                      >
                        + Reply to this review
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Portfolio & Local Storage Upload Tab */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div className="p-8 rounded-3xl glass-card border border-slate-800 text-center max-w-xl mx-auto">
              <Upload className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-pulse" />
              <h3 className="font-bold text-xl text-white">Local Storage Portfolio Upload</h3>
              <p className="text-xs text-slate-400 mt-2 mb-6">
                Upload business images and videos directly to local disk directory <code className="text-amber-400 font-mono">/uploads/vendor-{myVendor.id}</code> using <code className="text-indigo-400 font-mono">LocalStorageProvider</code>.
              </p>

              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-lg transition-all hover:scale-105">
                <span>Choose Image/Video to Upload</span>
                <input type="file" accept="image/*,video/*" onChange={handleLocalUpload} className="hidden" />
              </label>

              {uploading && <p className="text-xs text-indigo-400 mt-4">Saving file to local disk...</p>}
              {uploadNotice && <p className="text-xs text-emerald-400 mt-4 font-semibold">{uploadNotice}</p>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(myVendor.galleryVideos || []).map((url, idx) => (
                <div key={`vid-${idx}`} className="h-44 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative group">
                  <video src={url} controls className="w-full h-full object-cover" preload="metadata" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 text-white text-[10px] font-semibold">Video</span>
                </div>
              ))}
              {myVendor.galleryImages.map((img, idx) => (
                <div key={`img-${idx}`} className="h-44 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                  <img src={img} alt={`Portfolio ${idx}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Facilities & Options Tab */}
        {activeTab === 'facilities' && (
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-3xl space-y-6">
            <div>
              <h3 className="font-bold text-xl text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-400" /> {facilitiesSectionLabel(myVendor?.category)}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Tick what you offer. These become the filter chips customers see on your marketplace listing.
              </p>
            </div>

            {/* Venue-only amenities & event-service tiers */}
            {myVendor.category === 'Venue' && (
              <>
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase mb-3">Amenities</p>
                  <div className="flex flex-wrap gap-2">
                    {AMENITY_OPTIONS.map((a) => {
                      const on = !!facilities[a.key];
                      return (
                        <button
                          key={a.key}
                          type="button"
                          onClick={() => toggleAmenity(a.key)}
                          className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
                            on ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {on && <Check className="w-3 h-3" />} {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* For each ticked amenity, let the vendor list priced rate
                    options under it — e.g. AC room → "1 hall with 1 AC ₹1200".
                    Reuses offeredOptionItems keyed by the amenity label. */}
                {AMENITY_OPTIONS.filter((a) => !!facilities[a.key]).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-amber-400 uppercase">Rate options for your amenities</p>
                    <p className="text-[11px] text-slate-500 -mt-2">
                      Add pricing choices under each amenity you offer — e.g. under AC room: "1 hall with 1 AC — ₹1200", "2 halls with 1 AC — ₹2400". Customers see these on your listing.
                    </p>
                    {AMENITY_OPTIONS.filter((a) => !!facilities[a.key]).map((a) => {
                      const items = offeredOptionItems[a.label] || [];
                      const amenitySuggestions = getAmenitySuggestions(a.label);
                      const amenityListId = suggestionListId('amenity', a.label);
                      return (
                        <div key={a.key} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                            <Check className="w-3.5 h-3.5" /> {a.label}
                          </div>
                          {amenitySuggestions.length > 0 && (
                            <datalist id={amenityListId}>
                              {amenitySuggestions.map((s) => (
                                <option key={s} value={s} />
                              ))}
                            </datalist>
                          )}
                          {items.map((it, i) => (
                            <div key={i} className="flex items-center gap-2 flex-wrap">
                              <input
                                value={it.name}
                                onChange={(e) => updateOptionItem(a.label, i, 'name', e.target.value)}
                                placeholder={`e.g. ${a.example}`}
                                list={amenitySuggestions.length > 0 ? amenityListId : undefined}
                                className="flex-1 min-w-[140px] p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
                              />
                              <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                <span className="text-slate-500 text-xs">₹</span>
                                <input
                                  type="number"
                                  value={it.price || ''}
                                  onChange={(e) => updateOptionItem(a.label, i, 'price', e.target.value)}
                                  placeholder="1200"
                                  className="w-20 py-2 bg-transparent text-white text-xs focus:outline-none"
                                />
                              </div>
                              <input
                                value={it.note || ''}
                                onChange={(e) => updateOptionItem(a.label, i, 'note', e.target.value)}
                                placeholder="note e.g. per day"
                                className="w-32 p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => removeOptionItem(a.label, i)}
                                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center shrink-0"
                                aria-label="Remove rate option"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addOptionItem(a.label)}
                            className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add rate option
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase mb-3">Event services</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SERVICE_TIERS.map((s) => (
                      <div key={s.key} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-sm text-slate-200">{s.label}</span>
                        <select
                          value={(facilities[s.key] as string) || 'not_offered'}
                          onChange={(e) => setServiceTier(s.key, e.target.value)}
                          className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2 py-1.5 text-xs"
                        >
                          <option value="included">Included</option>
                          <option value="extra_cost">Available (extra cost)</option>
                          <option value="not_offered">Not offered</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Category-specific service chips, plus universal ones (like Advance) every category gets */}
            {(() => {
              const suggestedOptions = [...(CATEGORY_OPTIONS[myVendor.category] || []), ...UNIVERSAL_OPTIONS];
              return (
              <div className="space-y-5">
                {suggestedOptions.length > 0 ? (
                  <>
                    <div>
                      <p className="text-xs font-bold text-emerald-400 uppercase mb-1">
                        Available at {myVendor.category} — you offer this
                      </p>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Expand each to add named items with their own rates (and a note) — e.g. under Veg, list each dish. Customers see them on your listing. Click the ✕ to remove.
                      </p>
                      {suggestedOptions.filter((opt) => offeredOptions.includes(opt)).length > 0 ? (
                        <div className="space-y-2">
                          {suggestedOptions
                            .filter((opt) => offeredOptions.includes(opt))
                            .map((opt) => renderOfferedOptionCard(opt, 'emerald'))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Nothing selected yet — tick options below to add them to your listing.
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                        Not available at {myVendor.category} yet — click to add
                      </p>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Common {myVendor.category} options you haven't turned on. Booking these isn't possible for customers until you do.
                      </p>
                      {suggestedOptions.filter((opt) => !offeredOptions.includes(opt)).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {suggestedOptions
                            .filter((opt) => !offeredOptions.includes(opt))
                            .map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => toggleOffered(opt)}
                                className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                {CATERING_OPTION_STYLE[opt] && <span className={`w-2 h-2 rounded-full ${CATERING_OPTION_STYLE[opt].dot}`} />}
                                {opt}
                              </button>
                            ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Every preset {myVendor.category} option is already offered.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">
                    No preset options for "{myVendor.category}" yet — add what you offer below.
                  </p>
                )}
              </div>
              );
            })()}

            {/* Return Gifts vendors get two structured fields instead of the
                free-text option box: how many gifts, and a discount note. */}
            {myVendor.category === 'Return Gifts' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-400 uppercase mb-1.5">Count of gifts</label>
                  <input
                    type="number"
                    value={giftCount}
                    onChange={(e) => setGiftCount(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">How many gift pieces you supply per order.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-400 uppercase mb-1.5">Discount (based on item)</label>
                  <input
                    type="text"
                    value={giftDiscount}
                    onChange={(e) => setGiftDiscount(e.target.value)}
                    placeholder="e.g. 10% off above 100 pieces"
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Bulk / item-based discount customers get.</p>
                </div>
              </div>
            )}

            {/* Custom options already added by the vendor stay visible/editable,
                but the free-text "Add your own option" box has been removed. */}
            {offeredOptions.filter((o) => !(CATEGORY_OPTIONS[myVendor.category] || []).includes(o) && !UNIVERSAL_OPTIONS.includes(o)).length > 0 && (
              <div className="space-y-2">
                {offeredOptions
                  .filter((o) => !(CATEGORY_OPTIONS[myVendor.category] || []).includes(o) && !UNIVERSAL_OPTIONS.includes(o))
                  .map((opt) => renderOfferedOptionCard(opt, 'indigo'))}
              </div>
            )}

            {facilitiesNotice && <p className="text-xs text-emerald-400 font-semibold">{facilitiesNotice}</p>}

            <button
              onClick={handleSaveFacilities}
              disabled={savingFacilities}
              className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {savingFacilities && <Loader2 className="w-4 h-4 animate-spin" />} Save Options
            </button>
          </div>
        )}

        {/* Packages Tab */}
        {activeTab === 'packages' && (
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-3xl space-y-5">
            <div>
              <h3 className="font-bold text-xl text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" /> {myVendor?.category === 'Venue' ? 'Function Halls' : 'Packages'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {myVendor?.category === 'Venue'
                  ? 'Add each of your function halls with its capacity, price and photos. Customers see them on the "Halls" tab of your listing and can book any one they like.'
                  : 'Bundle your services into priced packages. Customers see these on the "Packages" tab of your listing and can book them.'}
              </p>
            </div>

            {packages.length === 0 && (
              <p className="text-xs text-slate-500">{myVendor?.category === 'Venue' ? 'No halls yet — add your first function hall below.' : 'No packages yet — add your first one below.'}</p>
            )}

            <div className="space-y-4">
              {packages.map((p) => (
                <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                  {myVendor?.category === 'Security' && (
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Group of security guards</label>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      value={p.packageName}
                      onChange={(e) => updatePackageField(p.id, 'packageName', e.target.value)}
                      placeholder={myVendor?.category === 'Security' ? 'e.g. Bouncers (5 Guards)' : myVendor?.category === 'Venue' ? 'Hall name — e.g. AC Banquet Hall' : 'Package name — e.g. Silver Wedding Package'}
                      className="flex-1 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => removePackage(p.id)}
                      className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center shrink-0"
                      aria-label="Remove package"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`grid grid-cols-1 ${myVendor?.category === 'Catering' ? 'sm:grid-cols-1' : myVendor?.category === 'Security' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                        {myVendor?.category === 'Catering' ? 'Price per plate (₹)' : myVendor?.category === 'Security' ? 'Price per guard / shift (₹)' : myVendor?.category === 'Venue' ? 'Price per session (₹)' : myVendor?.category === 'Decoration' ? 'Price per function (₹)' : myVendor?.category === 'Makeup & Beauty' ? 'Price per look / function (₹)' : myVendor?.category === 'Media' ? 'Price per event / day (₹)' : myVendor?.category === 'Transport' ? 'Price per vehicle (₹)' : myVendor?.category === 'Pujari/Priest' ? 'Price per ceremony (₹)' : myVendor?.category === 'Invitation' ? 'Price per design / quantity (₹)' : myVendor?.category === 'Printing' ? 'Price per quantity (₹)' : myVendor?.category === 'Return Gifts' ? 'Price per piece (₹)' : myVendor?.category === 'Entertainment' ? 'Price per act / hour (₹)' : myVendor?.category === 'Music/DJ' ? 'Price per event / hour (₹)' : myVendor?.category === 'Lighting' ? 'Price per function (₹)' : myVendor?.category === 'Flowers' ? 'Price per item / function (₹)' : myVendor?.category === 'Mehendi' ? 'Price per bride (₹)' : myVendor?.category === 'Event Host/Anchor' ? 'Price per event (₹)' : myVendor?.category === 'Rental Equipment' ? 'Per-day rate (₹)' : myVendor?.category === 'Utensils for Rent' ? 'Per-set price (₹)' : myVendor?.category === 'Wedding Planner' ? 'Price per package / function (₹)' : myVendor?.category === 'Corporate Event Services' ? 'Price per event / head (₹)' : 'Price (₹)'}
                      </label>
                      <input
                        type="number"
                        value={p.price || ''}
                        onChange={(e) => updatePackageField(p.id, 'price', e.target.value)}
                        placeholder={myVendor?.category === 'Catering' ? '500' : myVendor?.category === 'Security' ? '2000' : '150000'}
                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                      />
                    </div>
                    {myVendor?.category !== 'Security' && myVendor?.category !== 'Catering' && myVendor?.category !== 'Media' && myVendor?.category !== 'Transport' && myVendor?.category !== 'Invitation' && myVendor?.category !== 'Printing' && myVendor?.category !== 'Return Gifts' && myVendor?.category !== 'Music/DJ' && myVendor?.category !== 'Lighting' && myVendor?.category !== 'Flowers' && myVendor?.category !== 'Mehendi' && myVendor?.category !== 'Event Host/Anchor' && myVendor?.category !== 'Rental Equipment' && myVendor?.category !== 'Utensils for Rent' && myVendor?.category !== 'Wedding Planner' && myVendor?.category !== 'Corporate Event Services' && (
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                          {myVendor?.category === 'Pujari/Priest' ? 'No. of persons' : myVendor?.category === 'Entertainment' ? 'Number of performers' : 'Capacity (persons)'}
                        </label>
                        <input
                          type="number"
                          value={p.capacityPersons ?? ''}
                          onChange={(e) => updatePackageField(p.id, 'capacityPersons', e.target.value)}
                          placeholder="500"
                          className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                        />
                      </div>
                    )}
                    {myVendor?.category !== 'Security' && myVendor?.category !== 'Catering' && myVendor?.category !== 'Media' && myVendor?.category !== 'Transport' && myVendor?.category !== 'Invitation' && myVendor?.category !== 'Printing' && myVendor?.category !== 'Return Gifts' && myVendor?.category !== 'Music/DJ' && myVendor?.category !== 'Lighting' && myVendor?.category !== 'Flowers' && myVendor?.category !== 'Mehendi' && myVendor?.category !== 'Event Host/Anchor' && myVendor?.category !== 'Rental Equipment' && myVendor?.category !== 'Utensils for Rent' && myVendor?.category !== 'Wedding Planner' && myVendor?.category !== 'Corporate Event Services' && (
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                          Duration (hours)
                        </label>
                        <input
                          type="number"
                          value={p.durationHours ?? ''}
                          onChange={(e) => updatePackageField(p.id, 'durationHours', e.target.value)}
                          placeholder="8"
                          className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {myVendor?.category === 'Security' && (
                    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                      <p className="text-[10px] text-amber-400 uppercase font-bold">Security details</p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Type</label>
                          <div className="flex flex-wrap gap-2">
                            {SECURITY_TYPES.map((t) => (
                              <button type="button" key={t} onClick={() => updatePackageSecurity(p.id, 'type', t)} className={catChip(p.security?.type === t)}>{t}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Gender</label>
                          <div className="flex flex-wrap gap-2">
                            {SECURITY_GENDERS.map((g) => (
                              <button type="button" key={g} onClick={() => updatePackageSecurity(p.id, 'gender', g)} className={catChip(p.security?.gender === g)}>{g}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Number of guards</label>
                          <input type="number" min={0} value={p.security?.numGuards ?? ''} onChange={(e) => updatePackageSecurity(p.id, 'numGuards', e.target.value === '' ? undefined : Number(e.target.value))}
                            placeholder="e.g. 5" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Hours / shifts</label>
                          <input type="number" min={0} value={p.security?.hoursShifts ?? ''} onChange={(e) => updatePackageSecurity(p.id, 'hoursShifts', e.target.value === '' ? undefined : Number(e.target.value))}
                            placeholder="e.g. 8" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {([['metalDetectors', 'Metal detectors'], ['cctv', 'CCTV'], ['vipProtection', 'VIP protection'], ['crowdManagement', 'Gate / crowd mgmt']] as const).map(([field, label]) => (
                          <div key={field}>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                            <div className="flex gap-1.5">
                              <button type="button" onClick={() => updatePackageSecurity(p.id, field, true)} className={catChip((p.security as any)?.[field] === true)}>Yes</button>
                              <button type="button" onClick={() => updatePackageSecurity(p.id, field, false)} className={catChip((p.security as any)?.[field] === false)}>No</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {myVendor?.category !== 'Security' && (
                    <>
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={p.description}
                          onChange={(e) => updatePackageField(p.id, 'description', e.target.value)}
                          placeholder="What this package includes and who it's for."
                          className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                        />
                      </div>

                      {myVendor?.category === 'Catering' && (
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5">Menu Photo / Card</label>
                          
                          {p.images && p.images.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              {p.images.map((url) => (
                                <div key={url} className="relative group rounded-lg overflow-hidden border border-slate-800 h-20 bg-slate-950">
                                  <img src={url} alt="Menu page" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => removePackageImage(p.id, url)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-950/80 hover:bg-rose-600 hover:text-white text-slate-400 flex items-center justify-center transition-colors"
                                    title="Remove menu page"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-bold cursor-pointer transition-colors">
                            {uploadingPkgId === p.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Uploading Menu…</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Upload Menu Photo</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePackagePhotoUpload(p.id, file);
                                e.target.value = '';
                              }}
                              className="hidden"
                              disabled={uploadingPkgId === p.id}
                            />
                          </label>
                        </div>
                      )}

                      {/* Catering: structured menu spec (replaces the generic tiers/options). */}
                      {myVendor?.category === 'Catering' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Menu details</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Menu Tier</label>
                            <div className="flex flex-wrap gap-2">
                              {CATERING_MENU_TIERS.map((t) => (
                                <button type="button" key={t} onClick={() => updatePackageCatering(p.id, 'menuTier', t)} className={catChip(p.catering?.menuTier === t)}>{t}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Food Type</label>
                            <div className="flex flex-wrap gap-2">
                              {CATERING_FOOD_TYPES.map((f) => (
                                <button type="button" key={f} onClick={() => toggleCateringOption(p.id, 'foodTypes', f)} className={catChip((p.catering?.foodTypes || []).includes(f))}>{f}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Cuisine</label>
                            <div className="flex flex-wrap gap-2">
                              {CATERING_CUISINES.map((c) => (
                                <button type="button" key={c} onClick={() => toggleCateringOption(p.id, 'cuisines', c)} className={catChip((p.catering?.cuisines || []).includes(c))}>{c}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Number of dishes included</label>
                            <p className="text-[10px] text-slate-500 mb-1.5">How many items the customer gets in each course. e.g. 6 starters, 8 mains, 3 desserts.</p>
                            <div className="grid grid-cols-3 gap-2">
                              {([['starters', 'Starters'], ['mains', 'Mains'], ['desserts', 'Desserts']] as const).map(([field, label]) => (
                                <div key={field}>
                                  <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
                                  <input type="number" min={0} value={(p.catering as any)?.[field] ?? ''} onChange={(e) => updatePackageCatering(p.id, field, e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="e.g. 6" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Minimum guest count</label>
                            <input type="number" min={0} value={p.catering?.minGuests ?? ''} onChange={(e) => updatePackageCatering(p.id, 'minGuests', e.target.value === '' ? undefined : Number(e.target.value))}
                              placeholder="e.g. 100" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Live Counters</label>
                            <div className="flex flex-wrap gap-2">
                              {CATERING_LIVE_COUNTERS.map((lc) => (
                                <button type="button" key={lc} onClick={() => toggleCateringOption(p.id, 'liveCounters', lc)} className={catChip((p.catering?.liveCounters || []).includes(lc))}>{lc}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Service Style</label>
                            <select value={p.catering?.serviceStyle ?? ''} onChange={(e) => updatePackageCatering(p.id, 'serviceStyle', e.target.value || undefined)}
                              className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm">
                              <option value="">Select…</option>
                              {CATERING_SERVICE_STYLES.map((s) => (<option key={s} value={s}>{s}</option>))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {([['welcomeDrinks', 'Welcome drinks'], ['servingStaff', 'Serving staff included'], ['freeTasting', 'Free tasting / trial']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageCatering(p.id, field, true)} className={catChip((p.catering as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageCatering(p.id, field, false)} className={catChip((p.catering as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Venue: structured hall spec (replaces the generic price tiers). */}
                      {myVendor?.category === 'Venue' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Hall details</p>
                          <p className="text-[10px] text-slate-500">Hall name is the package name above; seating capacity is the "Capacity (persons)" field; price is per session.</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Sessions offered (priced per session)</label>
                            <div className="flex flex-wrap gap-2">
                              {VENUE_SESSIONS.map((s) => (
                                <button type="button" key={s} onClick={() => toggleVenueSession(p.id, s)} className={catChip((p.venue?.sessions || []).includes(s))}>{s}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Hall Type</label>
                              <div className="flex flex-wrap gap-2">
                                {VENUE_HALL_TYPES.map((t) => (
                                  <button type="button" key={t} onClick={() => updatePackageVenue(p.id, 'hallType', t)} className={catChip(p.venue?.hallType === t)}>{t}</button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Hall Class</label>
                              <div className="flex flex-wrap gap-2">
                                {VENUE_HALL_CLASSES.map((c) => (
                                  <button type="button" key={c} onClick={() => updatePackageVenue(p.id, 'hallClass', c)} className={catChip(p.venue?.hallClass === c)}>{c}</button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Accommodation rooms</label>
                              <input type="number" min={0} value={p.venue?.accommodationRooms ?? ''} onChange={(e) => updatePackageVenue(p.id, 'accommodationRooms', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 4" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Catering</label>
                              <select value={p.venue?.cateringPolicy ?? ''} onChange={(e) => updatePackageVenue(p.id, 'cateringPolicy', e.target.value || undefined)}
                                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm">
                                <option value="">Select…</option>
                                {VENUE_CATERING_POLICIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {([['parking', 'Parking available'], ['powerBackup', 'Power backup / generator'], ['bridalRoom', 'Bridal / green room'], ['stageIncluded', 'Stage included'], ['valetService', 'Valet / parking service']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageVenue(p.id, field, true)} className={catChip((p.venue as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageVenue(p.id, field, false)} className={catChip((p.venue as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Decoration: structured decor spec (replaces the generic price tiers). */}
                      {myVendor?.category === 'Decoration' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Decoration details</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Package Tier</label>
                            <div className="flex flex-wrap gap-2">
                              {DECORATION_TIERS.map((t) => (
                                <button type="button" key={t} onClick={() => updatePackageDecoration(p.id, 'tier', t)} className={catChip(p.decoration?.tier === t)}>{t}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Theme</label>
                            <div className="flex flex-wrap gap-2">
                              {DECORATION_THEMES.map((t) => (
                                <button type="button" key={t} onClick={() => toggleDecorationOption(p.id, 'themes', t)} className={catChip((p.decoration?.themes || []).includes(t))}>{t}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Areas covered</label>
                            <div className="flex flex-wrap gap-2">
                              {DECORATION_AREAS.map((a) => (
                                <button type="button" key={a} onClick={() => toggleDecorationOption(p.id, 'areas', a)} className={catChip((p.decoration?.areas || []).includes(a))}>{a}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Flowers</label>
                            <div className="flex flex-wrap gap-2">
                              {DECORATION_FLOWER_TYPES.map((f) => (
                                <button type="button" key={f} onClick={() => updatePackageDecoration(p.id, 'flowers', f)} className={catChip(p.decoration?.flowers === f)}>{f}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Mandap type</label>
                              <input type="text" value={p.decoration?.mandapType ?? ''} onChange={(e) => updatePackageDecoration(p.id, 'mandapType', e.target.value)}
                                placeholder="e.g. Traditional wooden" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Functions covered</label>
                              <input type="number" min={0} value={p.decoration?.functionsCovered ?? ''} onChange={(e) => updatePackageDecoration(p.id, 'functionsCovered', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 2" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {([['coupleSofa', 'Couple sofa / seating'], ['lighting', 'Lighting included']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageDecoration(p.id, field, true)} className={catChip((p.decoration as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageDecoration(p.id, field, false)} className={catChip((p.decoration as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Makeup & Beauty: structured spec (replaces the generic price tiers). */}
                      {myVendor?.category === 'Makeup & Beauty' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Makeup details</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Makeup Type</label>
                            <div className="flex flex-wrap gap-2">
                              {MAKEUP_TYPES.map((t) => (
                                <button type="button" key={t} onClick={() => toggleMakeupType(p.id, t)} className={catChip((p.makeup?.makeupTypes || []).includes(t))}>{t}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Finish / Tier</label>
                            <div className="flex flex-wrap gap-2">
                              {MAKEUP_FINISHES.map((f) => (
                                <button type="button" key={f} onClick={() => updatePackageMakeup(p.id, 'finish', f)} className={catChip(p.makeup?.finish === f)}>{f}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Looks / functions</label>
                              <input type="number" min={0} value={p.makeup?.looksCount ?? ''} onChange={(e) => updatePackageMakeup(p.id, 'looksCount', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 3" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Extra family members covered</label>
                              <input type="number" min={0} value={p.makeup?.extraFamilyMembers ?? ''} onChange={(e) => updatePackageMakeup(p.id, 'extraFamilyMembers', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 2" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {([['hairstyling', 'Hairstyling included'], ['draping', 'Saree / dupatta draping'], ['trialSession', 'Trial session included'], ['travelToVenue', 'Travel to venue']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageMakeup(p.id, field, true)} className={catChip((p.makeup as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageMakeup(p.id, field, false)} className={catChip((p.makeup as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Media: structured spec (replaces capacity + generic price tiers). */}
                      {myVendor?.category === 'Media' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Media details</p>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tier</label>
                              <div className="flex flex-wrap gap-2">
                                {MEDIA_TIERS.map((t) => (
                                  <button type="button" key={t} onClick={() => updatePackageMedia(p.id, 'tier', t)} className={catChip(p.media?.tier === t)}>{t}</button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Style</label>
                              <div className="flex flex-wrap gap-2">
                                {MEDIA_STYLES.map((s) => (
                                  <button type="button" key={s} onClick={() => toggleMediaStyle(p.id, s)} className={catChip((p.media?.styles || []).includes(s))}>{s}</button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Coverage</label>
                            <div className="flex flex-wrap gap-2">
                              {MEDIA_COVERAGE.map((c) => (
                                <button type="button" key={c} onClick={() => updatePackageMedia(p.id, 'coverage', c)} className={catChip(p.media?.coverage === c)}>{c}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {([['daysOrEvents', 'Days / events'], ['crewCount', 'Crew (photographers / cinematographers)'], ['hoursCoverage', 'Total hours of coverage']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
                                <input type="number" min={0} value={(p.media as any)?.[field] ?? ''} onChange={(e) => updatePackageMedia(p.id, field, e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="0" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                              </div>
                            ))}
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Deliverables</label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Edited photos count</label>
                                <input type="number" min={0} value={p.media?.editedPhotos ?? ''} onChange={(e) => updatePackageMedia(p.id, 'editedPhotos', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="e.g. 300" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Album pages</label>
                                <input type="number" min={0} value={p.media?.albumPages ?? ''} onChange={(e) => updatePackageMedia(p.id, 'albumPages', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="e.g. 30" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {([['preWedding', 'Pre-wedding shoot'], ['drone', 'Drone'], ['teaser', 'Teaser'], ['film4k', '4K film']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageMedia(p.id, field, true)} className={catChip((p.media as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageMedia(p.id, field, false)} className={catChip((p.media as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Transport: structured spec (replaces capacity + generic price tiers). */}
                      {myVendor?.category === 'Transport' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Vehicle details</p>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tier</label>
                              <div className="flex flex-wrap gap-2">
                                {TRANSPORT_TIERS.map((t) => (
                                  <button type="button" key={t} onClick={() => updatePackageTransport(p.id, 'tier', t)} className={catChip(p.transport?.tier === t)}>{t}</button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Priced</label>
                              <div className="flex flex-wrap gap-2">
                                {TRANSPORT_PRICING_BASIS.map((b) => (
                                  <button type="button" key={b} onClick={() => updatePackageTransport(p.id, 'pricingBasis', b)} className={catChip(p.transport?.pricingBasis === b)}>{b}</button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Vehicle Type</label>
                            <div className="flex flex-wrap gap-2">
                              {TRANSPORT_VEHICLE_TYPES.map((v) => (
                                <button type="button" key={v} onClick={() => updatePackageTransport(p.id, 'vehicleType', v)} className={catChip(p.transport?.vehicleType === v)}>{v}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Use</label>
                            <div className="flex flex-wrap gap-2">
                              {TRANSPORT_USES.map((u) => (
                                <button type="button" key={u} onClick={() => updatePackageTransport(p.id, 'use', u)} className={catChip(p.transport?.use === u)}>{u}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {([['numVehicles', 'No. of vehicles'], ['seatsPerVehicle', 'Seats / vehicle'], ['kmHoursIncluded', 'Km / hours included']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
                                <input type="number" min={0} value={(p.transport as any)?.[field] ?? ''} onChange={(e) => updatePackageTransport(p.id, field, e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="0" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {([['driverFuel', 'Driver + fuel included'], ['carDecoration', 'Car decoration']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageTransport(p.id, field, true)} className={catChip((p.transport as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageTransport(p.id, field, false)} className={catChip((p.transport as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pujari/Priest: structured ceremony spec (replaces generic price tiers). */}
                      {myVendor?.category === 'Pujari/Priest' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Ceremony details</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Ceremony Type</label>
                            <div className="flex flex-wrap gap-2">
                              {PRIEST_CEREMONY_TYPES.map((c) => (
                                <button type="button" key={c} onClick={() => updatePackagePriest(p.id, 'ceremonyType', c)} className={catChip(p.priest?.ceremonyType === c)}>{c}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Language</label>
                            <div className="flex flex-wrap gap-2">
                              {PRIEST_LANGUAGES.map((l) => (
                                <button type="button" key={l} onClick={() => togglePriestLanguage(p.id, l)} className={catChip((p.priest?.languages || []).includes(l))}>{l}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Community</label>
                              <input type="text" value={p.priest?.community ?? ''} onChange={(e) => updatePackagePriest(p.id, 'community', e.target.value)}
                                placeholder="e.g. Iyer / Iyengar / North Indian" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">No. of priests</label>
                              <input type="number" min={0} value={p.priest?.numPriests ?? ''} onChange={(e) => updatePackagePriest(p.id, 'numPriests', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 2" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {([['samagriIncluded', 'Pooja items (samagri) included'], ['muhurthamConsult', 'Muhurtham consultation']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackagePriest(p.id, field, true)} className={catChip((p.priest as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackagePriest(p.id, field, false)} className={catChip((p.priest as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Invitation: structured design spec (replaces generic price tiers). */}
                      {myVendor?.category === 'Invitation' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Invitation details</p>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tier</label>
                              <div className="flex flex-wrap gap-2">
                                {INVITATION_TIERS.map((t) => (
                                  <button type="button" key={t} onClick={() => updatePackageInvitation(p.id, 'tier', t)} className={catChip(p.invitation?.tier === t)}>{t}</button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Design</label>
                              <div className="flex flex-wrap gap-2">
                                {INVITATION_DESIGNS.map((d) => (
                                  <button type="button" key={d} onClick={() => updatePackageInvitation(p.id, 'design', d)} className={catChip(p.invitation?.design === d)}>{d}</button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Type</label>
                            <div className="flex flex-wrap gap-2">
                              {INVITATION_TYPES.map((t) => (
                                <button type="button" key={t} onClick={() => updatePackageInvitation(p.id, 'type', t)} className={catChip(p.invitation?.type === t)}>{t}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Add-ons</label>
                            <div className="flex flex-wrap gap-2">
                              {INVITATION_ADDONS.map((a) => (
                                <button type="button" key={a} onClick={() => toggleInvitationArray(p.id, 'addOns', a)} className={catChip((p.invitation?.addOns || []).includes(a))}>{a}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Languages</label>
                            <div className="flex flex-wrap gap-2">
                              {INVITATION_LANGUAGES.map((l) => (
                                <button type="button" key={l} onClick={() => toggleInvitationArray(p.id, 'languages', l)} className={catChip((p.invitation?.languages || []).includes(l))}>{l}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Quantity (printed)</label>
                              <input type="number" min={0} value={p.invitation?.quantity ?? ''} onChange={(e) => updatePackageInvitation(p.id, 'quantity', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 250" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Design revisions</label>
                              <input type="number" min={0} value={p.invitation?.revisions ?? ''} onChange={(e) => updatePackageInvitation(p.id, 'revisions', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 3" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Delivery time</label>
                              <input type="text" value={p.invitation?.deliveryTime ?? ''} onChange={(e) => updatePackageInvitation(p.id, 'deliveryTime', e.target.value)}
                                placeholder="e.g. 3 days" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Printing: structured product spec (replaces capacity + generic price tiers). */}
                      {myVendor?.category === 'Printing' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Printing details</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Product</label>
                            <div className="flex flex-wrap gap-2">
                              {PRINTING_PRODUCTS.map((pr) => (
                                <button type="button" key={pr} onClick={() => updatePackagePrinting(p.id, 'product', pr)} className={catChip(p.printing?.product === pr)}>{pr}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Material / Finish</label>
                            <div className="flex flex-wrap gap-2">
                              {PRINTING_FINISHES.map((f) => (
                                <button type="button" key={f} onClick={() => togglePrintingFinish(p.id, f)} className={catChip((p.printing?.finishes || []).includes(f))}>{f}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Size</label>
                              <input type="text" value={p.printing?.size ?? ''} onChange={(e) => updatePackagePrinting(p.id, 'size', e.target.value)}
                                placeholder="e.g. 6x4 ft" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Quantity</label>
                              <input type="number" min={0} value={p.printing?.quantity ?? ''} onChange={(e) => updatePackagePrinting(p.id, 'quantity', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 100" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Delivery time</label>
                              <input type="text" value={p.printing?.deliveryTime ?? ''} onChange={(e) => updatePackagePrinting(p.id, 'deliveryTime', e.target.value)}
                                placeholder="e.g. 2 days" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Design included</label>
                            <div className="flex gap-1.5">
                              <button type="button" onClick={() => updatePackagePrinting(p.id, 'designIncluded', true)} className={catChip(p.printing?.designIncluded === true)}>Yes</button>
                              <button type="button" onClick={() => updatePackagePrinting(p.id, 'designIncluded', false)} className={catChip(p.printing?.designIncluded === false)}>No</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Return Gifts: structured spec (replaces capacity + generic price tiers). */}
                      {myVendor?.category === 'Return Gifts' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Return gift details</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tier (per-piece budget)</label>
                            <div className="flex flex-wrap gap-2">
                              {RETURN_GIFTS_TIERS.map((t) => (
                                <button type="button" key={t} onClick={() => updatePackageReturnGifts(p.id, 'tier', t)} className={catChip(p.returnGifts?.tier === t)}>{t}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Gift Type</label>
                            <div className="flex flex-wrap gap-2">
                              {RETURN_GIFT_TYPES.map((g) => (
                                <button type="button" key={g} onClick={() => updatePackageReturnGifts(p.id, 'giftType', g)} className={catChip(p.returnGifts?.giftType === g)}>{g}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Count of gifts</label>
                              <input type="number" min={0} value={p.returnGifts?.countOfGifts ?? ''} onChange={(e) => updatePackageReturnGifts(p.id, 'countOfGifts', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 1 set" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Minimum quantity</label>
                              <input type="number" min={0} value={p.returnGifts?.minQuantity ?? ''} onChange={(e) => updatePackageReturnGifts(p.id, 'minQuantity', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 50" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Packing time (days)</label>
                              <input type="number" min={0} value={p.returnGifts?.packingTimeDays ?? ''} onChange={(e) => updatePackageReturnGifts(p.id, 'packingTimeDays', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 3" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Packaging type</label>
                              <input type="text" value={p.returnGifts?.packagingType ?? ''} onChange={(e) => updatePackageReturnGifts(p.id, 'packagingType', e.target.value)}
                                placeholder="e.g. Gift box" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] text-slate-500 mb-1">Bulk quantity discount</label>
                              <input type="text" value={p.returnGifts?.bulkDiscount ?? ''} onChange={(e) => updatePackageReturnGifts(p.id, 'bulkDiscount', e.target.value)}
                                placeholder="e.g. 10% off above 200" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Customization (name / date print)</label>
                            <div className="flex gap-1.5">
                              <button type="button" onClick={() => updatePackageReturnGifts(p.id, 'customization', true)} className={catChip(p.returnGifts?.customization === true)}>Yes</button>
                              <button type="button" onClick={() => updatePackageReturnGifts(p.id, 'customization', false)} className={catChip(p.returnGifts?.customization === false)}>No</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Entertainment: structured act spec (replaces generic price tiers). */}
                      {myVendor?.category === 'Entertainment' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Act details</p>
                          <p className="text-[10px] text-slate-500">Number of performers is the "Number of performers" field above; duration is the "Duration (hours)" field.</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Act Type</label>
                            <div className="flex flex-wrap gap-2">
                              {ENTERTAINMENT_ACT_TYPES.map((a) => (
                                <button type="button" key={a} onClick={() => updatePackageEntertainment(p.id, 'actType', a)} className={catChip(p.entertainment?.actType === a)}>{a}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {([['equipmentIncluded', 'Equipment included'], ['travelIncluded', 'Travel included']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageEntertainment(p.id, field, true)} className={catChip((p.entertainment as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageEntertainment(p.id, field, false)} className={catChip((p.entertainment as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Music/DJ: structured spec (replaces capacity + generic price tiers). */}
                      {myVendor?.category === 'Music/DJ' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Music / DJ details</p>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tier</label>
                              <div className="flex flex-wrap gap-2">
                                {MUSIC_DJ_TIERS.map((t) => (
                                  <button type="button" key={t} onClick={() => updatePackageMusicDj(p.id, 'tier', t)} className={catChip(p.musicDj?.tier === t)}>{t}</button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Indoor / Outdoor</label>
                              <div className="flex flex-wrap gap-2">
                                {MUSIC_DJ_VENUE_TYPES.map((v) => (
                                  <button type="button" key={v} onClick={() => updatePackageMusicDj(p.id, 'venueType', v)} className={catChip(p.musicDj?.venueType === v)}>{v}</button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Type</label>
                            <div className="flex flex-wrap gap-2">
                              {MUSIC_DJ_TYPES.map((t) => (
                                <button type="button" key={t} onClick={() => updatePackageMusicDj(p.id, 'type', t)} className={catChip(p.musicDj?.type === t)}>{t}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Number of hours</label>
                              <input type="number" min={0} value={p.musicDj?.hours ?? ''} onChange={(e) => updatePackageMusicDj(p.id, 'hours', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 4" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Number of artists</label>
                              <input type="number" min={0} value={p.musicDj?.numArtists ?? ''} onChange={(e) => updatePackageMusicDj(p.id, 'numArtists', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 3" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {([['soundSystem', 'Sound system + speakers'], ['lighting', 'Lighting included'], ['mcHost', 'MC / host'], ['generator', 'Generator']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageMusicDj(p.id, field, true)} className={catChip((p.musicDj as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageMusicDj(p.id, field, false)} className={catChip((p.musicDj as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lighting: structured spec (replaces capacity + generic price tiers). */}
                      {myVendor?.category === 'Lighting' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Lighting details</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tier</label>
                            <div className="flex flex-wrap gap-2">
                              {LIGHTING_TIERS.map((t) => (
                                <button type="button" key={t} onClick={() => updatePackageLighting(p.id, 'tier', t)} className={catChip(p.lighting?.tier === t)}>{t}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Lighting Type</label>
                            <div className="flex flex-wrap gap-2">
                              {LIGHTING_TYPES.map((l) => (
                                <button type="button" key={l} onClick={() => toggleLightingType(p.id, l)} className={catChip((p.lighting?.lightingTypes || []).includes(l))}>{l}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Area covered</label>
                              <input type="text" value={p.lighting?.areaCovered ?? ''} onChange={(e) => updatePackageLighting(p.id, 'areaCovered', e.target.value)}
                                placeholder="e.g. Stage + entrance" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Number of fixtures</label>
                              <input type="number" min={0} value={p.lighting?.numFixtures ?? ''} onChange={(e) => updatePackageLighting(p.id, 'numFixtures', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 20" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Number of functions</label>
                              <input type="number" min={0} value={p.lighting?.numFunctions ?? ''} onChange={(e) => updatePackageLighting(p.id, 'numFunctions', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 2" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {([['powerBackup', 'Power backup'], ['setupTeardown', 'Setup + teardown included']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageLighting(p.id, field, true)} className={catChip((p.lighting as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageLighting(p.id, field, false)} className={catChip((p.lighting as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Flowers: structured spec (replaces capacity/duration + generic price tiers). */}
                      {myVendor?.category === 'Flowers' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Flower details</p>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Variety / Tier</label>
                              <div className="flex flex-wrap gap-2">
                                {FLOWERS_VARIETIES.map((v) => (
                                  <button type="button" key={v} onClick={() => updatePackageFlowers(p.id, 'variety', v)} className={catChip(p.flowers?.variety === v)}>{v}</button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Flowers</label>
                              <div className="flex flex-wrap gap-2">
                                {FLOWERS_KINDS.map((k) => (
                                  <button type="button" key={k} onClick={() => updatePackageFlowers(p.id, 'flowerKind', k)} className={catChip(p.flowers?.flowerKind === k)}>{k}</button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Items</label>
                            <div className="flex flex-wrap gap-2">
                              {FLOWERS_ITEMS.map((it) => (
                                <button type="button" key={it} onClick={() => toggleFlowersItem(p.id, it)} className={catChip((p.flowers?.items || []).includes(it))}>{it}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Quantity</label>
                              <input type="number" min={0} value={p.flowers?.quantity ?? ''} onChange={(e) => updatePackageFlowers(p.id, 'quantity', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 10" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Delivery timing</label>
                              <input type="text" value={p.flowers?.deliveryTiming ?? ''} onChange={(e) => updatePackageFlowers(p.id, 'deliveryTiming', e.target.value)}
                                placeholder="e.g. Morning 6 AM" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Which function</label>
                              <input type="text" value={p.flowers?.whichFunction ?? ''} onChange={(e) => updatePackageFlowers(p.id, 'whichFunction', e.target.value)}
                                placeholder="e.g. Muhurtham" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mehendi: structured spec (replaces duration + generic price tiers). */}
                      {myVendor?.category === 'Mehendi' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Mehendi details</p>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tier</label>
                              <div className="flex flex-wrap gap-2">
                                {MEHENDI_TIERS.map((t) => (
                                  <button type="button" key={t} onClick={() => updatePackageMehendi(p.id, 'tier', t)} className={catChip(p.mehendi?.tier === t)}>{t}</button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Design intricacy</label>
                              <div className="flex flex-wrap gap-2">
                                {MEHENDI_INTRICACY.map((i) => (
                                  <button type="button" key={i} onClick={() => updatePackageMehendi(p.id, 'intricacy', i)} className={catChip(p.mehendi?.intricacy === i)}>{i}</button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Type</label>
                            <div className="flex flex-wrap gap-2">
                              {MEHENDI_TYPES.map((t) => (
                                <button type="button" key={t} onClick={() => updatePackageMehendi(p.id, 'type', t)} className={catChip(p.mehendi?.type === t)}>{t}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Artists (guest stalls)</label>
                              <input type="number" min={0} value={p.mehendi?.numArtists ?? ''} onChange={(e) => updatePackageMehendi(p.id, 'numArtists', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 2" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Per-hand price (guests) ₹</label>
                              <input type="number" min={0} value={p.mehendi?.perHandPrice ?? ''} onChange={(e) => updatePackageMehendi(p.id, 'perHandPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 200" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Duration (hrs)</label>
                              <input type="number" min={0} value={p.mehendi?.durationHours ?? ''} onChange={(e) => updatePackageMehendi(p.id, 'durationHours', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 4" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {([['organicHenna', 'Organic henna'], ['travelIncluded', 'Travel included']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageMehendi(p.id, field, true)} className={catChip((p.mehendi as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageMehendi(p.id, field, false)} className={catChip((p.mehendi as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Event Host/Anchor: structured spec (replaces capacity + generic price tiers). */}
                      {myVendor?.category === 'Event Host/Anchor' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Host / Anchor details</p>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Event Type</label>
                              <div className="flex flex-wrap gap-2">
                                {EVENT_HOST_EVENT_TYPES.map((t) => (
                                  <button type="button" key={t} onClick={() => updatePackageEventHost(p.id, 'eventType', t)} className={catChip(p.eventHost?.eventType === t)}>{t}</button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Solo or co-host</label>
                              <div className="flex flex-wrap gap-2">
                                {EVENT_HOST_MODES.map((m) => (
                                  <button type="button" key={m} onClick={() => updatePackageEventHost(p.id, 'hostMode', m)} className={catChip(p.eventHost?.hostMode === m)}>{m}</button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Language(s)</label>
                            <div className="flex flex-wrap gap-2">
                              {EVENT_HOST_LANGUAGES.map((l) => (
                                <button type="button" key={l} onClick={() => toggleEventHostLanguage(p.id, l)} className={catChip((p.eventHost?.languages || []).includes(l))}>{l}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Number of hours</label>
                              <input type="number" min={0} value={p.eventHost?.hours ?? ''} onChange={(e) => updatePackageEventHost(p.id, 'hours', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 6" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Number of events</label>
                              <input type="number" min={0} value={p.eventHost?.numEvents ?? ''} onChange={(e) => updatePackageEventHost(p.id, 'numEvents', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 1" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {([['gamesScripting', 'Games / scripting included'], ['travelIncluded', 'Travel included']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageEventHost(p.id, field, true)} className={catChip((p.eventHost as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageEventHost(p.id, field, false)} className={catChip((p.eventHost as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rental Equipment: structured spec (replaces capacity + generic price tiers). */}
                      {myVendor?.category === 'Rental Equipment' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Rental details</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Items</label>
                            <div className="flex flex-wrap gap-2">
                              {RENTAL_ITEMS.map((it) => (
                                <button type="button" key={it} onClick={() => toggleRentalItem(p.id, it)} className={catChip((p.rental?.items || []).includes(it))}>{it}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Quantity</label>
                              <input type="number" min={0} value={p.rental?.quantity ?? ''} onChange={(e) => updatePackageRental(p.id, 'quantity', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 100" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Security deposit (₹)</label>
                              <input type="number" min={0} value={p.rental?.securityDeposit ?? ''} onChange={(e) => updatePackageRental(p.id, 'securityDeposit', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 5000" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {([['setupTeardown', 'Setup + teardown included'], ['delivery', 'Delivery']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageRental(p.id, field, true)} className={catChip((p.rental as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageRental(p.id, field, false)} className={catChip((p.rental as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Utensils for Rent: structured spec (replaces capacity + generic price tiers). */}
                      {myVendor?.category === 'Utensils for Rent' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Utensils details</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Material / Tier</label>
                            <div className="flex flex-wrap gap-2">
                              {UTENSILS_MATERIALS.map((m) => (
                                <button type="button" key={m} onClick={() => updatePackageUtensils(p.id, 'material', m)} className={catChip(p.utensils?.material === m)}>{m}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Vessel Type</label>
                            <div className="flex flex-wrap gap-2">
                              {UTENSILS_VESSEL_TYPES.map((v) => (
                                <button type="button" key={v} onClick={() => toggleUtensilsVessel(p.id, v)} className={catChip((p.utensils?.vesselTypes || []).includes(v))}>{v}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Guest count served</label>
                              <input type="number" min={0} value={p.utensils?.guestCount ?? ''} onChange={(e) => updatePackageUtensils(p.id, 'guestCount', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 100" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Security deposit (₹)</label>
                              <input type="number" min={0} value={p.utensils?.securityDeposit ?? ''} onChange={(e) => updatePackageUtensils(p.id, 'securityDeposit', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 3000" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {([['deliveryPickup', 'Delivery + pickup'], ['cleaningIncluded', 'Cleaning included']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageUtensils(p.id, field, true)} className={catChip((p.utensils as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageUtensils(p.id, field, false)} className={catChip((p.utensils as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Wedding Planner: structured spec (replaces capacity/duration + generic price tiers). */}
                      {myVendor?.category === 'Wedding Planner' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Planning details</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Scope / Tier</label>
                            <div className="flex flex-wrap gap-2">
                              {WEDDING_PLANNER_SCOPES.map((s) => (
                                <button type="button" key={s} onClick={() => updatePackageWeddingPlanner(p.id, 'scope', s)} className={catChip(p.weddingPlanner?.scope === s)}>{s}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {([['numFunctions', 'No. of functions'], ['teamSize', 'On-ground team size'], ['planningMeetings', 'Planning meetings']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
                                <input type="number" min={0} value={(p.weddingPlanner as any)?.[field] ?? ''} onChange={(e) => updatePackageWeddingPlanner(p.id, field, e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="0" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {([['vendorCoordination', 'Vendor coordination'], ['budgetManagement', 'Budget management'], ['guestManagement', 'Guest management / hospitality']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageWeddingPlanner(p.id, field, true)} className={catChip((p.weddingPlanner as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageWeddingPlanner(p.id, field, false)} className={catChip((p.weddingPlanner as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Corporate Event Services: structured spec (replaces capacity/duration + generic price tiers). */}
                      {myVendor?.category === 'Corporate Event Services' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Event details</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Event type</label>
                            <div className="flex flex-wrap gap-2">
                              {CORPORATE_EVENT_TYPES.map((s) => (
                                <button type="button" key={s} onClick={() => updatePackageCorporate(p.id, 'eventType', s)} className={catChip(p.corporate?.eventType === s)}>{s}</button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {([['numAttendees', 'No. of attendees'], ['numDays', 'No. of days']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
                                <input type="number" min={0} value={(p.corporate as any)?.[field] ?? ''} onChange={(e) => updatePackageCorporate(p.id, field, e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="0" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {([['avStageBranding', 'AV + stage + branding'], ['registrationDesk', 'Registration desk'], ['cateringCoordination', 'Catering coordination'], ['mcHost', 'MC / host']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageCorporate(p.id, field, true)} className={catChip((p.corporate as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageCorporate(p.id, field, false)} className={catChip((p.corporate as any)?.[field] === false)}>No</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Price tiers — categories with no structured spec above. */}
                      {myVendor?.category !== 'Catering' && myVendor?.category !== 'Venue' && myVendor?.category !== 'Decoration' && myVendor?.category !== 'Makeup & Beauty' && myVendor?.category !== 'Media' && myVendor?.category !== 'Transport' && myVendor?.category !== 'Pujari/Priest' && myVendor?.category !== 'Invitation' && myVendor?.category !== 'Printing' && myVendor?.category !== 'Return Gifts' && myVendor?.category !== 'Entertainment' && myVendor?.category !== 'Music/DJ' && myVendor?.category !== 'Lighting' && myVendor?.category !== 'Flowers' && myVendor?.category !== 'Mehendi' && myVendor?.category !== 'Event Host/Anchor' && myVendor?.category !== 'Rental Equipment' && myVendor?.category !== 'Utensils for Rent' && myVendor?.category !== 'Wedding Planner' && myVendor?.category !== 'Corporate Event Services' && (
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5">
                          Price tiers (optional — e.g. Normal / HD / Premium)
                        </label>
                        <div className="space-y-2">
                          {(p.tiers || []).map((t, ti) => (
                            <div key={ti} className="flex items-center gap-2">
                              <input
                                value={t.name}
                                onChange={(e) => updatePackageTier(p.id, ti, 'name', e.target.value)}
                                placeholder={myVendor?.category === 'Catering' ? 'Serving size — e.g. For 2 Persons' : 'Tier name — e.g. Premium'}
                                className="flex-1 p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                              />
                              <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                <span className="text-slate-500 text-xs">₹</span>
                                <input
                                  type="number"
                                  value={t.price || ''}
                                  onChange={(e) => updatePackageTier(p.id, ti, 'price', e.target.value)}
                                  placeholder={myVendor?.category === 'Catering' ? '400' : '15000'}
                                  className="w-24 py-2 bg-transparent text-white text-sm focus:outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removePackageTier(p.id, ti)}
                                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center shrink-0"
                                aria-label="Remove tier"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addPackageTier(p.id)}
                            className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add tier
                          </button>
                        </div>
                      </div>
                      )}

                      {myVendor?.category !== 'Catering' && (
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5">Hall / Function Photos</label>
                          
                          {p.images && p.images.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              {p.images.map((url) => (
                                <div key={url} className="relative group rounded-lg overflow-hidden border border-slate-800 h-20 bg-slate-950">
                                  <img src={url} alt="Package asset" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => removePackageImage(p.id, url)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-950/80 hover:bg-rose-600 hover:text-white text-slate-400 flex items-center justify-center transition-colors"
                                    title="Remove photo"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-bold cursor-pointer transition-colors">
                            {uploadingPkgId === p.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Uploading…</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Upload Photo</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePackagePhotoUpload(p.id, file);
                                e.target.value = '';
                              }}
                              className="hidden"
                              disabled={uploadingPkgId === p.id}
                            />
                          </label>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <button
                type="button"
                onClick={addPackage}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
              >
                <Plus className="w-4 h-4" /> {myVendor?.category === 'Venue' ? 'Add hall' : 'Add package'}
              </button>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSavePackages}
                disabled={savingPackages}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md hover:brightness-110 disabled:opacity-60 flex items-center gap-2"
              >
                {savingPackages && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {myVendor?.category === 'Venue' ? 'Save Halls' : 'Save Packages'}
              </button>
              {packagesNotice && <p className="text-xs text-emerald-400 font-semibold">{packagesNotice}</p>}
            </div>
          </div>
        )}

        {/* Availability Tab */}
        {activeTab === 'availability' && (
          <div className="max-w-2xl space-y-5">
          {/* Calendar sync — subscribe bookings into Google/Apple/Outlook. */}
          <div className="glass-card p-6 rounded-3xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
            <div className="flex items-start gap-3">
              <ClockIcon className="w-6 h-6 text-indigo-400 shrink-0" />
              <div>
                <h3 className="font-bold text-white">Sync bookings to your calendar</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Add this private link to Google Calendar (<span className="text-slate-300">Other calendars → From URL</span>), Apple Calendar, or Outlook. Every confirmed booking shows up automatically.
                </p>
              </div>
            </div>
            {calendarUrl ? (
              <div className="flex items-center gap-2">
                <input readOnly value={calendarUrl} onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 min-w-0 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-mono" />
                <button
                  onClick={() => { navigator.clipboard?.writeText(calendarUrl); setCalendarCopied(true); setTimeout(() => setCalendarCopied(false), 2000); }}
                  className="px-3 py-2.5 rounded-lg bg-indigo-500 text-white font-bold text-[11px] shrink-0">
                  {calendarCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">Preparing your calendar link…</p>
            )}
            <p className="text-[10px] text-slate-500">Keep this link private — anyone with it can see your booking dates.</p>
          </div>

          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5">
            <div>
              <h3 className="font-bold text-xl text-white">Availability Calendar</h3>
              <p className="text-xs text-slate-400 mt-1">Add the dates you're open to book. Customers can only request these dates. Confirmed booking dates are blocked automatically.</p>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Add an available date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch { /* not supported */ } }}
                    className="date-input-amber w-full p-3 pr-12 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                  />
                  <CalendarDays className="w-5 h-5 text-amber-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <button
                type="button"
                onClick={addDate}
                className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-700"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {availableDates.length === 0 ? (
              <p className="text-xs text-slate-500">No open dates yet — add some above.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500">For each open date, choose which time slots you offer. Tap a slot to include/exclude it.</p>
                {availableDates.map((d) => {
                  const offered = offeredSlotIds({ availableSlots }, d);
                  return (
                    <div key={d} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-bold text-emerald-200">
                          {new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <button type="button" onClick={() => removeDate(d)} aria-label={`Remove ${d}`} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-800">×</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABILITY_SLOTS.map((s) => {
                          const on = offered.includes(s.id);
                          return (
                            <button key={s.id} type="button" onClick={() => toggleDateSlot(d, s.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border text-left transition-colors ${on ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                              <span className="block">{s.label}</span>
                              <span className={`block text-[10px] font-normal ${on ? 'text-emerald-900' : 'text-slate-500'}`}>{s.time}</span>
                            </button>
                          );
                        })}
                      </div>
                      {offered.length === 0 && <p className="text-[10px] text-amber-400 mt-1.5">No slots selected — customers can't book this date. Pick at least one.</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {availabilityNotice && <p className="text-xs text-emerald-400 font-semibold">{availabilityNotice}</p>}

            <button
              onClick={handleSaveAvailability}
              disabled={savingAvailability}
              className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {savingAvailability && <Loader2 className="w-4 h-4 animate-spin" />} Save Availability
            </button>

            {/* Booked dates — dates a customer has already booked, with what
                they booked. These are no longer open for other customers. */}
            {(() => {
              const booked = bookings
                .filter((b) => b.eventDate && ['pending_payment', 'confirmed', 'in_progress', 'completed'].includes(b.status))
                .slice()
                .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
              if (booked.length === 0) return null;
              return (
                <div className="pt-5 mt-2 border-t border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-rose-300 uppercase">Booked dates</p>
                  <p className="text-[11px] text-slate-500">A customer has booked these dates — they're no longer open for others.</p>
                  {booked.map((b) => (
                    <div key={b.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">
                            {new Date(b.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {b.timeSlot && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">{slotLabelWithTime(b.timeSlot)}</span>}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">{STATUS_LABEL[b.status] || b.status}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {b.bookingNumber} · <span className="text-slate-200">{b.packageName || 'Custom request'}</span>
                        </p>
                        {b.selectedOptions && b.selectedOptions.length > 0 && (
                          <p className="text-[11px] text-slate-400 mt-0.5">Booked for: {b.selectedOptions.join(', ')}</p>
                        )}
                      </div>
                      <span className="text-emerald-400 font-semibold text-sm shrink-0">₹{(b.agreedPrice || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'offers' && myVendor?.category !== 'Security' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
              <div>
                <h3 className="font-bold text-xl text-white">Publish an Offer</h3>
                <p className="text-xs text-slate-400 mt-1">Deals show on your listing and are auto-applied to the customer's price — the biggest applicable one wins.</p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Offer Title *</label>
                <input type="text" value={dealForm.title} maxLength={60} placeholder="e.g. Monsoon Special"
                  onChange={(e) => setDealForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description (optional)</label>
                <input type="text" value={dealForm.description} maxLength={140} placeholder="What's included / any conditions"
                  onChange={(e) => setDealForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Discount Type</label>
                  <select value={dealForm.discountType}
                    onChange={(e) => setDealForm((f) => ({ ...f, discountType: e.target.value as 'percent' | 'flat' }))}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold">
                    <option value="percent">Percentage off (%)</option>
                    <option value="flat">Flat amount off (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{dealForm.discountType === 'percent' ? 'Percent (%)' : 'Amount (₹)'} *</label>
                  <input type="number" value={dealForm.discountValue}
                    onChange={(e) => setDealForm((f) => ({ ...f, discountValue: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Min order (₹, optional)</label>
                  <input type="number" value={dealForm.minOrderAmount} placeholder="No minimum"
                    onChange={(e) => setDealForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Valid until (optional)</label>
                  <div className="relative">
                    <input type="date" value={dealForm.expiresAt}
                      onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch { /* not supported */ } }}
                      onChange={(e) => setDealForm((f) => ({ ...f, expiresAt: e.target.value }))}
                      className="date-input-amber w-full p-3 pr-12 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
                    <CalendarDays className="w-5 h-5 text-amber-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {dealNotice && <p className="text-xs text-amber-400 font-semibold">{dealNotice}</p>}

              <button onClick={handleAddDeal} disabled={dealSaving}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-lg disabled:opacity-50 inline-flex items-center gap-2">
                {dealSaving && <Loader2 className="w-4 h-4 animate-spin" />} <Plus className="w-4 h-4" /> Publish Offer
              </button>
            </div>

            {deals.length > 0 && (
              <div className="space-y-3">
                {deals.map((d) => {
                  const live = isDealLive(d);
                  return (
                    <div key={d.id} className="glass-card p-5 rounded-2xl border border-slate-800 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{d.title}</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                            {d.discountType === 'percent' ? `${d.discountValue}% OFF` : `₹${d.discountValue.toLocaleString('en-IN')} OFF`}
                          </span>
                          {!live && <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 text-[10px] font-bold">{d.isActive ? 'Scheduled/Expired' : 'Paused'}</span>}
                          {live && <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">Live</span>}
                        </div>
                        {d.description && <p className="text-xs text-slate-400 mt-1">{d.description}</p>}
                        <p className="text-[10px] text-slate-500 mt-1">
                          {d.minOrderAmount ? `Min order ₹${d.minOrderAmount.toLocaleString('en-IN')} · ` : ''}
                          {d.expiresAt ? `Valid until ${new Date(d.expiresAt).toLocaleDateString()}` : 'No expiry'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button onClick={() => handleToggleDeal(d.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px]">
                          {d.isActive ? 'Pause' : 'Resume'}
                        </button>
                        <button onClick={() => handleDeleteDeal(d.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold text-[11px]">
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-5">
          {/* Business verification — earn the Verified badge */}
          {(() => {
            const vs = myVendor.verification?.status || (myVendor.isVerified ? 'verified' : 'unverified');
            if (vs === 'verified') {
              return (
                <div className="glass-card p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-white">Verified Business</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Your listing carries the Verified badge — it builds trust and ranks higher with customers.</p>
                  </div>
                </div>
              );
            }
            if (vs === 'pending') {
              return (
                <div className="glass-card p-6 rounded-3xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
                  <ClockIcon className="w-8 h-8 text-amber-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-white">Verification under review</h3>
                    <p className="text-xs text-slate-400 mt-0.5">We're reviewing the documents you submitted. This usually takes 1–2 business days.</p>
                  </div>
                </div>
              );
            }
            return (
              <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-7 h-7 text-indigo-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg text-white">Get Verified</h3>
                    <p className="text-xs text-slate-400 mt-1">Submit your business details and proof documents to earn the Verified badge customers look for.</p>
                  </div>
                </div>

                {vs === 'rejected' && myVendor.verification?.rejectionReason && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                    <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-rose-300">Previous request declined: {myVendor.verification.rejectionReason}. Please correct and resubmit.</p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Legal Business Name *</label>
                    <input type="text" value={verifyForm.legalName} onChange={(e) => setVerifyForm((f) => ({ ...f, legalName: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Registration Number *</label>
                    <input type="text" value={verifyForm.registrationNumber} onChange={(e) => setVerifyForm((f) => ({ ...f, registrationNumber: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">GSTIN (optional)</label>
                    <input type="text" value={verifyForm.gstNumber} onChange={(e) => setVerifyForm((f) => ({ ...f, gstNumber: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Contact Person (optional)</label>
                    <input type="text" value={verifyForm.contactPerson} onChange={(e) => setVerifyForm((f) => ({ ...f, contactPerson: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Proof Documents * (registration / GST certificate / owner ID)</label>
                  {verifyDocs.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {verifyDocs.map((url, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300">
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <a href={url} target="_blank" rel="noreferrer" className="hover:text-white underline">Document {i + 1}</a>
                          <button onClick={() => setVerifyDocs((prev) => prev.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-300 ml-1">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs">
                    <Upload className="w-3.5 h-3.5" /> {verifyUploading ? 'Uploading…' : 'Upload document'}
                    <input type="file" accept="image/*,application/pdf" onChange={handleVerifyDocUpload} className="hidden" disabled={verifyUploading} />
                  </label>
                </div>

                {verifyNotice && <p className="text-xs text-amber-400 font-semibold">{verifyNotice}</p>}

                <button onClick={handleSubmitVerification} disabled={verifySaving}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold text-xs shadow-lg disabled:opacity-50">
                  {verifySaving ? 'Submitting…' : 'Submit for verification'}
                </button>
              </div>
            );
          })()}

          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-xl text-white">Vendor Profile Settings</h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Business Name</label>
              <input
                type="text"
                name="businessName"
                autoComplete="organization"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                >
                  {VENDOR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">City / Locality</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                >
                  {STATIC_CITY_GROUPS.map(([state, cities]) => (
                    <optgroup key={state} label={state} className="bg-slate-900">
                      {cities.map((c) => (
                        <option key={`${state}-${c}`} value={c} className="bg-slate-900">{c}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Starting Price (₹)</label>
                <input
                  type="number"
                  value={startingPrice === 0 ? '' : startingPrice}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^0+(?=\d)/, '');
                    e.target.value = raw;
                    setStartingPrice(raw === '' ? 0 : Number(raw));
                  }}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Advance Required (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={advancePercentage === 0 ? '' : advancePercentage}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^0+(?=\d)/, '');
                    e.target.value = raw;
                    const n = raw === '' ? 0 : Math.min(100, Math.max(0, Number(raw)));
                    setAdvancePercentage(n);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">What customers pay upfront to confirm a booking with you.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Advance Amount (₹) — optional override</label>
                <input
                  type="number"
                  min={0}
                  value={advanceAmount === 0 ? '' : advanceAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^0+(?=\d)/, '');
                    e.target.value = raw;
                    setAdvanceAmount(raw === '' ? 0 : Number(raw));
                  }}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">If set, customers see this fixed amount instead of the % above.</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Call / Contact Number</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 90000 00000"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">Shown to customers so they can call you directly.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourbusiness@upi"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">Customers see this when paying your advance.</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Payment QR Code</label>
                <div className="flex items-center gap-3">
                  {qrCodeImage && (
                    <img src={qrCodeImage} alt="UPI QR code" className="w-12 h-12 rounded-lg object-cover border border-slate-800" />
                  )}
                  <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-bold cursor-pointer transition-colors">
                    {uploadingQr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {qrCodeImage ? 'Replace' : 'Upload'}
                    <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" disabled={uploadingQr} />
                  </label>
                </div>
                {uploadQrNotice && <p className="text-[10px] text-emerald-400 mt-1">{uploadQrNotice}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Business Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
              />
            </div>

            {profileNotice && <p className="text-xs text-emerald-400 font-semibold">{profileNotice}</p>}

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />} Save Profile Changes
            </button>
          </div>
          </div>
        )}

      </main>
      )}

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        © 2026 Magizhnaazh Vendor Management Portal — Port 3001
      </footer>
    </div>
  );
}