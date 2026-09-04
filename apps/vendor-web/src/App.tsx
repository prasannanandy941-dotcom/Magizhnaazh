import React, { useState, useEffect, useRef } from 'react';
import { Store, Star, Upload, Check, LogOut, Loader2, Plus, SlidersHorizontal, ChevronDown, Receipt, X, Bell, ShieldCheck, Clock as ClockIcon, AlertCircle, FileText, CalendarDays, Sparkles, Car, Mail, Printer, Gift } from 'lucide-react';
import { User, Vendor, Booking, Review, VendorFacilities, VendorPackage, VendorDeal, OfferedOptionItem, CateringFoodItem, CateringCourseItem, VENDOR_CATEGORIES, CATEGORY_OPTIONS, CATERING_OPTION_STYLE, MEDIA_QUALITY_OPTIONS, MEDIA_EQUIPMENT_OPTIONS, mediaExtraField, isDealLive, CATERING_MENU_TIERS, CATERING_FOOD_TYPES, CATERING_CUISINES, CATERING_COURSES, CATERING_LIVE_COUNTERS, CATERING_SERVICE_STYLES, BUFFET_PLATE_TYPES, BANANA_LEAF_TYPES, slotLabelWithTime, AVAILABILITY_SLOTS, offeredSlotIds, VENUE_SESSIONS, VENUE_HALL_TYPES, VENUE_HALL_CLASSES, VENUE_CATERING_POLICIES, VENUE_FEATURES, DECORATION_TIERS, DECORATION_THEMES, DECORATION_AREAS, DECORATION_FLOWER_TYPES, MAKEUP_TYPES, MAKEUP_FINISHES, MEDIA_TIERS, MEDIA_COVERAGE, MEDIA_STYLES, TRANSPORT_TIERS, TRANSPORT_VEHICLE_TYPES, TRANSPORT_PRICING_BASIS, TRANSPORT_USES, PRIEST_CEREMONY_TYPES, PRIEST_LANGUAGES, INVITATION_TIERS, INVITATION_TYPES, INVITATION_DESIGNS, INVITATION_ADDONS, INVITATION_LANGUAGES, PRINTING_PRODUCTS, PRINTING_FINISHES, RETURN_GIFTS_TIERS, RETURN_GIFT_TYPES, ENTERTAINMENT_ACT_TYPES, MUSIC_DJ_TIERS, MUSIC_DJ_TYPES, MUSIC_DJ_VENUE_TYPES, LIGHTING_TIERS, LIGHTING_TYPES, FLOWERS_VARIETIES, FLOWERS_ITEMS, FLOWERS_KINDS, MEHENDI_TIERS, MEHENDI_TYPES, MEHENDI_INTRICACY, EVENT_HOST_EVENT_TYPES, EVENT_HOST_LANGUAGES, EVENT_HOST_MODES, SECURITY_TYPES, SECURITY_GENDERS, RENTAL_ITEMS, UTENSILS_MATERIALS, UTENSILS_VESSEL_TYPES, WEDDING_PLANNER_SCOPES, CORPORATE_EVENT_TYPES, CORPORATE_ADDONS } from '../../../packages/shared-types';
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
        policies: { ...(myVendor.policies || {}), advancePercentage, advanceAmount: advanceAmount || null },
      } as any);
      if (res.data?.vendor) {
        setMyVendor(res.data.vendor);
        setAdvancePercentage(res.data.vendor.policies?.advancePercentage ?? advancePercentage);
        setAdvanceAmount(res.data.vendor.policies?.advanceAmount ?? 0);
        setContactPhone(res.data.vendor.contactPhone || '');
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
              {(() => { const unit = myVendor?.category === 'Security' ? 'person' : 'item'; return items.length > 0 ? `${items.length} ${items.length === 1 ? unit : (unit === 'person' ? 'persons' : 'items')}` : (unit === 'person' ? 'Add persons' : 'Add items'); })()}
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
                No {myVendor?.category === 'Security' ? 'persons' : 'items'} yet — add {opt.toLowerCase()} {myVendor?.category === 'Security' ? 'persons' : 'items'} with a rate. Customers see each one on your listing.
              </p>
            )}
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateOptionItem(opt, i, 'name', e.target.value)}
                  placeholder={`${myVendor?.category === 'Security' ? 'Person name' : 'Item name'} (e.g. ${nameExample})`}
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
              <Plus className="w-3.5 h-3.5" /> {myVendor?.category === 'Security' ? 'Add person' : 'Add item'}
            </button>

            {/* Photos / profile document for this option — shown to customers under it.
                Flowers = photos; Event Host/Anchor = a profile photo OR document (PDF/DOC). */}
            {(myVendor?.category === 'Flowers' || myVendor?.category === 'Event Host/Anchor') && (() => {
              const isHost = myVendor?.category === 'Event Host/Anchor';
              const isImg = (u: string) => /\.(png|jpe?g|gif|svg|webp|bmp|avif)(\?|#|$)/i.test(u);
              return (
              <div className="pt-2 mt-1 border-t border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">{isHost ? 'Profile / Document' : 'Photos'}</span>
                  {(offeredOptionImages[opt] || []).map((url) => (
                    isImg(url) ? (
                      <div key={url} className="relative h-14 w-14 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                        <img src={url} alt="option" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeOptionImage(opt, url)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-slate-950/80 text-slate-300 hover:text-rose-400 flex items-center justify-center" title="Remove">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <div key={url} className="relative flex items-center gap-1.5 h-14 pl-2 pr-6 rounded-lg border border-slate-800 bg-slate-950">
                        <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                        <a href={url} target="_blank" rel="noreferrer" className="text-[10px] text-slate-300 hover:text-white underline max-w-[90px] truncate">View document</a>
                        <button type="button" onClick={() => removeOptionImage(opt, url)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-slate-950/80 text-slate-300 hover:text-rose-400 flex items-center justify-center" title="Remove">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )
                  ))}
                  <label className="cursor-pointer flex items-center gap-1 text-[11px] px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700">
                    {uploadingOptionPhoto === opt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {isHost ? 'Add profile / document' : 'Add photo'}
                    <input
                      type="file"
                      accept={isHost ? '.pdf,.doc,.docx,.ppt,.pptx,image/*' : 'image/*'}
                      className="hidden"
                      disabled={uploadingOptionPhoto === opt}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOptionPhotoUpload(opt, f); e.target.value = ''; }}
                    />
                  </label>
                </div>
              </div>
              );
            })()}
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

  // Catering packages: calculate the sum of all item prices entered by the vendor
  // (food items, cuisines, courses, live counters, welcome drinks, per plate cost).
  const cateringTotal = (c?: any): number => {
    if (!c) return 0;
    let sum = 0;
    if (c.foodTypeItems && typeof c.foodTypeItems === 'object') {
      for (const items of Object.values(c.foodTypeItems)) {
        if (Array.isArray(items)) {
          for (const it of items) {
            if (it && typeof it === 'object') sum += Number(it.price) || 0;
          }
        }
      }
    }
    if (c.cuisineItems && typeof c.cuisineItems === 'object') {
      for (const items of Object.values(c.cuisineItems)) {
        if (Array.isArray(items)) {
          for (const it of items) {
            if (it && typeof it === 'object') sum += Number(it.price) || 0;
          }
        }
      }
    }
    if (c.courseItems && typeof c.courseItems === 'object') {
      for (const items of Object.values(c.courseItems)) {
        if (Array.isArray(items)) {
          for (const it of items) {
            if (it && typeof it === 'object') sum += Number(it.price) || 0;
          }
        }
      }
    }
    if (c.liveCounterItems && typeof c.liveCounterItems === 'object') {
      for (const items of Object.values(c.liveCounterItems)) {
        if (Array.isArray(items)) {
          for (const it of items) {
            if (it && typeof it === 'object') sum += Number(it.price) || 0;
          }
        }
      }
    }
    if (Array.isArray(c.welcomeDrinkItems)) {
      for (const it of c.welcomeDrinkItems) {
        if (it && typeof it === 'object') sum += Number(it.price) || 0;
      }
    }
    return sum;
  };

  // Auto-total for a Venue hall: the chosen hall-type price + hall-class price
  // + every "Yes" feature's price. Mirrors cateringTotal so the Total amount
  // field fills itself from the priced options.
  const venueTotal = (v?: any): number => {
    if (!v) return 0;
    let sum = (Number(v.hallTypePrice) || 0) + (Number(v.hallClassPrice) || 0) + (Number(v.cateringPrice) || 0);
    if (v.featurePrices && typeof v.featurePrices === 'object') {
      for (const val of Object.values(v.featurePrices)) sum += Number(val) || 0;
    }
    return sum;
  };

  // Auto-total for a Decoration package: mandap price + every theme, area and
  // flower price. Mirrors venueTotal so the Total amount fills itself in.
  const decorationTotal = (d?: any): number => {
    if (!d) return 0;
    let sum = Number(d.mandapPrice) || 0;
    for (const map of [d.themePrices, d.areaPrices, d.flowerPrices]) {
      if (map && typeof map === 'object') {
        for (const val of Object.values(map)) sum += Number(val) || 0;
      }
    }
    return sum;
  };

  const updatePackageField = (id: string, field: keyof VendorPackage, raw: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (field === 'price') {
          const val = raw === '' ? 0 : Number(raw);
          if (myVendor?.category === 'Corporate Event Services') {
            const addons = [p.corporate?.avStageBranding, p.corporate?.registrationDesk, p.corporate?.cateringCoordination, p.corporate?.mcHost]
              .reduce((a: number, b: any) => a + (Number(b) || 0), 0);
            const base = Math.max(0, val - addons);
            const corporate = { ...(p.corporate || {}), basePrice: base };
            return { ...p, corporate, price: val };
          }
          if (myVendor?.category === 'Utensils for Rent') {
            const vesselPrices = Object.values(p.utensils?.vesselTypePrices || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
            const delivery = Number(p.utensils?.deliveryPickupPrice) || 0;
            const base = Math.max(0, val - (vesselPrices + delivery));
            const utensils = { ...(p.utensils || {}), basePrice: base };
            return { ...p, utensils, price: val };
          }
          return { ...p, price: val };
        }
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
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const nextCatering = { ...(p.catering || {}), [field]: value };
      const calc = cateringTotal(nextCatering);
      return {
        ...p,
        price: calc > 0 ? calc : (p.price || 0),
        catering: nextCatering,
      };
    }));
  // Toggle membership of a value in one of the catering multi-select arrays.
  const toggleCateringOption = (pkgId: string, field: 'foodTypes' | 'cuisines' | 'liveCounters', item: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = ((p.catering as any)?.[field]) || [];
      const isRemoving = current.includes(item);
      const next = isRemoving ? current.filter((x) => x !== item) : [...current, item];
      let nextFoodTypeItems = p.catering?.foodTypeItems;
      if (field === 'foodTypes' && !isRemoving) {
        const existingForType = nextFoodTypeItems?.[item] || [];
        if (existingForType.length === 0) {
          nextFoodTypeItems = {
            ...(nextFoodTypeItems || {}),
            [item]: [{ name: '', price: 0 }],
          };
        }
      }
      let nextCuisineItems = p.catering?.cuisineItems;
      if (field === 'cuisines' && !isRemoving) {
        const existingForCuisine = nextCuisineItems?.[item] || [];
        if (existingForCuisine.length === 0) {
          nextCuisineItems = {
            ...(nextCuisineItems || {}),
            [item]: [{ name: '', price: 0 }],
          };
        }
      }
      let nextLiveCounterItems = p.catering?.liveCounterItems;
      if (field === 'liveCounters' && !isRemoving) {
        const existingForCounter = nextLiveCounterItems?.[item] || [];
        if (existingForCounter.length === 0) {
          nextLiveCounterItems = {
            ...(nextLiveCounterItems || {}),
            [item]: [{ name: '', price: 0 }],
          };
        }
      }
      const nextCatering = {
        ...(p.catering || {}),
        [field]: next,
        ...(nextFoodTypeItems !== undefined ? { foodTypeItems: nextFoodTypeItems } : {}),
        ...(nextCuisineItems !== undefined ? { cuisineItems: nextCuisineItems } : {}),
        ...(nextLiveCounterItems !== undefined ? { liveCounterItems: nextLiveCounterItems } : {}),
      };
      const calc = cateringTotal(nextCatering);
      return {
        ...p,
        price: calc > 0 ? calc : (p.price || 0),
        catering: nextCatering,
      };
    }));

  const addCateringFoodItem = (pkgId: string, foodType: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const currentItems = currentCatering.foodTypeItems || {};
        const list = currentItems[foodType] || [];
        return {
          ...p,
          catering: {
            ...currentCatering,
            foodTypeItems: {
              ...currentItems,
              [foodType]: [...list, { name: '', price: 0 }],
            },
          },
        };
      })
    );

  const updateCateringFoodItem = (
    pkgId: string,
    foodType: string,
    idx: number,
    field: 'name' | 'price',
    val: any
  ) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const currentItems = currentCatering.foodTypeItems || {};
        const list = currentItems[foodType] || [];
        const nextList = list.map((it, i) =>
          i === idx ? { ...it, [field]: field === 'price' ? (val === '' ? undefined : Number(val)) : val } : it
        );
        const nextCatering = {
          ...currentCatering,
          foodTypeItems: {
            ...currentItems,
            [foodType]: nextList,
          },
        };
        const calc = cateringTotal(nextCatering);
        return {
          ...p,
          price: calc > 0 ? calc : (p.price || 0),
          catering: nextCatering,
        };
      })
    );

  const removeCateringFoodItem = (pkgId: string, foodType: string, idx: number) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const currentItems = currentCatering.foodTypeItems || {};
        const list = currentItems[foodType] || [];
        const nextList = list.filter((_, i) => i !== idx);
        const nextCatering = {
          ...currentCatering,
          foodTypeItems: {
            ...currentItems,
            [foodType]: nextList,
          },
        };
        const calc = cateringTotal(nextCatering);
        return {
          ...p,
          price: calc > 0 ? calc : (p.price || 0),
          catering: nextCatering,
        };
      })
    );

  const addCateringCuisineItem = (pkgId: string, cuisine: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const currentItems = currentCatering.cuisineItems || {};
        const list = currentItems[cuisine] || [];
        return {
          ...p,
          catering: {
            ...currentCatering,
            cuisineItems: {
              ...currentItems,
              [cuisine]: [...list, { name: '', price: 0 }],
            },
          },
        };
      })
    );

  const updateCateringCuisineItem = (
    pkgId: string,
    cuisine: string,
    idx: number,
    field: 'name' | 'price',
    val: any
  ) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const currentItems = currentCatering.cuisineItems || {};
        const list = currentItems[cuisine] || [];
        const nextList = list.map((it, i) =>
          i === idx ? { ...it, [field]: field === 'price' ? (val === '' ? undefined : Number(val)) : val } : it
        );
        const nextCatering = {
          ...currentCatering,
          cuisineItems: {
            ...currentItems,
            [cuisine]: nextList,
          },
        };
        const calc = cateringTotal(nextCatering);
        return {
          ...p,
          price: calc > 0 ? calc : (p.price || 0),
          catering: nextCatering,
        };
      })
    );

  const removeCateringCuisineItem = (pkgId: string, cuisine: string, idx: number) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const currentItems = currentCatering.cuisineItems || {};
        const list = currentItems[cuisine] || [];
        const nextList = list.filter((_, i) => i !== idx);
        const nextCatering = {
          ...currentCatering,
          cuisineItems: {
            ...currentItems,
            [cuisine]: nextList,
          },
        };
        const calc = cateringTotal(nextCatering);
        return {
          ...p,
          price: calc > 0 ? calc : (p.price || 0),
          catering: nextCatering,
        };
      })
    );
  const [uploadingCoursePhoto, setUploadingCoursePhoto] = useState<string | null>(null);
  const handleCateringCoursePhotoUpload = async (pkgId: string, course: string, itemIdx: number, file: File) => {
    if (!token) return;
    const key = `${pkgId}-${course}-${itemIdx}`;
    setUploadingCoursePhoto(key);
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
        updateCateringCourseItem(pkgId, course, itemIdx, 'photo', json.data.fileUrl);
      }
    } catch {
      /* best-effort */
    } finally {
      setUploadingCoursePhoto(null);
    }
  };

  const toggleCateringCourse = (pkgId: string, course: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCourses: string[] = p.catering?.courses || [];
        const isRemoving = currentCourses.includes(course);
        const nextCourses = isRemoving ? currentCourses.filter((x) => x !== course) : [...currentCourses, course];
        let nextCourseItems = p.catering?.courseItems;
        if (!isRemoving) {
          const existing = nextCourseItems?.[course] || [];
          if (existing.length === 0) {
            nextCourseItems = {
              ...(nextCourseItems || {}),
              [course]: [{ name: '', price: 0, photo: '' }],
            };
          }
        }
        return {
          ...p,
          catering: {
            ...(p.catering || {}),
            courses: nextCourses,
            ...(nextCourseItems !== undefined ? { courseItems: nextCourseItems } : {}),
          },
        };
      })
    );

  const addCateringCourseItem = (pkgId: string, course: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const currentItems = currentCatering.courseItems || {};
        const list = currentItems[course] || [];
        return {
          ...p,
          catering: {
            ...currentCatering,
            courseItems: {
              ...currentItems,
              [course]: [...list, { name: '', price: 0, photo: '' }],
            },
          },
        };
      })
    );

  const updateCateringCourseItem = (
    pkgId: string,
    course: string,
    idx: number,
    field: 'name' | 'price' | 'photo',
    val: any
  ) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const currentItems = currentCatering.courseItems || {};
        const list = currentItems[course] || [];
        const nextList = list.map((it, i) =>
          i === idx ? { ...it, [field]: field === 'price' ? (val === '' ? undefined : Number(val)) : val } : it
        );
        const nextCatering = {
          ...currentCatering,
          courseItems: {
            ...currentItems,
            [course]: nextList,
          },
        };
        const calc = cateringTotal(nextCatering);
        return {
          ...p,
          price: calc > 0 ? calc : (p.price || 0),
          catering: nextCatering,
        };
      })
    );

  const removeCateringCourseItem = (pkgId: string, course: string, idx: number) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const currentItems = currentCatering.courseItems || {};
        const list = currentItems[course] || [];
        const nextList = list.filter((_, i) => i !== idx);
        const nextCatering = {
          ...currentCatering,
          courseItems: {
            ...currentItems,
            [course]: nextList,
          },
        };
        const calc = cateringTotal(nextCatering);
        return {
          ...p,
          price: calc > 0 ? calc : (p.price || 0),
          catering: nextCatering,
        };
      })
    );
  const [uploadingLiveCounterPhoto, setUploadingLiveCounterPhoto] = useState<string | null>(null);
  const handleCateringLiveCounterPhotoUpload = async (pkgId: string, counter: string, itemIdx: number, file: File) => {
    if (!token) return;
    const key = `${pkgId}-${counter}-${itemIdx}`;
    setUploadingLiveCounterPhoto(key);
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
        updateCateringLiveCounterItem(pkgId, counter, itemIdx, 'photo', json.data.fileUrl);
      }
    } catch {
      /* best-effort */
    } finally {
      setUploadingLiveCounterPhoto(null);
    }
  };

  const addCateringLiveCounterItem = (pkgId: string, counter: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const currentItems = currentCatering.liveCounterItems || {};
        const list = currentItems[counter] || [];
        return {
          ...p,
          catering: {
            ...currentCatering,
            liveCounterItems: {
              ...currentItems,
              [counter]: [...list, { name: '', price: 0, photo: '' }],
            },
          },
        };
      })
    );

  const updateCateringLiveCounterItem = (
    pkgId: string,
    counter: string,
    idx: number,
    field: 'name' | 'price' | 'photo',
    val: any
  ) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const currentItems = currentCatering.liveCounterItems || {};
        const list = currentItems[counter] || [];
        const nextList = list.map((it, i) =>
          i === idx ? { ...it, [field]: field === 'price' ? (val === '' ? undefined : Number(val)) : val } : it
        );
        const nextCatering = {
          ...currentCatering,
          liveCounterItems: {
            ...currentItems,
            [counter]: nextList,
          },
        };
        const calc = cateringTotal(nextCatering);
        return {
          ...p,
          price: calc > 0 ? calc : (p.price || 0),
          catering: nextCatering,
        };
      })
    );

  const removeCateringLiveCounterItem = (pkgId: string, counter: string, idx: number) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const currentItems = currentCatering.liveCounterItems || {};
        const list = currentItems[counter] || [];
        const nextList = list.filter((_, i) => i !== idx);
        const nextCatering = {
          ...currentCatering,
          liveCounterItems: {
            ...currentItems,
            [counter]: nextList,
          },
        };
        const calc = cateringTotal(nextCatering);
        return {
          ...p,
          price: calc > 0 ? calc : (p.price || 0),
          catering: nextCatering,
        };
      })
    );
  const toggleCateringPlateType = (pkgId: string, pt: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const current = p.catering?.plateTypes || [];
        const next = current.includes(pt) ? current.filter((x) => x !== pt) : [...current, pt];
        return {
          ...p,
          catering: {
            ...(p.catering || {}),
            plateTypes: next,
          },
        };
      })
    );

  const addCateringWelcomeDrink = (pkgId: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const list = currentCatering.welcomeDrinkItems || [];
        return {
          ...p,
          catering: {
            ...currentCatering,
            welcomeDrinkItems: [...list, { name: '', price: 0 }],
          },
        };
      })
    );

  const updateCateringWelcomeDrink = (
    pkgId: string,
    idx: number,
    field: 'name' | 'price',
    val: any
  ) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const list = currentCatering.welcomeDrinkItems || [];
        const nextList = list.map((it, i) =>
          i === idx ? { ...it, [field]: field === 'price' ? (val === '' ? undefined : Number(val)) : val } : it
        );
        const nextCatering = {
          ...currentCatering,
          welcomeDrinkItems: nextList,
        };
        const calc = cateringTotal(nextCatering);
        return {
          ...p,
          price: calc > 0 ? calc : (p.price || 0),
          catering: nextCatering,
        };
      })
    );

  const removeCateringWelcomeDrink = (pkgId: string, idx: number) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const list = currentCatering.welcomeDrinkItems || [];
        const nextList = list.filter((_, i) => i !== idx);
        const nextCatering = {
          ...currentCatering,
          welcomeDrinkItems: nextList,
        };
        const calc = cateringTotal(nextCatering);
        return {
          ...p,
          price: calc > 0 ? calc : (p.price || 0),
          catering: nextCatering,
        };
      })
    );

  const addCateringFreeTastingItem = (pkgId: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const list = currentCatering.freeTastingItems || [];
        return {
          ...p,
          catering: {
            ...currentCatering,
            freeTastingItems: [...list, ''],
          },
        };
      })
    );

  const updateCateringFreeTastingItem = (pkgId: string, idx: number, val: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const list = currentCatering.freeTastingItems || [];
        const nextList = list.map((it, i) => (i === idx ? val : it));
        return {
          ...p,
          catering: {
            ...currentCatering,
            freeTastingItems: nextList,
          },
        };
      })
    );

  const removeCateringFreeTastingItem = (pkgId: string, idx: number) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentCatering = p.catering || {};
        const list = currentCatering.freeTastingItems || [];
        return {
          ...p,
          catering: {
            ...currentCatering,
            freeTastingItems: list.filter((_, i) => i !== idx),
          },
        };
      })
    );
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
  // Price for one "Yes" hall feature (parking, powerBackup, …), stored in the
  // venue.featurePrices map keyed by the feature field name.
  const setVenueFeaturePrice = (pkgId: string, field: string, value: number | undefined) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const prices = { ...(p.venue?.featurePrices || {}) };
      if (value === undefined) delete prices[field]; else prices[field] = value;
      return { ...p, venue: { ...(p.venue || {}), featurePrices: prices } };
    }));
  // Upload an image for a venue hall — either a feature's photo (slot = the
  // feature field) or the catering menu/sample (slot = 'catering'). Reuses the
  // shared uploads endpoint. Busy key is `${pkgId}:${slot}`.
  const [uploadingVenueImg, setUploadingVenueImg] = useState<string | null>(null);
  const uploadVenueImage = async (pkgId: string, slot: string, file: File) => {
    if (!token) return;
    setUploadingVenueImg(`${pkgId}:${slot}`);
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
        if (slot === 'catering') {
          updatePackageVenue(pkgId, 'cateringImage', json.data.fileUrl);
        } else {
          setPackages((prev) => prev.map((p) => (p.id === pkgId
            ? { ...p, venue: { ...(p.venue || {}), featureImages: { ...(p.venue?.featureImages || {}), [slot]: json.data.fileUrl } } }
            : p)));
        }
      }
    } catch {
      /* upload is best-effort; vendor can retry */
    } finally {
      setUploadingVenueImg(null);
    }
  };
  const removeVenueImage = (pkgId: string, slot: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      if (slot === 'catering') return { ...p, venue: { ...(p.venue || {}), cateringImage: undefined } };
      const imgs = { ...(p.venue?.featureImages || {}) };
      delete imgs[slot];
      return { ...p, venue: { ...(p.venue || {}), featureImages: imgs } };
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
  // Price for one decoration option (theme/area/flower), stored in the matching
  // *Prices map keyed by the option name.
  const setDecorPrice = (pkgId: string, mapField: 'themePrices' | 'areaPrices' | 'flowerPrices', key: string, value: number | undefined) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const prices = { ...((p.decoration as any)?.[mapField] || {}) };
      if (value === undefined) delete prices[key]; else prices[key] = value;
      return { ...p, decoration: { ...(p.decoration || {}), [mapField]: prices } };
    }));
  // Upload a decoration image. slot encodes the target: "theme:Floral",
  // "area:Stage", "flower:Fresh", or "mandap". Busy key is `${pkgId}:${slot}`.
  const [uploadingDecorImg, setUploadingDecorImg] = useState<string | null>(null);
  const uploadDecorImage = async (pkgId: string, slot: string, file: File) => {
    if (!token) return;
    setUploadingDecorImg(`${pkgId}:${slot}`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${GATEWAY_URL}/api/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const json = await res.json().catch(() => ({}));
      if (json?.data?.fileUrl) {
        const url = json.data.fileUrl as string;
        const [group, key] = slot.split(':');
        const mapField = group === 'theme' ? 'themeImages' : group === 'area' ? 'areaImages' : group === 'flower' ? 'flowerImages' : '';
        setPackages((prev) => prev.map((p) => {
          if (p.id !== pkgId) return p;
          if (group === 'mandap') return { ...p, decoration: { ...(p.decoration || {}), mandapImage: url } };
          const imgs = { ...((p.decoration as any)?.[mapField] || {}) };
          imgs[key] = url;
          return { ...p, decoration: { ...(p.decoration || {}), [mapField]: imgs } };
        }));
      }
    } catch {
      /* upload is best-effort; vendor can retry */
    } finally {
      setUploadingDecorImg(null);
    }
  };
  const removeDecorImage = (pkgId: string, slot: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const [group, key] = slot.split(':');
      if (group === 'mandap') return { ...p, decoration: { ...(p.decoration || {}), mandapImage: undefined } };
      const mapField = group === 'theme' ? 'themeImages' : group === 'area' ? 'areaImages' : 'flowerImages';
      const imgs = { ...((p.decoration as any)?.[mapField] || {}) };
      delete imgs[key];
      return { ...p, decoration: { ...(p.decoration || {}), [mapField]: imgs } };
    }));
  // One row (price input + image upload) for a selected decoration option.
  const renderDecorPricedRow = (p: VendorPackage, group: 'theme' | 'area' | 'flower', name: string) => {
    const priceField = group === 'theme' ? 'themePrices' : group === 'area' ? 'areaPrices' : 'flowerPrices';
    const imgField = group === 'theme' ? 'themeImages' : group === 'area' ? 'areaImages' : 'flowerImages';
    const price = (p.decoration as any)?.[priceField]?.[name];
    const img = (p.decoration as any)?.[imgField]?.[name];
    const slot = `${group}:${name}`;
    return (
      <div key={slot} className="flex items-center gap-2 flex-wrap rounded-lg border border-slate-800/70 bg-slate-950/30 p-2">
        <span className="text-[11px] font-bold text-amber-300 min-w-[64px]">{name}</span>
        <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-slate-500 text-xs">₹</span>
          <input type="number" min={0} value={price ?? ''} onChange={(e) => setDecorPrice(p.id, priceField as any, name, e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder="Price" className="w-20 py-1.5 bg-transparent text-white text-xs focus:outline-none" />
        </div>
        {img && (
          <div className="relative">
            <img src={img} alt={name} className="w-10 h-10 rounded-lg object-cover border border-slate-800" />
            <button type="button" onClick={() => removeDecorImage(p.id, slot)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-800 text-slate-300 hover:text-rose-400 flex items-center justify-center" aria-label="Remove image">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
        <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-[11px] font-bold cursor-pointer transition-colors">
          {uploadingDecorImg === `${p.id}:${slot}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {img ? 'Replace' : 'Upload'}
          <input type="file" accept="image/*" className="hidden" disabled={!!uploadingDecorImg}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDecorImage(p.id, slot, f); e.target.value = ''; }} />
        </label>
      </div>
    );
  };

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
  const setMakeupTypePrice = (pkgId: string, key: string, value: number | undefined) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const prices = { ...(p.makeup?.makeupTypePrices || {}) };
      if (value === undefined) delete prices[key]; else prices[key] = value;
      return { ...p, makeup: { ...(p.makeup || {}), makeupTypePrices: prices } };
    }));
  const [uploadingMakeupImg, setUploadingMakeupImg] = useState<string | null>(null);
  const uploadMakeupTypeImage = async (pkgId: string, key: string, file: File) => {
    if (!token) return;
    setUploadingMakeupImg(`${pkgId}:${key}`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${GATEWAY_URL}/api/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const json = await res.json().catch(() => ({}));
      if (json?.data?.fileUrl) {
        setPackages((prev) => prev.map((p) => (p.id === pkgId
          ? { ...p, makeup: { ...(p.makeup || {}), makeupTypeImages: { ...(p.makeup?.makeupTypeImages || {}), [key]: json.data.fileUrl } } }
          : p)));
      }
    } catch {
      /* upload is best-effort; vendor can retry */
    } finally {
      setUploadingMakeupImg(null);
    }
  };
  const removeMakeupTypeImage = (pkgId: string, key: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const imgs = { ...(p.makeup?.makeupTypeImages || {}) };
      delete imgs[key];
      return { ...p, makeup: { ...(p.makeup || {}), makeupTypeImages: imgs } };
    }));
  // Auto-total for a Makeup package: finish + hairstyle + draping + travel +
  // extra-family prices, plus every selected function-type price.
  const makeupTotal = (m?: any): number => {
    if (!m) return 0;
    let sum = (Number(m.finishPrice) || 0) + (Number(m.hairstylePrice) || 0)
      + (Number(m.drapingPrice) || 0) + (Number(m.travelPrice) || 0) + (Number(m.extraFamilyPrice) || 0);
    if (m.makeupTypePrices && typeof m.makeupTypePrices === 'object') {
      for (const val of Object.values(m.makeupTypePrices)) sum += Number(val) || 0;
    }
    return sum;
  };

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
  // Set a keyed value inside one of media's map fields (stylePrices,
  // featurePrices, featureQuality).
  const setMediaMapValue = (pkgId: string, mapField: 'stylePrices' | 'featurePrices' | 'featureQuality', key: string, value: number | string | undefined) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const map = { ...((p.media as any)?.[mapField] || {}) };
      if (value === undefined || value === '') delete map[key]; else map[key] = value;
      return { ...p, media: { ...(p.media || {}), [mapField]: map } };
    }));
  // Upload a media image. slot: "style:Candid", "coverage", or "feature:drone".
  const [uploadingMediaImg, setUploadingMediaImg] = useState<string | null>(null);
  const uploadMediaImage = async (pkgId: string, slot: string, file: File) => {
    if (!token) return;
    setUploadingMediaImg(`${pkgId}:${slot}`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${GATEWAY_URL}/api/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const json = await res.json().catch(() => ({}));
      if (json?.data?.fileUrl) {
        const url = json.data.fileUrl as string;
        const [group, key] = slot.split(':');
        setPackages((prev) => prev.map((p) => {
          if (p.id !== pkgId) return p;
          if (group === 'coverage') return { ...p, media: { ...(p.media || {}), coverageImage: url } };
          const mapField = group === 'style' ? 'styleImages' : 'featureImages';
          const imgs = { ...((p.media as any)?.[mapField] || {}) };
          imgs[key] = url;
          return { ...p, media: { ...(p.media || {}), [mapField]: imgs } };
        }));
      }
    } catch {
      /* upload is best-effort; vendor can retry */
    } finally {
      setUploadingMediaImg(null);
    }
  };
  const removeMediaImage = (pkgId: string, slot: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const [group, key] = slot.split(':');
      if (group === 'coverage') return { ...p, media: { ...(p.media || {}), coverageImage: undefined } };
      const mapField = group === 'style' ? 'styleImages' : 'featureImages';
      const imgs = { ...((p.media as any)?.[mapField] || {}) };
      delete imgs[key];
      return { ...p, media: { ...(p.media || {}), [mapField]: imgs } };
    }));
  // Auto-total for a Media package: coverage + days/crew/hours + album type +
  // photo frame + album pages prices, every style price, and every "Yes"
  // deliverable price.
  const mediaTotal = (m?: any): number => {
    if (!m) return 0;
    let sum = (Number(m.coveragePrice) || 0) + (Number(m.daysPrice) || 0) + (Number(m.crewPrice) || 0)
      + (Number(m.hoursPrice) || 0) + (Number(m.albumTypePrice) || 0) + (Number(m.photoFramePrice) || 0)
      + (Number(m.albumPagesPrice) || 0);
    for (const map of [m.stylePrices, m.featurePrices]) {
      if (map && typeof map === 'object') {
        for (const val of Object.values(map)) sum += Number(val) || 0;
      }
    }
    return sum;
  };

  // Auto-total for a Transport package:
  // - Per day / Per km rate
  // - Selected vehicle prices (sum for all selected vehicleTypes)
  // - Use prices (Baraat, Guests, Couple)
  // - Package / inclusions price (kmHoursPrice)
  // - Driver + fuel price (if driverFuel is true)
  // - Car decoration price (if carDecoration is true)
  const transportTotal = (t?: any): number => {
    if (!t) return 0;
    let sum = 0;
    if (t.perDayPrice) sum += Number(t.perDayPrice) || 0;
    if (t.perKmPrice) sum += Number(t.perKmPrice) || 0;

    const selectedVehicles: string[] = Array.isArray(t.vehicleTypes) && t.vehicleTypes.length > 0
      ? t.vehicleTypes
      : (t.vehicleType ? [t.vehicleType] : []);
    if (t.vehicleTypePrices && typeof t.vehicleTypePrices === 'object') {
      for (const v of selectedVehicles) {
        sum += Number(t.vehicleTypePrices[v]) || 0;
      }
    }

    const selectedUses: string[] = Array.isArray(t.uses) && t.uses.length > 0
      ? t.uses
      : (t.use ? [t.use] : []);
    if (t.usePrices && typeof t.usePrices === 'object') {
      for (const u of selectedUses) {
        sum += Number(t.usePrices[u]) || 0;
      }
    }

    sum += Number(t.kmHoursPrice) || 0;

    if (t.driverFuel) {
      sum += Number(t.driverFuelPrice) || 0;
    }

    if (t.carDecoration) {
      sum += Number(t.carDecorationPrice) || 0;
    }

    return sum;
  };

  const [uploadingTransportImg, setUploadingTransportImg] = useState<string | null>(null);
  const uploadTransportImage = async (pkgId: string, slot: string, file: File) => {
    if (!token) return;
    setUploadingTransportImg(`${pkgId}:${slot}`);
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
        const url = json.data.fileUrl as string;
        setPackages((prev) =>
          prev.map((p) => {
            if (p.id !== pkgId) return p;
            if (slot === 'decoration') {
              return {
                ...p,
                transport: { ...(p.transport || {}), carDecorationImage: url },
              };
            }
            if (slot.startsWith('vehicle:')) {
              const vType = slot.replace('vehicle:', '');
              const imgs = { ...(p.transport?.vehicleTypeImages || {}) };
              imgs[vType] = url;
              return {
                ...p,
                transport: { ...(p.transport || {}), vehicleTypeImages: imgs },
              };
            }
            return p;
          })
        );
      }
    } catch {
      /* upload is best-effort */
    } finally {
      setUploadingTransportImg(null);
    }
  };

  const removeTransportImage = (pkgId: string, slot: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        if (slot === 'decoration') {
          return {
            ...p,
            transport: { ...(p.transport || {}), carDecorationImage: undefined },
          };
        }
        if (slot.startsWith('vehicle:')) {
          const vType = slot.replace('vehicle:', '');
          const imgs = { ...(p.transport?.vehicleTypeImages || {}) };
          delete imgs[vType];
          return {
            ...p,
            transport: { ...(p.transport || {}), vehicleTypeImages: imgs },
          };
        }
        return p;
      })
    );

  const updatePackageTransport = (pkgId: string, field: string, value: any) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const nextTransport = { ...(p.transport || {}), [field]: value };
        const calc = transportTotal(nextTransport);
        return {
          ...p,
          transport: nextTransport,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const toggleTransportVehicleType = (pkgId: string, vType: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const current: string[] = p.transport?.vehicleTypes || (p.transport?.vehicleType ? [p.transport.vehicleType] : []);
        const next = current.includes(vType) ? current.filter((x) => x !== vType) : [...current, vType];
        const nextTransport = {
          ...(p.transport || {}),
          vehicleType: next[0] || undefined,
          vehicleTypes: next,
        };
        const calc = transportTotal(nextTransport);
        return {
          ...p,
          transport: nextTransport,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const updateTransportVehicleSeat = (pkgId: string, vType: string, seats: number | undefined) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentSeats = { ...(p.transport?.vehicleTypeSeats || {}) };
        if (seats === undefined) delete currentSeats[vType];
        else currentSeats[vType] = seats;
        return {
          ...p,
          transport: { ...(p.transport || {}), vehicleTypeSeats: currentSeats },
        };
      })
    );

  const updateTransportVehiclePrice = (pkgId: string, vType: string, price: number | undefined) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentPrices = { ...(p.transport?.vehicleTypePrices || {}) };
        if (price === undefined) delete currentPrices[vType];
        else currentPrices[vType] = price;
        const nextTransport = {
          ...(p.transport || {}),
          vehicleTypePrices: currentPrices,
        };
        const calc = transportTotal(nextTransport);
        return {
          ...p,
          transport: nextTransport,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const toggleTransportUse = (pkgId: string, useVal: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const current: string[] = p.transport?.uses || (p.transport?.use ? [p.transport.use] : []);
        const next = current.includes(useVal) ? current.filter((x) => x !== useVal) : [...current, useVal];
        const nextTransport = {
          ...(p.transport || {}),
          use: next[0] || undefined,
          uses: next,
        };
        const calc = transportTotal(nextTransport);
        return {
          ...p,
          transport: nextTransport,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const updateTransportUsePrice = (pkgId: string, useVal: string, price: number | undefined) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const currentPrices = { ...(p.transport?.usePrices || {}) };
        if (price === undefined) delete currentPrices[useVal];
        else currentPrices[useVal] = price;
        const nextTransport = {
          ...(p.transport || {}),
          usePrices: currentPrices,
        };
        const calc = transportTotal(nextTransport);
        return {
          ...p,
          transport: nextTransport,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

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

  // Auto-total for an Invitation package:
  // - Design price (Custom / Template)
  // - Type prices (sum for all selected types: Digital e-invite, Video invite, Printed card)
  // - Add-ons prices (RSVP link, Invitation call by person)
  // - Languages price (languagePrice)
  // - Print quantity price (quantityPrice)
  const invitationTotal = (inv?: any): number => {
    if (!inv) return 0;
    let sum = 0;

    // Design price
    if (inv.design && inv.designPrices && typeof inv.designPrices === 'object') {
      sum += Number(inv.designPrices[inv.design]) || 0;
    }

    // Type prices
    const selectedTypes: string[] = Array.isArray(inv.types) && inv.types.length > 0
      ? inv.types
      : (inv.type ? [inv.type] : []);
    if (inv.typePrices && typeof inv.typePrices === 'object') {
      for (const t of selectedTypes) {
        sum += Number(inv.typePrices[t]) || 0;
      }
    }

    // Add-on prices (RSVP link, Invitation call by person)
    const selectedAddOns: string[] = Array.isArray(inv.addOns) ? inv.addOns : [];
    if (inv.addOnPrices && typeof inv.addOnPrices === 'object') {
      for (const a of selectedAddOns) {
        const key = a === 'Caricature' ? 'Invitation call by person' : a;
        sum += Number(inv.addOnPrices[key] || inv.addOnPrices[a]) || 0;
      }
    }

    // Languages price
    sum += Number(inv.languagePrice) || 0;

    // Print quantity price
    sum += Number(inv.quantityPrice) || 0;

    return sum;
  };

  const [uploadingInvitationImg, setUploadingInvitationImg] = useState<string | null>(null);
  const uploadInvitationImage = async (pkgId: string, typeName: string, file: File) => {
    if (!token) return;
    setUploadingInvitationImg(`${pkgId}:${typeName}`);
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
        const url = json.data.fileUrl as string;
        setPackages((prev) =>
          prev.map((p) => {
            if (p.id !== pkgId) return p;
            const imgs = { ...(p.invitation?.typeImages || {}) };
            imgs[typeName] = url;
            return {
              ...p,
              invitation: { ...(p.invitation || {}), typeImages: imgs },
            };
          })
        );
      }
    } catch {
      /* best-effort */
    } finally {
      setUploadingInvitationImg(null);
    }
  };

  const removeInvitationImage = (pkgId: string, typeName: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const imgs = { ...(p.invitation?.typeImages || {}) };
        delete imgs[typeName];
        return {
          ...p,
          invitation: { ...(p.invitation || {}), typeImages: imgs },
        };
      })
    );

  const updatePackageInvitation = (pkgId: string, field: string, value: any) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const nextInvitation = { ...(p.invitation || {}), [field]: value };
        const calc = invitationTotal(nextInvitation);
        return {
          ...p,
          invitation: nextInvitation,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const updateInvitationDesignPrice = (pkgId: string, designName: string, price: number | undefined) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const prices = { ...(p.invitation?.designPrices || {}) };
        if (price === undefined) delete prices[designName];
        else prices[designName] = price;
        const nextInvitation = {
          ...(p.invitation || {}),
          design: designName,
          designPrices: prices,
        };
        const calc = invitationTotal(nextInvitation);
        return {
          ...p,
          invitation: nextInvitation,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const toggleInvitationType = (pkgId: string, typeName: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const current: string[] = p.invitation?.types || (p.invitation?.type ? [p.invitation.type] : []);
        const next = current.includes(typeName) ? current.filter((x) => x !== typeName) : [...current, typeName];
        const nextInvitation = {
          ...(p.invitation || {}),
          type: next[0] || undefined,
          types: next,
        };
        const calc = invitationTotal(nextInvitation);
        return {
          ...p,
          invitation: nextInvitation,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const updateInvitationTypePrice = (pkgId: string, typeName: string, price: number | undefined) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const prices = { ...(p.invitation?.typePrices || {}) };
        if (price === undefined) delete prices[typeName];
        else prices[typeName] = price;
        const nextInvitation = {
          ...(p.invitation || {}),
          typePrices: prices,
        };
        const calc = invitationTotal(nextInvitation);
        return {
          ...p,
          invitation: nextInvitation,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const toggleInvitationAddon = (pkgId: string, addOn: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const current: string[] = (p.invitation?.addOns || []).map((x) => (x === 'Caricature' ? 'Invitation call by person' : x));
        const normalized = addOn === 'Caricature' ? 'Invitation call by person' : addOn;
        const next = current.includes(normalized) ? current.filter((x) => x !== normalized) : [...current, normalized];
        const nextInvitation = {
          ...(p.invitation || {}),
          addOns: next,
        };
        const calc = invitationTotal(nextInvitation);
        return {
          ...p,
          invitation: nextInvitation,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const updateInvitationAddonPrice = (pkgId: string, addOn: string, price: number | undefined) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const normalized = addOn === 'Caricature' ? 'Invitation call by person' : addOn;
        const prices = { ...(p.invitation?.addOnPrices || {}) };
        if (price === undefined) delete prices[normalized];
        else prices[normalized] = price;
        const nextInvitation = {
          ...(p.invitation || {}),
          addOnPrices: prices,
        };
        const calc = invitationTotal(nextInvitation);
        return {
          ...p,
          invitation: nextInvitation,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const toggleInvitationArray = (pkgId: string, field: 'addOns' | 'languages', item: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const normalized = item === 'Caricature' ? 'Invitation call by person' : item;
        const current: string[] = ((p.invitation as any)?.[field]) || [];
        const next = current.includes(normalized) ? current.filter((x) => x !== normalized) : [...current, normalized];
        const nextInvitation = { ...(p.invitation || {}), [field]: next };
        const calc = invitationTotal(nextInvitation);
        return {
          ...p,
          invitation: nextInvitation,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  // Auto-total for a Printing package:
  // - Product prices (sum of productPrices for all selected products: Banners, Albums, Standees, Photo frames, Thank-you cards)
  // - Material / finish prices (sum of finishPrices for all selected finishes: Matte, Glossy, Lamination)
  // - Design price (if designIncluded is true)
  const printingTotal = (pr?: any): number => {
    if (!pr) return 0;
    let sum = 0;

    // Product prices
    const selectedProducts: string[] = Array.isArray(pr.products) && pr.products.length > 0
      ? pr.products
      : (pr.product ? [pr.product] : []);
    if (pr.productPrices && typeof pr.productPrices === 'object') {
      for (const prod of selectedProducts) {
        sum += Number(pr.productPrices[prod]) || 0;
      }
    }

    // Material / finish prices
    const selectedFinishes: string[] = Array.isArray(pr.finishes) ? pr.finishes : [];
    if (pr.finishPrices && typeof pr.finishPrices === 'object') {
      for (const f of selectedFinishes) {
        sum += Number(pr.finishPrices[f]) || 0;
      }
    }

    // Design price
    if (pr.designIncluded) {
      sum += Number(pr.designPrice) || 0;
    }

    return sum;
  };

  const [uploadingPrintingImg, setUploadingPrintingImg] = useState<string | null>(null);
  const uploadPrintingImage = async (pkgId: string, slot: string, file: File) => {
    if (!token) return;
    setUploadingPrintingImg(`${pkgId}:${slot}`);
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
        const url = json.data.fileUrl as string;
        setPackages((prev) =>
          prev.map((p) => {
            if (p.id !== pkgId) return p;
            if (slot === 'design') {
              const nextPr = { ...(p.printing || {}), designImage: url };
              return { ...p, printing: nextPr };
            }
            if (slot.startsWith('product:')) {
              const prod = slot.replace('product:', '');
              const imgs = { ...(p.printing?.productImages || {}) };
              imgs[prod] = url;
              const nextPr = { ...(p.printing || {}), productImages: imgs };
              return { ...p, printing: nextPr };
            }
            if (slot.startsWith('finish:')) {
              const finish = slot.replace('finish:', '');
              const imgs = { ...(p.printing?.finishImages || {}) };
              imgs[finish] = url;
              const nextPr = { ...(p.printing || {}), finishImages: imgs };
              return { ...p, printing: nextPr };
            }
            return p;
          })
        );
      }
    } catch {
      /* best-effort */
    } finally {
      setUploadingPrintingImg(null);
    }
  };

  const removePrintingImage = (pkgId: string, slot: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        if (slot === 'design') {
          const nextPr = { ...(p.printing || {}), designImage: undefined };
          return { ...p, printing: nextPr };
        }
        if (slot.startsWith('product:')) {
          const prod = slot.replace('product:', '');
          const imgs = { ...(p.printing?.productImages || {}) };
          delete imgs[prod];
          const nextPr = { ...(p.printing || {}), productImages: imgs };
          return { ...p, printing: nextPr };
        }
        if (slot.startsWith('finish:')) {
          const finish = slot.replace('finish:', '');
          const imgs = { ...(p.printing?.finishImages || {}) };
          delete imgs[finish];
          const nextPr = { ...(p.printing || {}), finishImages: imgs };
          return { ...p, printing: nextPr };
        }
        return p;
      })
    );

  const updatePackagePrinting = (pkgId: string, field: string, value: any) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const nextPrinting = { ...(p.printing || {}), [field]: value };
        const calc = printingTotal(nextPrinting);
        return {
          ...p,
          printing: nextPrinting,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const togglePrintingProduct = (pkgId: string, prod: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const current: string[] = p.printing?.products || (p.printing?.product ? [p.printing.product] : []);
        const next = current.includes(prod) ? current.filter((x) => x !== prod) : [...current, prod];
        const nextPrinting = {
          ...(p.printing || {}),
          product: next[0] || undefined,
          products: next,
        };
        const calc = printingTotal(nextPrinting);
        return {
          ...p,
          printing: nextPrinting,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const updatePrintingProductField = (pkgId: string, prod: string, field: 'types' | 'sizes' | 'prices', value: any) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const targetMapField = field === 'types' ? 'productTypes' : field === 'sizes' ? 'productSizes' : 'productPrices';
        const currentMap = { ...((p.printing as any)?.[targetMapField] || {}) };
        if (value === undefined || value === '') delete currentMap[prod];
        else currentMap[prod] = value;
        const nextPrinting = {
          ...(p.printing || {}),
          [targetMapField]: currentMap,
        };
        const calc = printingTotal(nextPrinting);
        return {
          ...p,
          printing: nextPrinting,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const togglePrintingFinish = (pkgId: string, finish: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const current: string[] = p.printing?.finishes || [];
        const next = current.includes(finish) ? current.filter((x) => x !== finish) : [...current, finish];
        const nextPrinting = {
          ...(p.printing || {}),
          finishes: next,
        };
        const calc = printingTotal(nextPrinting);
        return {
          ...p,
          printing: nextPrinting,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const updatePrintingFinishPrice = (pkgId: string, finish: string, price: number | undefined) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const prices = { ...(p.printing?.finishPrices || {}) };
        if (price === undefined) delete prices[finish];
        else prices[finish] = price;
        const nextPrinting = {
          ...(p.printing || {}),
          finishPrices: prices,
        };
        const calc = printingTotal(nextPrinting);
        return {
          ...p,
          printing: nextPrinting,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  // Auto-total for a Return Gifts package:
  // - Gift type prices: sum of giftPrices for selected giftTypes (Dry fruits, Silver items, Potli bags, Plants, Hampers, Sweets)
  // - Count of gifts price: countPrice
  // - Packaging price: packagingPrice
  // - Customization price: customizationPrice (if customization is true)
  const returnGiftsTotal = (rg?: any): number => {
    if (!rg) return 0;
    let sum = 0;

    // Gift type prices
    const selectedTypes: string[] = Array.isArray(rg.giftTypes) && rg.giftTypes.length > 0
      ? rg.giftTypes
      : (rg.giftType ? [rg.giftType] : []);
    if (rg.giftPrices && typeof rg.giftPrices === 'object') {
      for (const gt of selectedTypes) {
        sum += Number(rg.giftPrices[gt]) || 0;
      }
    }

    // Count of gifts price
    sum += Number(rg.countPrice) || 0;

    // Packaging price
    sum += Number(rg.packagingPrice) || 0;

    // Customization price
    if (rg.customization) {
      sum += Number(rg.customizationPrice) || 0;
    }

    return sum;
  };

  const [uploadingReturnGiftImg, setUploadingReturnGiftImg] = useState<string | null>(null);
  const uploadReturnGiftImage = async (pkgId: string, giftType: string, file: File) => {
    if (!token) return;
    setUploadingReturnGiftImg(`${pkgId}:${giftType}`);
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
        const url = json.data.fileUrl as string;
        setPackages((prev) =>
          prev.map((p) => {
            if (p.id !== pkgId) return p;
            const imgs = { ...(p.returnGifts?.giftImages || {}) };
            imgs[giftType] = url;
            const nextRg = { ...(p.returnGifts || {}), giftImages: imgs };
            return { ...p, returnGifts: nextRg };
          })
        );
      }
    } catch {
      /* best-effort */
    } finally {
      setUploadingReturnGiftImg(null);
    }
  };

  const removeReturnGiftImage = (pkgId: string, giftType: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const imgs = { ...(p.returnGifts?.giftImages || {}) };
        delete imgs[giftType];
        const nextRg = { ...(p.returnGifts || {}), giftImages: imgs };
        return { ...p, returnGifts: nextRg };
      })
    );

  const updatePackageReturnGifts = (pkgId: string, field: string, value: any) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const nextRg = { ...(p.returnGifts || {}), [field]: value };
        const calc = returnGiftsTotal(nextRg);
        return {
          ...p,
          returnGifts: nextRg,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const toggleReturnGiftType = (pkgId: string, g: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const current: string[] = p.returnGifts?.giftTypes || (p.returnGifts?.giftType ? [p.returnGifts.giftType] : []);
        const next = current.includes(g) ? current.filter((x) => x !== g) : [...current, g];
        const nextRg = {
          ...(p.returnGifts || {}),
          giftType: next[0] || undefined,
          giftTypes: next,
        };
        const calc = returnGiftsTotal(nextRg);
        return {
          ...p,
          returnGifts: nextRg,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const updateReturnGiftField = (pkgId: string, g: string, field: 'details' | 'price', value: any) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const targetMap = field === 'details' ? 'giftItemDetails' : 'giftPrices';
        const currentMap = { ...((p.returnGifts as any)?.[targetMap] || {}) };
        if (value === undefined || value === '') delete currentMap[g];
        else currentMap[g] = value;
        const nextRg = {
          ...(p.returnGifts || {}),
          [targetMap]: currentMap,
        };
        const calc = returnGiftsTotal(nextRg);
        return {
          ...p,
          returnGifts: nextRg,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  // Entertainment packages carry structured act details.
  // Entertainment total = every selected act's price + equipment + travel price.
  const entertainmentTotal = (e?: any): number => {
    if (!e) return 0;
    let sum = 0;
    if (Array.isArray(e.actTypes) && e.actTypePrices) {
      for (const a of e.actTypes) sum += Number(e.actTypePrices[a]) || 0;
    }
    sum += Number(e.equipmentPrice) || 0;
    sum += Number(e.travelPrice) || 0;
    return sum;
  };
  const updatePackageEntertainment = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const entertainment = { ...(p.entertainment || {}), [field]: value };
      return { ...p, entertainment, price: entertainmentTotal(entertainment) };
    }));
  const toggleEntertainmentAct = (pkgId: string, act: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const cur: string[] = (p.entertainment?.actTypes) || [];
      const next = cur.includes(act) ? cur.filter((x) => x !== act) : [...cur, act];
      const entertainment = { ...(p.entertainment || {}), actTypes: next };
      return { ...p, entertainment, price: entertainmentTotal(entertainment) };
    }));
  const updateEntertainmentActPrice = (pkgId: string, act: string, price?: number) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const map: Record<string, number> = { ...((p.entertainment?.actTypePrices) || {}) };
      if (price === undefined) delete map[act]; else map[act] = price;
      const entertainment = { ...(p.entertainment || {}), actTypePrices: map };
      return { ...p, entertainment, price: entertainmentTotal(entertainment) };
    }));
  const [uploadingEntertainmentImg, setUploadingEntertainmentImg] = useState<string | null>(null);
  const uploadEntertainmentImage = async (pkgId: string, act: string, file: File) => {
    if (!token) return;
    setUploadingEntertainmentImg(`${pkgId}:${act}`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${GATEWAY_URL}/api/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json().catch(() => ({}));
      const fileUrl = data?.data?.fileUrl || data?.url || URL.createObjectURL(file);
      setPackages((prev) => prev.map((p) => {
        if (p.id !== pkgId) return p;
        const cur = p.entertainment || {};
        return { ...p, entertainment: { ...cur, actTypeImages: { ...((cur as any).actTypeImages || {}), [act]: fileUrl } } };
      }));
    } catch { /* best effort */ } finally { setUploadingEntertainmentImg(null); }
  };
  const removeEntertainmentImage = (pkgId: string, act: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const cur = p.entertainment || {};
      const m = { ...((cur as any).actTypeImages || {}) };
      delete m[act];
      return { ...p, entertainment: { ...cur, actTypeImages: m } };
    }));

  // Music/DJ packages carry structured details.
  const updatePackageMusicDj = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, musicDj: { ...(p.musicDj || {}), [field]: value } } : p)));

  // Auto-total for a Lighting / Lights & Sounds package:
  // - Lighting type prices: sum of typePrices for selected lightingTypes
  // - Area covered price: areaCoveredPrice
  // - Power backup price: powerBackupPrice (if powerBackup is true)
  // - Setup & teardown price: setupTeardownPrice (if setupTeardown is true)
  const lightingTotal = (lt?: any): number => {
    if (!lt) return 0;
    let sum = 0;

    // Lighting type prices
    const selectedTypes: string[] = Array.isArray(lt.lightingTypes) ? lt.lightingTypes : [];
    if (lt.typePrices && typeof lt.typePrices === 'object') {
      for (const t of selectedTypes) {
        sum += Number(lt.typePrices[t]) || 0;
      }
    }

    // Area covered price
    sum += Number(lt.areaCoveredPrice) || 0;

    // Power backup price
    if (lt.powerBackup) {
      sum += Number(lt.powerBackupPrice) || 0;
    }

    // Setup + teardown price
    if (lt.setupTeardown) {
      sum += Number(lt.setupTeardownPrice) || 0;
    }

    return sum;
  };

  const [uploadingLightingImg, setUploadingLightingImg] = useState<string | null>(null);
  const uploadLightingImage = async (pkgId: string, typeName: string, file: File) => {
    if (!token) return;
    setUploadingLightingImg(`${pkgId}:${typeName}`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${GATEWAY_URL}/api/v1/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setPackages((prev) =>
          prev.map((p) => {
            if (p.id !== pkgId) return p;
            const cur = p.lighting || {};
            const nextImages = { ...(cur.typeImages || {}), [typeName]: data.url };
            return { ...p, lighting: { ...cur, typeImages: nextImages } };
          })
        );
      }
    } catch {
      /* ignore upload failure */
    } finally {
      setUploadingLightingImg(null);
    }
  };

  const removeLightingImage = (pkgId: string, typeName: string) => {
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const cur = p.lighting || {};
        const nextImages = { ...(cur.typeImages || {}) };
        delete nextImages[typeName];
        return { ...p, lighting: { ...cur, typeImages: nextImages } };
      })
    );
  };

  // Lighting packages carry structured details.
  const updatePackageLighting = (pkgId: string, field: string, value: any) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const nextLt = { ...(p.lighting || {}), [field]: value };
        const calc = lightingTotal(nextLt);
        return {
          ...p,
          lighting: nextLt,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const toggleLightingType = (pkgId: string, item: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const current: string[] = p.lighting?.lightingTypes || [];
        const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
        const nextLt = { ...(p.lighting || {}), lightingTypes: next };
        const calc = lightingTotal(nextLt);
        return {
          ...p,
          lighting: nextLt,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const updateLightingField = (pkgId: string, typeName: string, field: 'price' | 'item', value: any) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const cur = p.lighting || {};
        let nextLt = { ...cur };
        if (field === 'price') {
          const nextPrices = { ...(cur.typePrices || {}) };
          if (value === undefined || value === '') {
            delete nextPrices[typeName];
          } else {
            nextPrices[typeName] = Number(value);
          }
          nextLt = { ...nextLt, typePrices: nextPrices };
        } else if (field === 'item') {
          const nextItems = { ...(cur.typeItems || {}) };
          if (!value) {
            delete nextItems[typeName];
          } else {
            nextItems[typeName] = value;
          }
          nextLt = { ...nextLt, typeItems: nextItems };
        }
        const calc = lightingTotal(nextLt);
        return {
          ...p,
          lighting: nextLt,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  // Auto-total for a Flowers package:
  // - Variety prices: sum of varietyPrices for selected varieties + custom varieties prices
  // - Flower kind prices: flowerKindPrices for selected flowerKind
  // - Item prices: sum of itemPrices for selected items + custom items prices
  // - Quantity: if unitPrice > 0 -> unitPrice * (quantity || 1); else quantityPrice || 0
  // - Delivery timing price: deliveryTimingPrice || 0
  // - Which function price: whichFunctionPrice || 0
  const flowersTotal = (fl?: any): number => {
    if (!fl) return 0;
    let sum = 0;

    // Variety prices (existing selected varieties)
    const selectedVarieties: string[] = Array.isArray(fl.varieties)
      ? fl.varieties
      : fl.variety ? [fl.variety] : [];
    if (fl.varietyPrices && typeof fl.varietyPrices === 'object') {
      for (const v of selectedVarieties) {
        sum += Number(fl.varietyPrices[v]) || 0;
      }
    }
    // Custom varieties added
    if (Array.isArray(fl.customVarieties)) {
      for (const cv of fl.customVarieties) {
        sum += Number(cv?.price) || 0;
      }
    }

    // Flower kind price (if any)
    if (fl.flowerKind && fl.flowerKindPrices && typeof fl.flowerKindPrices === 'object') {
      sum += Number(fl.flowerKindPrices[fl.flowerKind]) || 0;
    }

    // Item prices (existing selected items)
    const selectedItems: string[] = Array.isArray(fl.items) ? fl.items : [];
    if (fl.itemPrices && typeof fl.itemPrices === 'object') {
      for (const it of selectedItems) {
        sum += Number(fl.itemPrices[it]) || 0;
      }
    }
    // Custom items added
    if (Array.isArray(fl.customItems)) {
      for (const ci of fl.customItems) {
        sum += Number(ci?.price) || 0;
      }
    }

    // Types of price from Image 3: Quantity
    const qty = Number(fl.quantity) || 0;
    const unitPrice = Number(fl.unitPrice) || 0;
    if (unitPrice > 0) {
      sum += qty > 0 ? unitPrice * qty : unitPrice;
    } else if (fl.quantityPrice) {
      sum += Number(fl.quantityPrice) || 0;
    }

    // Delivery timing price
    sum += Number(fl.deliveryTimingPrice) || 0;

    // Which function price
    sum += Number(fl.whichFunctionPrice) || 0;

    return sum;
  };

  const [uploadingFlowersImg, setUploadingFlowersImg] = useState<string | null>(null);

  const uploadFlowersImage = async (
    pkgId: string,
    target: 'variety' | 'item' | 'flowerKind' | 'customVariety' | 'customItem',
    key: string | number,
    file: File
  ) => {
    if (!token) return;
    setUploadingFlowersImg(`${pkgId}:${target}:${key}`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${GATEWAY_URL}/api/v1/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      let fileUrl = data?.data?.fileUrl || data?.url;
      if (!fileUrl) {
        fileUrl = URL.createObjectURL(file);
      }
      setPackages((prev) =>
        prev.map((p) => {
          if (p.id !== pkgId) return p;
          const cur = p.flowers || {};
          let nextFl = { ...cur };
          if (target === 'variety') {
            nextFl.varietyImages = { ...(cur.varietyImages || {}), [key]: fileUrl };
          } else if (target === 'item') {
            nextFl.itemImages = { ...(cur.itemImages || {}), [key]: fileUrl };
          } else if (target === 'flowerKind') {
            nextFl.flowerKindImages = { ...(cur.flowerKindImages || {}), [key]: fileUrl };
          } else if (target === 'customVariety') {
            const cvs = [...(cur.customVarieties || [])];
            const idx = Number(key);
            if (cvs[idx]) cvs[idx] = { ...cvs[idx], image: fileUrl };
            nextFl.customVarieties = cvs;
          } else if (target === 'customItem') {
            const cis = [...(cur.customItems || [])];
            const idx = Number(key);
            if (cis[idx]) cis[idx] = { ...cis[idx], image: fileUrl };
            nextFl.customItems = cis;
          }
          return { ...p, flowers: nextFl };
        })
      );
    } catch {
      /* best effort upload */
    } finally {
      setUploadingFlowersImg(null);
    }
  };

  const removeFlowersImage = (
    pkgId: string,
    target: 'variety' | 'item' | 'flowerKind' | 'customVariety' | 'customItem',
    key: string | number
  ) => {
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const cur = p.flowers || {};
        let nextFl = { ...cur };
        if (target === 'variety') {
          const m = { ...(cur.varietyImages || {}) };
          delete m[key as string];
          nextFl.varietyImages = m;
        } else if (target === 'item') {
          const m = { ...(cur.itemImages || {}) };
          delete m[key as string];
          nextFl.itemImages = m;
        } else if (target === 'flowerKind') {
          const m = { ...(cur.flowerKindImages || {}) };
          delete m[key as string];
          nextFl.flowerKindImages = m;
        } else if (target === 'customVariety') {
          const cvs = [...(cur.customVarieties || [])];
          const idx = Number(key);
          if (cvs[idx]) cvs[idx] = { ...cvs[idx], image: undefined };
          nextFl.customVarieties = cvs;
        } else if (target === 'customItem') {
          const cis = [...(cur.customItems || [])];
          const idx = Number(key);
          if (cis[idx]) cis[idx] = { ...cis[idx], image: undefined };
          nextFl.customItems = cis;
        }
        return { ...p, flowers: nextFl };
      })
    );
  };

  // Flowers packages carry structured details.
  const updatePackageFlowers = (pkgId: string, field: string, value: any) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const nextFl = { ...(p.flowers || {}), [field]: value };
        const calc = flowersTotal(nextFl);
        return {
          ...p,
          flowers: nextFl,
          price: calc > 0 ? calc : (p.price || 0),
        };
      })
    );

  const toggleFlowersVariety = (pkgId: string, variety: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const current: string[] = p.flowers?.varieties || (p.flowers?.variety ? [p.flowers.variety] : []);
        const next = current.includes(variety) ? current.filter((x) => x !== variety) : [...current, variety];
        const nextFl = {
          ...(p.flowers || {}),
          varieties: next,
          variety: next[0] || undefined,
        };
        const calc = flowersTotal(nextFl);
        return { ...p, flowers: nextFl, price: calc > 0 ? calc : (p.price || 0) };
      })
    );

  const updateFlowersVarietyPrice = (pkgId: string, variety: string, price?: number) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const cur = p.flowers || {};
        const nextPrices = { ...(cur.varietyPrices || {}) };
        if (price === undefined || isNaN(price)) {
          delete nextPrices[variety];
        } else {
          nextPrices[variety] = price;
        }
        const nextFl = { ...cur, varietyPrices: nextPrices };
        const calc = flowersTotal(nextFl);
        return { ...p, flowers: nextFl, price: calc > 0 ? calc : (p.price || 0) };
      })
    );

  const addFlowersCustomVariety = (pkgId: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const cur = p.flowers?.customVarieties || [];
        const nextFl = {
          ...(p.flowers || {}),
          customVarieties: [...cur, { name: '', price: undefined, image: undefined }],
        };
        return { ...p, flowers: nextFl };
      })
    );

  const updateFlowersCustomVariety = (pkgId: string, index: number, field: 'name' | 'price', value: any) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const list = [...(p.flowers?.customVarieties || [])];
        if (!list[index]) return p;
        list[index] = { ...list[index], [field]: field === 'price' ? (value === '' || value === undefined ? undefined : Number(value)) : value };
        const nextFl = { ...(p.flowers || {}), customVarieties: list };
        const calc = flowersTotal(nextFl);
        return { ...p, flowers: nextFl, price: calc > 0 ? calc : (p.price || 0) };
      })
    );

  const removeFlowersCustomVariety = (pkgId: string, index: number) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const list = (p.flowers?.customVarieties || []).filter((_, i) => i !== index);
        const nextFl = { ...(p.flowers || {}), customVarieties: list };
        const calc = flowersTotal(nextFl);
        return { ...p, flowers: nextFl, price: calc > 0 ? calc : (p.price || 0) };
      })
    );

  const toggleFlowersItem = (pkgId: string, item: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const current: string[] = p.flowers?.items || [];
        const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
        const nextFl = { ...(p.flowers || {}), items: next };
        const calc = flowersTotal(nextFl);
        return { ...p, flowers: nextFl, price: calc > 0 ? calc : (p.price || 0) };
      })
    );

  const updateFlowersItemPrice = (pkgId: string, item: string, price?: number) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const cur = p.flowers || {};
        const nextPrices = { ...(cur.itemPrices || {}) };
        if (price === undefined || isNaN(price)) {
          delete nextPrices[item];
        } else {
          nextPrices[item] = price;
        }
        const nextFl = { ...cur, itemPrices: nextPrices };
        const calc = flowersTotal(nextFl);
        return { ...p, flowers: nextFl, price: calc > 0 ? calc : (p.price || 0) };
      })
    );

  const addFlowersCustomItem = (pkgId: string) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const cur = p.flowers?.customItems || [];
        const nextFl = {
          ...(p.flowers || {}),
          customItems: [...cur, { name: '', price: undefined, image: undefined }],
        };
        return { ...p, flowers: nextFl };
      })
    );

  const updateFlowersCustomItem = (pkgId: string, index: number, field: 'name' | 'price', value: any) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const list = [...(p.flowers?.customItems || [])];
        if (!list[index]) return p;
        list[index] = { ...list[index], [field]: field === 'price' ? (value === '' || value === undefined ? undefined : Number(value)) : value };
        const nextFl = { ...(p.flowers || {}), customItems: list };
        const calc = flowersTotal(nextFl);
        return { ...p, flowers: nextFl, price: calc > 0 ? calc : (p.price || 0) };
      })
    );

  const removeFlowersCustomItem = (pkgId: string, index: number) =>
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== pkgId) return p;
        const list = (p.flowers?.customItems || []).filter((_, i) => i !== index);
        const nextFl = { ...(p.flowers || {}), customItems: list };
        const calc = flowersTotal(nextFl);
        return { ...p, flowers: nextFl, price: calc > 0 ? calc : (p.price || 0) };
      })
    );

  // Mehendi packages carry structured details.
  // Mehendi package total = every entered tier/intricacy/type price + the
  // artists / organic-henna / travel prices.
  const mehendiTotal = (m?: any): number => {
    if (!m) return 0;
    let sum = 0;
    const sumMap = (sel: string[] | undefined, prices: any) => {
      if (!Array.isArray(sel) || !prices) return;
      for (const k of sel) sum += Number(prices[k]) || 0;
    };
    sumMap(m.tiers, m.tierPrices);
    sumMap(m.intricacies, m.intricacyPrices);
    if (m.typePrices && typeof m.typePrices === 'object') {
      for (const v of Object.values(m.typePrices)) sum += Number(v) || 0;
    }
    sum += Number(m.artistsPrice) || 0;
    sum += Number(m.organicHennaPrice) || 0;
    sum += Number(m.travelPrice) || 0;
    return sum;
  };
  const commitMehendi = (pkgId: string, mehendi: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, mehendi, price: mehendiTotal(mehendi) } : p)));

  const updatePackageMehendi = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const mehendi = { ...(p.mehendi || {}), [field]: value };
      return { ...p, mehendi, price: mehendiTotal(mehendi) };
    }));

  // Toggle a chip in a Mehendi string[] field (tiers / intricacies).
  const toggleMehendiChip = (pkgId: string, field: 'tiers' | 'intricacies', value: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const cur: string[] = ((p.mehendi as any)?.[field]) || [];
      const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
      const mehendi = { ...(p.mehendi || {}), [field]: next };
      return { ...p, mehendi, price: mehendiTotal(mehendi) };
    }));

  // Set a price in a Mehendi price map (tierPrices / intricacyPrices / typePrices).
  const updateMehendiMapPrice = (pkgId: string, mapField: 'tierPrices' | 'intricacyPrices' | 'typePrices', key: string, price?: number) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const map: Record<string, number> = { ...(((p.mehendi as any)?.[mapField]) || {}) };
      if (price === undefined) delete map[key]; else map[key] = price;
      const mehendi = { ...(p.mehendi || {}), [mapField]: map };
      return { ...p, mehendi, price: mehendiTotal(mehendi) };
    }));

  const [uploadingMehendiImg, setUploadingMehendiImg] = useState<string | null>(null);
  const uploadMehendiImage = async (pkgId: string, target: 'tier' | 'intricacy', key: string, file: File) => {
    if (!token) return;
    setUploadingMehendiImg(`${pkgId}:${target}:${key}`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${GATEWAY_URL}/api/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json().catch(() => ({}));
      const fileUrl = data?.data?.fileUrl || data?.url || URL.createObjectURL(file);
      const mapField = target === 'tier' ? 'tierImages' : 'intricacyImages';
      setPackages((prev) => prev.map((p) => {
        if (p.id !== pkgId) return p;
        const cur = p.mehendi || {};
        return { ...p, mehendi: { ...cur, [mapField]: { ...((cur as any)[mapField] || {}), [key]: fileUrl } } };
      }));
    } catch { /* best effort */ } finally { setUploadingMehendiImg(null); }
  };
  const removeMehendiImage = (pkgId: string, target: 'tier' | 'intricacy', key: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const cur = p.mehendi || {};
      const mapField = target === 'tier' ? 'tierImages' : 'intricacyImages';
      const m = { ...((cur as any)[mapField] || {}) };
      delete m[key];
      return { ...p, mehendi: { ...cur, [mapField]: m } };
    }));

  // Event Host/Anchor packages carry structured details.
  const updatePackageEventHost = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, eventHost: { ...(p.eventHost || {}), [field]: value } } : p)));

  // Security packages carry structured details.
  // Security package total = every entered gender-staffing price + the facility
  // add-on prices (metal detectors / CCTV / VIP / crowd mgmt).
  const securityTotal = (s?: any): number => {
    if (!s) return 0;
    let sum = 0;
    if (Array.isArray(s.genders) && s.genderPrices) {
      for (const g of s.genders) sum += Number(s.genderPrices[g]) || 0;
    }
    sum += Number(s.metalDetectorsPrice) || 0;
    sum += Number(s.cctvPrice) || 0;
    sum += Number(s.vipProtectionPrice) || 0;
    sum += Number(s.crowdManagementPrice) || 0;
    return sum;
  };
  const updatePackageSecurity = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const security = { ...(p.security || {}), [field]: value };
      return { ...p, security, price: securityTotal(security) };
    }));
  // Toggle a gender chip in security.genders[].
  const toggleSecurityGender = (pkgId: string, g: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const cur: string[] = (p.security?.genders) || [];
      const next = cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g];
      const security = { ...(p.security || {}), genders: next };
      return { ...p, security, price: securityTotal(security) };
    }));
  // Set a name / price for one gender group.
  const updateSecurityGenderField = (pkgId: string, mapField: 'genderNames' | 'genderPrices', g: string, value: any) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const map: Record<string, any> = { ...(((p.security as any)?.[mapField]) || {}) };
      if (value === undefined || value === '') delete map[g]; else map[g] = value;
      const security = { ...(p.security || {}), [mapField]: map };
      return { ...p, security, price: securityTotal(security) };
    }));
  const [uploadingSecurityImg, setUploadingSecurityImg] = useState<string | null>(null);
  const uploadSecurityImage = async (pkgId: string, g: string, file: File) => {
    if (!token) return;
    setUploadingSecurityImg(`${pkgId}:${g}`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${GATEWAY_URL}/api/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json().catch(() => ({}));
      const fileUrl = data?.data?.fileUrl || data?.url || URL.createObjectURL(file);
      setPackages((prev) => prev.map((p) => {
        if (p.id !== pkgId) return p;
        const cur = p.security || {};
        return { ...p, security: { ...cur, genderImages: { ...((cur as any).genderImages || {}), [g]: fileUrl } } };
      }));
    } catch { /* best effort */ } finally { setUploadingSecurityImg(null); }
  };
  const removeSecurityImage = (pkgId: string, g: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const cur = p.security || {};
      const m = { ...((cur as any).genderImages || {}) };
      delete m[g];
      return { ...p, security: { ...cur, genderImages: m } };
    }));

  // Rental Equipment packages carry structured details.
  // Rental total = every selected item's price + the delivery price.
  const rentalTotal = (r?: any): number => {
    if (!r) return 0;
    let sum = 0;
    if (Array.isArray(r.items) && r.itemPrices) {
      for (const it of r.items) sum += Number(r.itemPrices[it]) || 0;
    }
    sum += Number(r.deliveryPrice) || 0;
    return sum;
  };
  const updatePackageRental = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const rental = { ...(p.rental || {}), [field]: value };
      return { ...p, rental, price: rentalTotal(rental) };
    }));
  const toggleRentalItem = (pkgId: string, item: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const current: string[] = (p.rental?.items) || [];
      const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
      const rental = { ...(p.rental || {}), items: next };
      return { ...p, rental, price: rentalTotal(rental) };
    }));
  const updateRentalItemField = (pkgId: string, mapField: 'itemQuantities' | 'itemPrices' | 'itemDetails', item: string, value: any) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const map: Record<string, any> = { ...(((p.rental as any)?.[mapField]) || {}) };
      if (value === undefined || value === '') delete map[item]; else map[item] = value;
      const rental = { ...(p.rental || {}), [mapField]: map };
      return { ...p, rental, price: rentalTotal(rental) };
    }));
  const [uploadingRentalImg, setUploadingRentalImg] = useState<string | null>(null);
  const uploadRentalImage = async (pkgId: string, item: string, file: File) => {
    if (!token) return;
    setUploadingRentalImg(`${pkgId}:${item}`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${GATEWAY_URL}/api/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json().catch(() => ({}));
      const fileUrl = data?.data?.fileUrl || data?.url || URL.createObjectURL(file);
      setPackages((prev) => prev.map((p) => {
        if (p.id !== pkgId) return p;
        const cur = p.rental || {};
        return { ...p, rental: { ...cur, itemImages: { ...((cur as any).itemImages || {}), [item]: fileUrl } } };
      }));
    } catch { /* best effort */ } finally { setUploadingRentalImg(null); }
  };
  const removeRentalImage = (pkgId: string, item: string) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const cur = p.rental || {};
      const m = { ...((cur as any).itemImages || {}) };
      delete m[item];
      return { ...p, rental: { ...cur, itemImages: m } };
    }));

  // Utensils for Rent packages carry structured details.
  // Total for a Utensils package = base price + sum of vessel type prices + delivery pickup price.
  const utensilsTotal = (u?: any): number => {
    if (!u) return 0;
    const base = Number(u.basePrice) || 0;
    const vesselPrices: number = Object.values(u.vesselTypePrices || {}).reduce<number>((a, b: any) => a + (Number(b) || 0), 0);
    const delivery = Number(u.deliveryPickupPrice) || 0;
    return base + vesselPrices + delivery;
  };
  const updatePackageUtensils = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const utensils = { ...(p.utensils || {}), [field]: value };
      const calcTotal = utensilsTotal(utensils);
      return { ...p, utensils, price: calcTotal > 0 ? calcTotal : (p.price || 0) };
    }));
  const updateUtensilsVesselPrice = (pkgId: string, type: string, value: number | undefined) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const prices: Record<string, number> = { ...(p.utensils?.vesselTypePrices || {}) };
      if (value === undefined) delete prices[type]; else prices[type] = value;
      const vesselTypes = Object.keys(prices);
      const utensils = { ...(p.utensils || {}), vesselTypePrices: prices, vesselTypes };
      const calcTotal = utensilsTotal(utensils);
      return { ...p, utensils, price: calcTotal > 0 ? calcTotal : (p.price || 0) };
    }));

  // Wedding Planner packages carry structured details.
  const updatePackageWeddingPlanner = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, weddingPlanner: { ...(p.weddingPlanner || {}), [field]: value } } : p)));
  // Corporate Event Services packages carry structured details.
  // Total for a Corporate package = base price / event-type price + all add-on prices.
  const corporateTotal = (c?: any): number => {
    if (!c) return 0;
    const base = Number(c.basePrice) || 0;
    const eventTypes = Object.values(c.eventTypePrices || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    const addons = [c.avStageBranding, c.registrationDesk, c.cateringCoordination, c.mcHost]
      .reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    return (base || eventTypes) + addons;
  };
  const updatePackageCorporate = (pkgId: string, field: string, value: any) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const corporate = { ...(p.corporate || {}), [field]: value };
      const calcTotal = corporateTotal(corporate);
      return { ...p, corporate, price: calcTotal > 0 ? calcTotal : (p.price || 0) };
    }));
  const updateCorporateEventPrice = (pkgId: string, type: string, value: number | undefined) =>
    setPackages((prev) => prev.map((p) => {
      if (p.id !== pkgId) return p;
      const prices: Record<string, number> = { ...(p.corporate?.eventTypePrices || {}) };
      if (value === undefined) delete prices[type]; else prices[type] = value;
      const corporate = { ...(p.corporate || {}), eventTypePrices: prices };
      const calcTotal = corporateTotal(corporate);
      return { ...p, corporate, price: calcTotal > 0 ? calcTotal : (p.price || 0) };
    }));
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
    // Ensure all Corporate Event Services packages have their total price calculated
    const cleaned = packages
      .map((p) => {
        if (myVendor.category === 'Corporate Event Services') {
          const calc = corporateTotal(p.corporate);
          return { ...p, price: calc > 0 ? calc : (p.price || 0) };
        }
        if (myVendor.category === 'Utensils for Rent') {
          const calc = utensilsTotal(p.utensils);
          return { ...p, price: calc > 0 ? calc : (p.price || 0) };
        }
        if (myVendor.category === 'Venue') {
          // Total amount = auto-sum of hall type/class + feature prices, unless
          // the vendor typed their own figure in the Total amount box.
          const calc = venueTotal(p.venue);
          return { ...p, price: p.price > 0 ? p.price : calc };
        }
        if (myVendor.category === 'Decoration') {
          // Total amount = auto-sum of theme/area/flower/mandap prices, unless
          // the vendor typed their own figure in the Total amount box.
          const calc = decorationTotal(p.decoration);
          return { ...p, price: p.price > 0 ? p.price : calc };
        }
        if (myVendor.category === 'Makeup & Beauty') {
          // Total amount = auto-sum of function-type + finish + hair style +
          // draping + travel + family prices, unless the vendor overrides it.
          const calc = makeupTotal(p.makeup);
          return { ...p, price: p.price > 0 ? p.price : calc };
        }
        if (myVendor.category === 'Media') {
          // Total amount = auto-sum of style + coverage + crew + album +
          // deliverable prices, unless the vendor overrides it.
          const calc = mediaTotal(p.media);
          return { ...p, price: p.price > 0 ? p.price : calc };
        }
        if (myVendor.category === 'Transport') {
          const calc = transportTotal(p.transport);
          return { ...p, price: p.price > 0 ? p.price : calc };
        }
        if (myVendor.category === 'Invitation') {
          const calc = invitationTotal(p.invitation);
          return { ...p, price: p.price > 0 ? p.price : calc };
        }
        if (myVendor.category === 'Printing') {
          const calc = printingTotal(p.printing);
          return { ...p, price: p.price > 0 ? p.price : calc };
        }
        if (myVendor.category === 'Return Gifts') {
          const calc = returnGiftsTotal(p.returnGifts);
          return { ...p, price: p.price > 0 ? p.price : calc };
        }
        if (myVendor.category === 'Lighting' || myVendor.category === 'Lights & Sounds') {
          const calc = lightingTotal(p.lighting);
          return { ...p, price: p.price > 0 ? p.price : calc };
        }
        if (myVendor.category === 'Catering') {
          const cleanedFoodItems: Record<string, any[]> = {};
          if (p.catering?.foodTypeItems) {
            for (const [ft, items] of Object.entries(p.catering.foodTypeItems)) {
              const valid = (items || []).filter((it: any) => it && it.name && it.name.trim());
              if (valid.length > 0) cleanedFoodItems[ft] = valid;
            }
          }
          const cleanedCuisineItems: Record<string, any[]> = {};
          if (p.catering?.cuisineItems) {
            for (const [c, items] of Object.entries(p.catering.cuisineItems)) {
              const valid = (items || []).filter((it: any) => it && it.name && it.name.trim());
              if (valid.length > 0) cleanedCuisineItems[c] = valid;
            }
          }
          const cleanedCourseItems: Record<string, any[]> = {};
          if (p.catering?.courseItems) {
            for (const [course, items] of Object.entries(p.catering.courseItems)) {
              const valid = (items || []).filter((it: any) => it && ((it.name && it.name.trim()) || it.photo));
              if (valid.length > 0) cleanedCourseItems[course] = valid;
            }
          }
          const cleanedLiveCounterItems: Record<string, any[]> = {};
          if (p.catering?.liveCounterItems) {
            for (const [counter, items] of Object.entries(p.catering.liveCounterItems)) {
              const valid = (items || []).filter((it: any) => it && ((it.name && it.name.trim()) || it.photo));
              if (valid.length > 0) cleanedLiveCounterItems[counter] = valid;
            }
          }
          const cleanedWelcomeDrinks = p.catering?.welcomeDrinks
            ? (p.catering?.welcomeDrinkItems || []).filter((it: any) => it && it.name && it.name.trim())
            : undefined;
          const cleanedFreeTastingItems = p.catering?.freeTasting
            ? (p.catering?.freeTastingItems || []).filter((it: any) => it && it.trim())
            : undefined;
          const nextCatering = {
            ...p.catering,
            pricePerPlate: undefined,
            foodTypeItems: cleanedFoodItems,
            cuisineItems: cleanedCuisineItems,
            courseItems: cleanedCourseItems,
            liveCounterItems: cleanedLiveCounterItems,
            welcomeDrinkItems: cleanedWelcomeDrinks,
            freeTastingItems: cleanedFreeTastingItems,
          };
          const calc = cateringTotal(nextCatering);
          const price = calc > 0 ? calc : (p.price || 0);
          return {
            ...p,
            price,
            pricePerPlate: undefined,
            catering: nextCatering,
          };
        }
        return p;
      })
      .filter((p) => p.packageName.trim() || p.price > 0);
    setSavingPackages(true);
    setPackagesNotice('');
    try {
      // Venue edits its event-services tiers here (no facilities tab), so
      // persist `facilities` alongside the halls for that category.
      const payload: any = myVendor.category === 'Venue'
        ? { packages: cleaned, facilities }
        : { packages: cleaned };
      const res = await updateVendor(token, myVendor.id, payload);
      if (res.data?.vendor) {
        setMyVendor(res.data.vendor);
        setPackages(res.data.vendor.packages || []);
        if (myVendor.category === 'Venue') setFacilities(res.data.vendor.facilities || {});
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
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#dcc589] to-[#b6893a] flex items-center justify-center font-bold text-slate-950 shadow-sm shadow-amber-900/20 ring-1 ring-amber-300/15">
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
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-[#dcc589] to-[#b6893a] flex items-center justify-center shadow-md shadow-amber-900/20 ring-2 ring-amber-400/10">
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
            // Venue's event-services live inside the Halls tab, so it has no
            // separate "Hall Facilities" tab.
            ...(myVendor?.category !== 'Venue' ? [{ key: 'facilities', label: facilitiesSectionLabel(myVendor?.category) }] : []),
            ...(myVendor?.category !== 'Wedding Planner' && myVendor?.category !== 'Event Host/Anchor' ? [{ key: 'packages', label: `${myVendor?.category === 'Venue' ? 'Halls' : 'Packages'}${packages.length ? ` (${packages.length})` : ''}` }] : []),
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
        {activeTab === 'packages' && myVendor?.category !== 'Wedding Planner' && (
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

            {/* Event services — a Venue-wide setting (not per-hall). Lives here
                in the Halls tab since Venue has no separate facilities tab. */}
            {myVendor?.category === 'Venue' && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <p className="text-xs font-bold text-amber-400 uppercase mb-3">Event services</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SERVICE_TIERS.map((s) => (
                    <div key={s.key} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
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
            )}

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

                  <div className={`grid grid-cols-1 ${myVendor?.category === 'Catering' || myVendor?.category === 'Decoration' || myVendor?.category === 'Transport' || myVendor?.category === 'Invitation' || myVendor?.category === 'Printing' || myVendor?.category === 'Return Gifts' || myVendor?.category === 'Lighting' || myVendor?.category === 'Lights & Sounds' ? 'sm:grid-cols-1' : myVendor?.category === 'Security' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] text-slate-400 uppercase font-bold">
                          {myVendor?.category === 'Catering' ? 'Total amount (₹)' : myVendor?.category === 'Security' ? 'Total amount (₹)' : myVendor?.category === 'Venue' ? 'Total amount (₹)' : myVendor?.category === 'Decoration' ? 'Total amount (₹)' : myVendor?.category === 'Makeup & Beauty' ? 'Total amount (₹)' : myVendor?.category === 'Media' ? 'Total amount (₹)' : myVendor?.category === 'Transport' ? 'Total amount (₹)' : myVendor?.category === 'Invitation' ? 'Total amount (₹)' : myVendor?.category === 'Printing' ? 'Total amount (₹)' : myVendor?.category === 'Return Gifts' ? 'Total amount (₹)' : myVendor?.category === 'Lighting' || myVendor?.category === 'Lights & Sounds' ? 'Total amount (₹)' : myVendor?.category === 'Pujari/Priest' ? 'Price per ceremony (₹)' : myVendor?.category === 'Entertainment' ? 'Total amount (₹)' : myVendor?.category === 'Music/DJ' ? 'Price per event / hour (₹)' : myVendor?.category === 'Flowers' ? 'Total amount (₹)' : myVendor?.category === 'Mehendi' ? 'Total amount (₹)' : myVendor?.category === 'Event Host/Anchor' ? 'Price per event (₹)' : myVendor?.category === 'Rental Equipment' ? 'Total amount (₹)' : myVendor?.category === 'Utensils for Rent' ? 'Total price (₹)' : myVendor?.category === 'Wedding Planner' ? 'Price per package / function (₹)' : myVendor?.category === 'Corporate Event Services' ? 'Price per total event (₹)' : 'Price (₹)'}
                        </label>
                        {myVendor?.category === 'Catering' && cateringTotal(p.catering) > 0 && (
                          <span className="text-[10px] text-amber-400 font-bold">
                            Sum: ₹{cateringTotal(p.catering).toLocaleString('en-IN')}
                          </span>
                        )}
                        {myVendor?.category === 'Venue' && venueTotal(p.venue) > 0 && (
                          <span className="text-[10px] text-amber-400 font-bold">
                            Sum: ₹{venueTotal(p.venue).toLocaleString('en-IN')}
                          </span>
                        )}
                        {myVendor?.category === 'Decoration' && decorationTotal(p.decoration) > 0 && (
                          <span className="text-[10px] text-amber-400 font-bold">
                            Sum: ₹{decorationTotal(p.decoration).toLocaleString('en-IN')}
                          </span>
                        )}
                        {myVendor?.category === 'Makeup & Beauty' && makeupTotal(p.makeup) > 0 && (
                          <span className="text-[10px] text-amber-400 font-bold">
                            Sum: ₹{makeupTotal(p.makeup).toLocaleString('en-IN')}
                          </span>
                        )}
                        {myVendor?.category === 'Media' && mediaTotal(p.media) > 0 && (
                          <span className="text-[10px] text-amber-400 font-bold">
                            Sum: ₹{mediaTotal(p.media).toLocaleString('en-IN')}
                          </span>
                        )}
                        {myVendor?.category === 'Transport' && transportTotal(p.transport) > 0 && (
                          <span className="text-[10px] text-amber-400 font-bold">
                            Sum: ₹{transportTotal(p.transport).toLocaleString('en-IN')}
                          </span>
                        )}
                        {myVendor?.category === 'Invitation' && invitationTotal(p.invitation) > 0 && (
                          <span className="text-[10px] text-amber-400 font-bold">
                            Sum: ₹{invitationTotal(p.invitation).toLocaleString('en-IN')}
                          </span>
                        )}
                        {myVendor?.category === 'Printing' && printingTotal(p.printing) > 0 && (
                          <span className="text-[10px] text-amber-400 font-bold">
                            Sum: ₹{printingTotal(p.printing).toLocaleString('en-IN')}
                          </span>
                        )}
                        {myVendor?.category === 'Return Gifts' && returnGiftsTotal(p.returnGifts) > 0 && (
                          <span className="text-[10px] text-amber-400 font-bold">
                            Sum: ₹{returnGiftsTotal(p.returnGifts).toLocaleString('en-IN')}
                          </span>
                        )}
                        {(myVendor?.category === 'Lighting' || myVendor?.category === 'Lights & Sounds') && lightingTotal(p.lighting) > 0 && (
                          <span className="text-[10px] text-amber-400 font-bold">
                            Sum: ₹{lightingTotal(p.lighting).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={p.price || (myVendor?.category === 'Catering' && cateringTotal(p.catering) > 0 ? cateringTotal(p.catering) : myVendor?.category === 'Venue' && venueTotal(p.venue) > 0 ? venueTotal(p.venue) : myVendor?.category === 'Decoration' && decorationTotal(p.decoration) > 0 ? decorationTotal(p.decoration) : myVendor?.category === 'Makeup & Beauty' && makeupTotal(p.makeup) > 0 ? makeupTotal(p.makeup) : myVendor?.category === 'Media' && mediaTotal(p.media) > 0 ? mediaTotal(p.media) : myVendor?.category === 'Transport' && transportTotal(p.transport) > 0 ? transportTotal(p.transport) : myVendor?.category === 'Invitation' && invitationTotal(p.invitation) > 0 ? invitationTotal(p.invitation) : myVendor?.category === 'Printing' && printingTotal(p.printing) > 0 ? printingTotal(p.printing) : myVendor?.category === 'Return Gifts' && returnGiftsTotal(p.returnGifts) > 0 ? returnGiftsTotal(p.returnGifts) : (myVendor?.category === 'Lighting' || myVendor?.category === 'Lights & Sounds') && lightingTotal(p.lighting) > 0 ? lightingTotal(p.lighting) : '')}
                        onChange={(e) => updatePackageField(p.id, 'price', e.target.value)}
                        placeholder={myVendor?.category === 'Catering' ? (cateringTotal(p.catering) ? String(cateringTotal(p.catering)) : 'e.g. 35000') : myVendor?.category === 'Transport' ? (transportTotal(p.transport) ? String(transportTotal(p.transport)) : 'e.g. 15000') : myVendor?.category === 'Invitation' ? (invitationTotal(p.invitation) ? String(invitationTotal(p.invitation)) : 'e.g. 12000') : myVendor?.category === 'Printing' ? (printingTotal(p.printing) ? String(printingTotal(p.printing)) : 'e.g. 8000') : myVendor?.category === 'Return Gifts' ? (returnGiftsTotal(p.returnGifts) ? String(returnGiftsTotal(p.returnGifts)) : 'e.g. 15000') : (myVendor?.category === 'Lighting' || myVendor?.category === 'Lights & Sounds') ? (lightingTotal(p.lighting) ? String(lightingTotal(p.lighting)) : 'e.g. 20000') : myVendor?.category === 'Security' ? '2000' : '150000'}
                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                      />
                      {myVendor?.category === 'Venue' && venueTotal(p.venue) > 0 && (
                        <div className="mt-1.5 text-[10px] text-slate-400">
                          <span>Auto-added from hall type, class &amp; features: <b className="text-amber-300">₹{venueTotal(p.venue).toLocaleString('en-IN')}</b>. Edit the box to override.</span>
                        </div>
                      )}
                      {myVendor?.category === 'Decoration' && decorationTotal(p.decoration) > 0 && (
                        <div className="mt-1.5 text-[10px] text-slate-400">
                          <span>Auto-added from themes, areas, flowers &amp; mandap: <b className="text-amber-300">₹{decorationTotal(p.decoration).toLocaleString('en-IN')}</b>. Edit the box to override.</span>
                        </div>
                      )}
                      {myVendor?.category === 'Makeup & Beauty' && makeupTotal(p.makeup) > 0 && (
                        <div className="mt-1.5 text-[10px] text-slate-400">
                          <span>Auto-added from function types, finish, hair style, draping, travel &amp; family: <b className="text-amber-300">₹{makeupTotal(p.makeup).toLocaleString('en-IN')}</b>. Edit the box to override.</span>
                        </div>
                      )}
                      {myVendor?.category === 'Media' && mediaTotal(p.media) > 0 && (
                        <div className="mt-1.5 text-[10px] text-slate-400">
                          <span>Auto-added from styles, coverage, crew, album &amp; add-ons: <b className="text-amber-300">₹{mediaTotal(p.media).toLocaleString('en-IN')}</b>. Edit the box to override.</span>
                        </div>
                      )}
                      {myVendor?.category === 'Transport' && transportTotal(p.transport) > 0 && (
                        <div className="mt-1.5 text-[10px] text-slate-400">
                          <span>Auto-added from vehicles, use, driver/fuel &amp; decoration: <b className="text-amber-300">₹{transportTotal(p.transport).toLocaleString('en-IN')}</b>. Edit the box to override.</span>
                        </div>
                      )}
                      {myVendor?.category === 'Invitation' && invitationTotal(p.invitation) > 0 && (
                        <div className="mt-1.5 text-[10px] text-slate-400">
                          <span>Auto-added from design, types, add-ons, languages &amp; print quantity: <b className="text-amber-300">₹{invitationTotal(p.invitation).toLocaleString('en-IN')}</b>. Edit the box to override.</span>
                        </div>
                      )}
                      {myVendor?.category === 'Printing' && printingTotal(p.printing) > 0 && (
                        <div className="mt-1.5 text-[10px] text-slate-400">
                          <span>Auto-added from products, materials &amp; design: <b className="text-amber-300">₹{printingTotal(p.printing).toLocaleString('en-IN')}</b>. Edit the box to override.</span>
                        </div>
                      )}
                      {myVendor?.category === 'Return Gifts' && returnGiftsTotal(p.returnGifts) > 0 && (
                        <div className="mt-1.5 text-[10px] text-slate-400">
                          <span>Auto-added from gift types, count, packaging &amp; customization: <b className="text-amber-300">₹{returnGiftsTotal(p.returnGifts).toLocaleString('en-IN')}</b>. Edit the box to override.</span>
                        </div>
                      )}
                      {(myVendor?.category === 'Lighting' || myVendor?.category === 'Lights & Sounds') && lightingTotal(p.lighting) > 0 && (
                        <div className="mt-1.5 text-[10px] text-slate-400">
                          <span>Auto-added from lighting types, area covered, power backup &amp; setup: <b className="text-amber-300">₹{lightingTotal(p.lighting).toLocaleString('en-IN')}</b>. Edit the box to override.</span>
                        </div>
                      )}
                      {myVendor?.category === 'Catering' && cateringTotal(p.catering) > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
                          <span>Auto-added from all items: <b className="text-amber-300">₹{cateringTotal(p.catering).toLocaleString('en-IN')}</b></span>
                          {p.catering?.minGuests && p.catering.minGuests > 1 && (
                            <button
                              type="button"
                              onClick={() => updatePackageField(p.id, 'price', String(cateringTotal(p.catering) * p.catering!.minGuests!))}
                              className="text-indigo-400 hover:text-indigo-300 underline font-semibold ml-1.5"
                            >
                              (Set for {p.catering.minGuests} guests = ₹{(cateringTotal(p.catering) * p.catering.minGuests).toLocaleString('en-IN')})
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {myVendor?.category !== 'Security' && myVendor?.category !== 'Catering' && myVendor?.category !== 'Decoration' && myVendor?.category !== 'Media' && myVendor?.category !== 'Transport' && myVendor?.category !== 'Invitation' && myVendor?.category !== 'Printing' && myVendor?.category !== 'Return Gifts' && myVendor?.category !== 'Music/DJ' && myVendor?.category !== 'Lighting' && myVendor?.category !== 'Lights & Sounds' && myVendor?.category !== 'Flowers' && myVendor?.category !== 'Mehendi' && myVendor?.category !== 'Event Host/Anchor' && myVendor?.category !== 'Rental Equipment' && myVendor?.category !== 'Utensils for Rent' && myVendor?.category !== 'Wedding Planner' && myVendor?.category !== 'Corporate Event Services' && myVendor?.category !== 'Entertainment' && (
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                          {myVendor?.category === 'Pujari/Priest' ? 'No. of persons' : 'Capacity (persons)'}
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
                    {myVendor?.category !== 'Security' && myVendor?.category !== 'Catering' && myVendor?.category !== 'Decoration' && myVendor?.category !== 'Media' && myVendor?.category !== 'Transport' && myVendor?.category !== 'Invitation' && myVendor?.category !== 'Printing' && myVendor?.category !== 'Return Gifts' && myVendor?.category !== 'Music/DJ' && myVendor?.category !== 'Lighting' && myVendor?.category !== 'Lights & Sounds' && myVendor?.category !== 'Flowers' && myVendor?.category !== 'Mehendi' && myVendor?.category !== 'Event Host/Anchor' && myVendor?.category !== 'Rental Equipment' && myVendor?.category !== 'Utensils for Rent' && myVendor?.category !== 'Wedding Planner' && myVendor?.category !== 'Corporate Event Services' && myVendor?.category !== 'Entertainment' && (
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
                    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-amber-400 uppercase font-bold">Security details &amp; Pricing</p>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Type</label>
                        <div className="flex flex-wrap gap-2">
                          {SECURITY_TYPES.map((t) => (
                            <button type="button" key={t} onClick={() => updatePackageSecurity(p.id, 'type', t)} className={catChip(p.security?.type === t)}>{t}</button>
                          ))}
                        </div>
                      </div>

                      {/* GENDER — select, then name + price + photo per staffing group */}
                      <div className="space-y-2">
                        <label className="block text-[10px] text-slate-400 uppercase font-bold">Gender (select to set name, price &amp; upload photo)</label>
                        <div className="flex flex-wrap gap-2">
                          {SECURITY_GENDERS.map((g) => (
                            <button type="button" key={g} onClick={() => toggleSecurityGender(p.id, g)} className={catChip((p.security?.genders || []).includes(g))}>{g}</button>
                          ))}
                        </div>
                        {(p.security?.genders || []).map((g) => {
                          const isUploading = uploadingSecurityImg === `${p.id}:${g}`;
                          const imgUrl = p.security?.genderImages?.[g];
                          return (
                            <div key={g} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-amber-300">{g}</span>
                                <button type="button" onClick={() => toggleSecurityGender(p.id, g)} className="text-slate-400 hover:text-rose-400 text-xs">✕ Remove</button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Name</label>
                                  <input type="text" value={p.security?.genderNames?.[g] ?? ''} onChange={(e) => updateSecurityGenderField(p.id, 'genderNames', g, e.target.value)} placeholder={`e.g. ${g} bouncers`} className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Price (₹)</label>
                                  <input type="number" min={0} value={p.security?.genderPrices?.[g] ?? ''} onChange={(e) => updateSecurityGenderField(p.id, 'genderPrices', g, e.target.value === '' ? undefined : Number(e.target.value))} placeholder="e.g. 2000" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-1">Upload photo</label>
                                <div className="flex items-center gap-2.5">
                                  {imgUrl ? (<div className="relative"><img src={imgUrl} alt={g} className="w-16 h-12 rounded-lg object-cover border border-slate-700" /><button type="button" onClick={() => removeSecurityImage(p.id, g)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px]">✕</button></div>) : null}
                                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700">
                                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-amber-400" />}
                                    {imgUrl ? 'Change photo' : 'Upload photo'}
                                    <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSecurityImage(p.id, g, f); e.target.value = ''; }} />
                                  </label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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

                      {/* Facility add-ons — price for each (blank if not offered) */}
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-2">Add-ons — price for each (leave blank if not offered)</label>
                        <div className="grid grid-cols-2 gap-2">
                          {([['metalDetectorsPrice', 'Metal detectors'], ['cctvPrice', 'CCTV'], ['vipProtectionPrice', 'VIP protection'], ['crowdManagementPrice', 'Gate / crowd mgmt']] as const).map(([field, label]) => (
                            <div key={field}>
                              <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                                <input type="number" min={0} value={(p.security as any)?.[field] ?? ''} onChange={(e) => updatePackageSecurity(p.id, field, e.target.value === '' ? undefined : Number(e.target.value))} placeholder="Price" className="w-full pl-6 pr-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                              </div>
                            </div>
                          ))}
                        </div>
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

                            {/* Food items & rate editor per selected food type */}
                            {(p.catering?.foodTypes || []).length > 0 && (
                              <div className="mt-3 space-y-3">
                                {CATERING_FOOD_TYPES.filter((f) => (p.catering?.foodTypes || []).includes(f)).map((f) => {
                                  const items = p.catering?.foodTypeItems?.[f] || [];
                                  const typeColor = f === 'Non-Veg' ? 'border-rose-500/30 bg-rose-950/20' : f === 'Jain' ? 'border-amber-500/30 bg-amber-950/20' : 'border-emerald-500/30 bg-emerald-950/20';
                                  const badgeColor = f === 'Non-Veg' ? 'text-rose-400' : f === 'Jain' ? 'text-amber-400' : 'text-emerald-400';
                                  const dotColor = f === 'Non-Veg' ? 'bg-rose-500' : f === 'Jain' ? 'bg-amber-400' : 'bg-emerald-500';

                                  return (
                                    <div key={f} className={`p-3 rounded-xl border ${typeColor} space-y-2.5`}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                                          <span className={`text-[11px] font-bold uppercase tracking-wide ${badgeColor}`}>{f} Items</span>
                                          {items.length > 0 && (
                                            <span className="text-[10px] text-slate-400">({items.length})</span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => addCateringFoodItem(p.id, f)}
                                          className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                                        >
                                          <Plus className="w-3.5 h-3.5" /> Add item
                                        </button>
                                      </div>

                                      {items.length === 0 ? (
                                        <div className="py-2.5 px-3 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 text-center">
                                          <p className="text-xs text-slate-400 mb-1.5">No {f.toLowerCase()} items added yet.</p>
                                          <button
                                            type="button"
                                            onClick={() => addCateringFoodItem(p.id, f)}
                                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold"
                                          >
                                            <Plus className="w-3.5 h-3.5" /> Add {f} item
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          {items.map((item, itemIdx) => (
                                            <div key={itemIdx} className="flex items-center gap-2">
                                              <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => updateCateringFoodItem(p.id, f, itemIdx, 'name', e.target.value)}
                                                placeholder={f === 'Non-Veg' ? 'Item name — e.g. Chicken Biryani' : f === 'Jain' ? 'Item name — e.g. Jain Dal Makhani' : 'Item name — e.g. Paneer Butter Masala'}
                                                className="flex-1 p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
                                              />
                                              <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                                <span className="text-slate-500 text-xs">₹</span>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  value={item.price === 0 ? '' : (item.price || '')}
                                                  onChange={(e) => updateCateringFoodItem(p.id, f, itemIdx, 'price', e.target.value)}
                                                  placeholder="Price"
                                                  className="w-20 py-2 bg-transparent text-white text-xs focus:outline-none"
                                                />
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => removeCateringFoodItem(p.id, f, itemIdx)}
                                                aria-label="Remove item"
                                                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center shrink-0"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Cuisine</label>
                            <div className="flex flex-wrap gap-2">
                              {CATERING_CUISINES.map((c) => (
                                <button type="button" key={c} onClick={() => toggleCateringOption(p.id, 'cuisines', c)} className={catChip((p.catering?.cuisines || []).includes(c))}>{c}</button>
                              ))}
                            </div>

                            {/* Cuisine items & rate editor per selected cuisine */}
                            {(p.catering?.cuisines || []).length > 0 && (
                              <div className="mt-3 space-y-3">
                                {CATERING_CUISINES.filter((c) => (p.catering?.cuisines || []).includes(c)).map((c) => {
                                  const items = p.catering?.cuisineItems?.[c] || [];
                                  const placeholder =
                                    c === 'South Indian' ? 'Item name — e.g. Masala Dosa, Idli Sambar, Medu Vada' :
                                    c === 'Chettinad' ? 'Item name — e.g. Chettinad Chicken, Kozhi Varuval, Pepper Mutton' :
                                    c === 'North Indian' ? 'Item name — e.g. Dal Makhani, Butter Naan, Paneer Tikka' :
                                    'Item name — e.g. Pasta Alfredo, Garlic Bread, Lasagna';

                                  return (
                                    <div key={c} className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-indigo-400" />
                                          <span className="text-[11px] font-bold uppercase tracking-wide text-indigo-300">{c} Items</span>
                                          {items.length > 0 && (
                                            <span className="text-[10px] text-slate-400">({items.length})</span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => addCateringCuisineItem(p.id, c)}
                                          className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                                        >
                                          <Plus className="w-3.5 h-3.5" /> Add item
                                        </button>
                                      </div>

                                      {items.length === 0 ? (
                                        <div className="py-2.5 px-3 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 text-center">
                                          <p className="text-xs text-slate-400 mb-1.5">No {c.toLowerCase()} items added yet.</p>
                                          <button
                                            type="button"
                                            onClick={() => addCateringCuisineItem(p.id, c)}
                                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-semibold"
                                          >
                                            <Plus className="w-3.5 h-3.5" /> Add {c} item
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          {items.map((item, itemIdx) => (
                                            <div key={itemIdx} className="flex items-center gap-2">
                                              <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => updateCateringCuisineItem(p.id, c, itemIdx, 'name', e.target.value)}
                                                placeholder={placeholder}
                                                className="flex-1 p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
                                              />
                                              <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                                <span className="text-slate-500 text-xs">₹</span>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  value={item.price === 0 ? '' : (item.price || '')}
                                                  onChange={(e) => updateCateringCuisineItem(p.id, c, itemIdx, 'price', e.target.value)}
                                                  placeholder="Price"
                                                  className="w-20 py-2 bg-transparent text-white text-xs focus:outline-none"
                                                />
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => removeCateringCuisineItem(p.id, c, itemIdx)}
                                                aria-label="Remove item"
                                                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center shrink-0"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Dishes & Courses</label>
                            <p className="text-[10px] text-slate-500 mb-2">Click Starters, Mains, or Desserts to add dishes with photos, item names, and prices.</p>

                            <div className="flex flex-wrap gap-2 mb-3">
                              {CATERING_COURSES.map((course) => {
                                const field = course.toLowerCase() as 'starters' | 'mains' | 'desserts';
                                const items = p.catering?.courseItems?.[course] || [];
                                const countVal = (p.catering as any)?.[field];
                                const isSelected = (p.catering?.courses || []).includes(course) || items.length > 0 || (countVal !== undefined && countVal > 0);
                                return (
                                  <button
                                    type="button"
                                    key={course}
                                    onClick={() => toggleCateringCourse(p.id, course)}
                                    className={catChip(isSelected)}
                                  >
                                    {course} {items.length > 0 ? `(${items.length})` : ''}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Course items editor for active courses */}
                            {CATERING_COURSES.map((course) => {
                              const field = course.toLowerCase() as 'starters' | 'mains' | 'desserts';
                              const items = p.catering?.courseItems?.[course] || [];
                              const countVal = (p.catering as any)?.[field];
                              const isSelected = (p.catering?.courses || []).includes(course) || items.length > 0 || (countVal !== undefined && countVal > 0);
                              if (!isSelected) return null;

                              const courseColor = course === 'Starters' ? 'border-amber-500/30 bg-amber-950/15' : course === 'Mains' ? 'border-emerald-500/30 bg-emerald-950/15' : 'border-purple-500/30 bg-purple-950/15';
                              const badgeColor = course === 'Starters' ? 'text-amber-400' : course === 'Mains' ? 'text-emerald-400' : 'text-purple-400';
                              const dotColor = course === 'Starters' ? 'bg-amber-400' : course === 'Mains' ? 'bg-emerald-400' : 'bg-purple-400';
                              const placeholder =
                                course === 'Starters' ? 'Starter dish — e.g. Paneer Tikka, Chicken 65, Spring Rolls' :
                                course === 'Mains' ? 'Main dish — e.g. Butter Chicken, Paneer Butter Masala, Veg Biryani' :
                                'Dessert dish — e.g. Gulab Jamun, Rasmalai, Ice Cream';

                              return (
                                <div key={course} className={`p-3 rounded-xl border ${courseColor} space-y-3 mb-3`}>
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                                      <span className={`text-[11px] font-bold uppercase tracking-wide ${badgeColor}`}>{course}</span>
                                      {items.length > 0 && (
                                        <span className="text-[10px] text-slate-400">({items.length} dishes)</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1.5">
                                        <label className="text-[10px] text-slate-400 whitespace-nowrap">Dishes included:</label>
                                        <input
                                          type="number"
                                          min={0}
                                          value={countVal ?? ''}
                                          onChange={(e) => updatePackageCatering(p.id, field, e.target.value === '' ? undefined : Number(e.target.value))}
                                          placeholder="e.g. 6"
                                          className="w-16 p-1 text-center rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => addCateringCourseItem(p.id, course)}
                                        className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                                      >
                                        <Plus className="w-3.5 h-3.5" /> Add {course.slice(0, -1)}
                                      </button>
                                    </div>
                                  </div>

                                  {items.length === 0 ? (
                                    <div className="py-2.5 px-3 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 text-center">
                                      <p className="text-xs text-slate-400 mb-1.5">No {course.toLowerCase()} added yet.</p>
                                      <button
                                        type="button"
                                        onClick={() => addCateringCourseItem(p.id, course)}
                                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold"
                                      >
                                        <Plus className="w-3.5 h-3.5" /> Add {course} item
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {items.map((item, itemIdx) => (
                                        <div key={itemIdx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
                                          {/* Photo upload / thumbnail */}
                                          <div className="shrink-0">
                                            {item.photo ? (
                                              <div className="relative h-9 w-9 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 group">
                                                <img src={item.photo} alt={item.name || 'Dish'} className="w-full h-full object-cover" />
                                                <button
                                                  type="button"
                                                  onClick={() => updateCateringCourseItem(p.id, course, itemIdx, 'photo', '')}
                                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 hover:text-rose-300 transition-opacity"
                                                  title="Remove photo"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            ) : (
                                              <label className="cursor-pointer flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 font-semibold shrink-0">
                                                {uploadingCoursePhoto === `${p.id}-${course}-${itemIdx}` ? (
                                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                                ) : (
                                                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                                                )}
                                                <span className="text-[10px]">Photo</span>
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  className="hidden"
                                                  disabled={uploadingCoursePhoto === `${p.id}-${course}-${itemIdx}`}
                                                  onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) handleCateringCoursePhotoUpload(p.id, course, itemIdx, f);
                                                    e.target.value = '';
                                                  }}
                                                />
                                              </label>
                                            )}
                                          </div>

                                          {/* Dish name */}
                                          <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => updateCateringCourseItem(p.id, course, itemIdx, 'name', e.target.value)}
                                            placeholder={placeholder}
                                            className="flex-1 min-w-[120px] p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                                          />

                                          {/* Price */}
                                          <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                                            <span className="text-slate-500 text-xs">₹</span>
                                            <input
                                              type="number"
                                              min={0}
                                              value={item.price === 0 ? '' : (item.price || '')}
                                              onChange={(e) => updateCateringCourseItem(p.id, course, itemIdx, 'price', e.target.value)}
                                              placeholder="Price"
                                              className="w-20 py-2 bg-transparent text-white text-xs focus:outline-none"
                                            />
                                          </div>

                                          {/* Remove */}
                                          <button
                                            type="button"
                                            onClick={() => removeCateringCourseItem(p.id, course, itemIdx)}
                                            aria-label="Remove item"
                                            className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center shrink-0"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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

                            {/* Live counter items & rate editor per selected counter */}
                            {(p.catering?.liveCounters || []).length > 0 && (
                              <div className="mt-3 space-y-3">
                                {CATERING_LIVE_COUNTERS.filter((lc) => (p.catering?.liveCounters || []).includes(lc)).map((lc) => {
                                  const items = p.catering?.liveCounterItems?.[lc] || [];
                                  const counterColor = lc === 'Chaat' ? 'border-amber-500/30 bg-amber-950/20' : 'border-cyan-500/30 bg-cyan-950/20';
                                  const badgeColor = lc === 'Chaat' ? 'text-amber-300' : 'text-cyan-300';
                                  const dotColor = lc === 'Chaat' ? 'bg-amber-400' : 'bg-cyan-400';
                                  const placeholder = lc === 'Chaat'
                                    ? 'Item name — e.g. Pani Puri, Sev Puri, Dahi Puri, Bhel Puri'
                                    : 'Item name — e.g. Belgian Chocolate, Vanilla, Butterscotch, Kulfi';

                                  return (
                                    <div key={lc} className={`p-3 rounded-xl border ${counterColor} space-y-2.5`}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                                          <span className={`text-[11px] font-bold uppercase tracking-wide ${badgeColor}`}>{lc} Live Counter Items</span>
                                          {items.length > 0 && (
                                            <span className="text-[10px] text-slate-400">({items.length})</span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => addCateringLiveCounterItem(p.id, lc)}
                                          className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                                        >
                                          <Plus className="w-3.5 h-3.5" /> Add item
                                        </button>
                                      </div>

                                      {items.length === 0 ? (
                                        <div className="py-2.5 px-3 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 text-center">
                                          <p className="text-xs text-slate-400 mb-1.5">No {lc.toLowerCase()} items added yet.</p>
                                          <button
                                            type="button"
                                            onClick={() => addCateringLiveCounterItem(p.id, lc)}
                                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold"
                                          >
                                            <Plus className="w-3.5 h-3.5" /> Add {lc} item
                                          </button>
                                        </div>
                                      ) : (
                                          <div className="space-y-2">
                                            {items.map((item, itemIdx) => (
                                              <div key={itemIdx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
                                                {/* Photo upload / thumbnail */}
                                                <div className="shrink-0">
                                                  {item.photo ? (
                                                    <div className="relative h-9 w-9 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 group">
                                                      <img src={item.photo} alt={item.name || 'Item'} className="w-full h-full object-cover" />
                                                      <button
                                                        type="button"
                                                        onClick={() => updateCateringLiveCounterItem(p.id, lc, itemIdx, 'photo', '')}
                                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 hover:text-rose-300 transition-opacity"
                                                        title="Remove photo"
                                                      >
                                                        <X className="w-3.5 h-3.5" />
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <label className="cursor-pointer flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 font-semibold shrink-0">
                                                      {uploadingLiveCounterPhoto === `${p.id}-${lc}-${itemIdx}` ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                                      ) : (
                                                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                                                      )}
                                                      <span className="text-[10px]">Photo</span>
                                                      <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        disabled={uploadingLiveCounterPhoto === `${p.id}-${lc}-${itemIdx}`}
                                                        onChange={(e) => {
                                                          const f = e.target.files?.[0];
                                                          if (f) handleCateringLiveCounterPhotoUpload(p.id, lc, itemIdx, f);
                                                          e.target.value = '';
                                                        }}
                                                      />
                                                    </label>
                                                  )}
                                                </div>

                                                <input
                                                  type="text"
                                                  value={item.name}
                                                  onChange={(e) => updateCateringLiveCounterItem(p.id, lc, itemIdx, 'name', e.target.value)}
                                                  placeholder={placeholder}
                                                  className="flex-1 min-w-[120px] p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                                                />
                                                <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                                                  <span className="text-slate-500 text-xs">₹</span>
                                                  <input
                                                    type="number"
                                                    min={0}
                                                    value={item.price === 0 ? '' : (item.price || '')}
                                                    onChange={(e) => updateCateringLiveCounterItem(p.id, lc, itemIdx, 'price', e.target.value)}
                                                    placeholder="Price"
                                                    className="w-20 py-2 bg-transparent text-white text-xs focus:outline-none"
                                                  />
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => removeCateringLiveCounterItem(p.id, lc, itemIdx)}
                                                  aria-label="Remove item"
                                                  className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center shrink-0"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Service Style</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {CATERING_SERVICE_STYLES.map((s) => (
                                <button
                                  type="button"
                                  key={s}
                                  onClick={() => updatePackageCatering(p.id, 'serviceStyle', p.catering?.serviceStyle === s ? undefined : s)}
                                  className={catChip(p.catering?.serviceStyle === s)}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                            <select
                              value={p.catering?.serviceStyle ?? ''}
                              onChange={(e) => updatePackageCatering(p.id, 'serviceStyle', e.target.value || undefined)}
                              className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                            >
                              <option value="">Select…</option>
                              {CATERING_SERVICE_STYLES.map((s) => (<option key={s} value={s}>{s}</option>))}
                            </select>

                            {/* When Buffet is selected: Plate Types */}
                            {p.catering?.serviceStyle === 'Buffet' && (
                              <div className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                                  <label className="block text-[11px] text-amber-300 uppercase font-bold tracking-wide">
                                    Plate Types for Buffet
                                  </label>
                                </div>
                                <p className="text-[10px] text-slate-400">Choose the plate options provided with the buffet service:</p>
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {BUFFET_PLATE_TYPES.map((pt) => {
                                    const isSelected = (p.catering?.plateTypes || []).includes(pt);
                                    return (
                                      <button
                                        type="button"
                                        key={pt}
                                        onClick={() => toggleCateringPlateType(p.id, pt)}
                                        className={catChip(isSelected)}
                                      >
                                        {pt}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* When Banana-leaf is selected: Leaf Type */}
                            {p.catering?.serviceStyle === 'Banana-leaf' && (
                              <div className="mt-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                  <label className="block text-[11px] text-emerald-300 uppercase font-bold tracking-wide">
                                    Banana Leaf Type
                                  </label>
                                </div>
                                <p className="text-[10px] text-slate-400">Choose the leaf option used for banana-leaf service:</p>
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {BANANA_LEAF_TYPES.map((lt) => {
                                    const isSelected = p.catering?.leafType === lt;
                                    return (
                                      <button
                                        type="button"
                                        key={lt}
                                        onClick={() => updatePackageCatering(p.id, 'leafType', p.catering?.leafType === lt ? undefined : lt)}
                                        className={catChip(isSelected)}
                                      >
                                        {lt}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            {/* Welcome Drinks */}
                            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <label className="block text-[10px] text-slate-400 uppercase font-bold">Welcome Drinks</label>
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updatePackageCatering(p.id, 'welcomeDrinks', true);
                                      if ((p.catering?.welcomeDrinkItems || []).length === 0) {
                                        addCateringWelcomeDrink(p.id);
                                      }
                                    }}
                                    className={catChip(p.catering?.welcomeDrinks === true)}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updatePackageCatering(p.id, 'welcomeDrinks', false)}
                                    className={catChip(p.catering?.welcomeDrinks === false)}
                                  >
                                    No
                                  </button>
                                </div>
                              </div>

                              {p.catering?.welcomeDrinks && (
                                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                                      Welcome Drink Options & Rates
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => addCateringWelcomeDrink(p.id)}
                                      className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Add drink
                                    </button>
                                  </div>

                                  <div className="space-y-2">
                                    {(p.catering?.welcomeDrinkItems || []).map((drink, dIdx) => (
                                      <div key={dIdx} className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={drink.name}
                                          onChange={(e) => updateCateringWelcomeDrink(p.id, dIdx, 'name', e.target.value)}
                                          placeholder="Drink name — e.g. Virgin Mojito, Badam Milk, Rose Milk, Fruit Punch"
                                          className="flex-1 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                                        />
                                        <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                                          <span className="text-slate-500 text-xs">₹</span>
                                          <input
                                            type="number"
                                            min={0}
                                            value={drink.price === 0 ? '' : (drink.price || '')}
                                            onChange={(e) => updateCateringWelcomeDrink(p.id, dIdx, 'price', e.target.value)}
                                            placeholder="Price"
                                            className="w-20 py-2 bg-transparent text-white text-xs focus:outline-none"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeCateringWelcomeDrink(p.id, dIdx)}
                                          aria-label="Remove drink"
                                          className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center shrink-0"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Free Tasting / Trial */}
                            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <label className="block text-[10px] text-slate-400 uppercase font-bold">Free Tasting / Trial</label>
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updatePackageCatering(p.id, 'freeTasting', true);
                                      if ((p.catering?.freeTastingItems || []).length === 0) {
                                        addCateringFreeTastingItem(p.id);
                                      }
                                    }}
                                    className={catChip(p.catering?.freeTasting === true)}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updatePackageCatering(p.id, 'freeTasting', false)}
                                    className={catChip(p.catering?.freeTasting === false)}
                                  >
                                    No
                                  </button>
                                </div>
                              </div>

                              {p.catering?.freeTasting && (
                                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">
                                      Available Items for Tasting
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => addCateringFreeTastingItem(p.id)}
                                      className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Add tasting item
                                    </button>
                                  </div>

                                  <div className="space-y-2">
                                    {(p.catering?.freeTastingItems || []).map((tItem, tIdx) => (
                                      <div key={tIdx} className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={tItem}
                                          onChange={(e) => updateCateringFreeTastingItem(p.id, tIdx, e.target.value)}
                                          placeholder="Item available for tasting — e.g. Chicken Biryani, Paneer Butter Masala, Gulab Jamun"
                                          className="flex-1 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeCateringFreeTastingItem(p.id, tIdx)}
                                          aria-label="Remove item"
                                          className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center shrink-0"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
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
                              {p.venue?.hallType && (
                                <div className="mt-2 flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                  <span className="text-slate-500 text-xs">₹</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.venue?.hallTypePrice ?? ''}
                                    onChange={(e) => updatePackageVenue(p.id, 'hallTypePrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder={`Price for ${p.venue.hallType}`}
                                    className="flex-1 py-2 bg-transparent text-white text-xs focus:outline-none"
                                  />
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Hall Class</label>
                              <div className="flex flex-wrap gap-2">
                                {VENUE_HALL_CLASSES.map((c) => (
                                  <button type="button" key={c} onClick={() => updatePackageVenue(p.id, 'hallClass', c)} className={catChip(p.venue?.hallClass === c)}>{c}</button>
                                ))}
                              </div>
                              {p.venue?.hallClass && (
                                <div className="mt-2 flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                  <span className="text-slate-500 text-xs">₹</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.venue?.hallClassPrice ?? ''}
                                    onChange={(e) => updatePackageVenue(p.id, 'hallClassPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder={`Price for ${p.venue.hallClass}`}
                                    className="flex-1 py-2 bg-transparent text-white text-xs focus:outline-none"
                                  />
                                </div>
                              )}
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
                              {p.venue?.cateringPolicy && (
                                <div className="mt-2 flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                  <span className="text-slate-500 text-xs">₹</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.venue?.cateringPrice ?? ''}
                                    onChange={(e) => updatePackageVenue(p.id, 'cateringPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="Catering price (optional)"
                                    className="flex-1 py-2 bg-transparent text-white text-xs focus:outline-none"
                                  />
                                </div>
                              )}
                              {p.venue?.cateringPolicy && (
                                <div className="mt-2 flex items-center gap-2">
                                  {p.venue?.cateringImage && (
                                    <div className="relative">
                                      <img src={p.venue.cateringImage} alt="Catering" className="w-12 h-12 rounded-lg object-cover border border-slate-800" />
                                      <button type="button" onClick={() => removeVenueImage(p.id, 'catering')}
                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-800 text-slate-300 hover:text-rose-400 flex items-center justify-center" aria-label="Remove image">
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}
                                  <label className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-[11px] font-bold cursor-pointer transition-colors">
                                    {uploadingVenueImg === `${p.id}:catering` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                    {p.venue.cateringPolicy === 'In-house only'
                                      ? (p.venue?.cateringImage ? 'Replace menu' : 'Upload menu')
                                      : (p.venue?.cateringImage ? 'Replace image' : 'Upload image')}
                                    <input type="file" accept="image/*" className="hidden" disabled={!!uploadingVenueImg}
                                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVenueImage(p.id, 'catering', f); e.target.value = ''; }} />
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {VENUE_FEATURES.map(([field, label]) => (
                              <div key={field} className="rounded-lg border border-slate-800/70 bg-slate-950/30 p-2">
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageVenue(p.id, field, true)} className={catChip((p.venue as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageVenue(p.id, field, false)} className={catChip((p.venue as any)?.[field] === false)}>No</button>
                                </div>
                                {(p.venue as any)?.[field] === true && (
                                  <div className="mt-2 space-y-2">
                                    <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                      <span className="text-slate-500 text-xs">₹</span>
                                      <input
                                        type="number"
                                        min={0}
                                        value={p.venue?.featurePrices?.[field] ?? ''}
                                        onChange={(e) => setVenueFeaturePrice(p.id, field, e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder="Price (optional)"
                                        className="flex-1 py-1.5 bg-transparent text-white text-xs focus:outline-none"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {p.venue?.featureImages?.[field] && (
                                        <div className="relative">
                                          <img src={p.venue.featureImages[field]} alt={label} className="w-10 h-10 rounded-lg object-cover border border-slate-800" />
                                          <button type="button" onClick={() => removeVenueImage(p.id, field)}
                                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-800 text-slate-300 hover:text-rose-400 flex items-center justify-center" aria-label="Remove image">
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}
                                      <label className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-[11px] font-bold cursor-pointer transition-colors">
                                        {uploadingVenueImg === `${p.id}:${field}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                        {p.venue?.featureImages?.[field] ? 'Replace' : 'Upload image'}
                                        <input type="file" accept="image/*" className="hidden" disabled={!!uploadingVenueImg}
                                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVenueImage(p.id, field, f); e.target.value = ''; }} />
                                      </label>
                                    </div>
                                  </div>
                                )}
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
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Theme <span className="text-slate-500 normal-case font-normal">— select, then set price / image</span></label>
                            <div className="flex flex-wrap gap-2">
                              {DECORATION_THEMES.map((t) => (
                                <button type="button" key={t} onClick={() => toggleDecorationOption(p.id, 'themes', t)} className={catChip((p.decoration?.themes || []).includes(t))}>{t}</button>
                              ))}
                            </div>
                            {(p.decoration?.themes || []).length > 0 && (
                              <div className="mt-2 space-y-2">
                                {(p.decoration?.themes || []).map((t) => renderDecorPricedRow(p, 'theme', t))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Areas covered <span className="text-slate-500 normal-case font-normal">— select, then set price / image</span></label>
                            <div className="flex flex-wrap gap-2">
                              {DECORATION_AREAS.map((a) => (
                                <button type="button" key={a} onClick={() => toggleDecorationOption(p.id, 'areas', a)} className={catChip((p.decoration?.areas || []).includes(a))}>{a}</button>
                              ))}
                            </div>
                            {(p.decoration?.areas || []).length > 0 && (
                              <div className="mt-2 space-y-2">
                                {(p.decoration?.areas || []).map((a) => renderDecorPricedRow(p, 'area', a))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Flowers</label>
                            <div className="flex flex-wrap gap-2">
                              {DECORATION_FLOWER_TYPES.map((f) => (
                                <button type="button" key={f} onClick={() => updatePackageDecoration(p.id, 'flowers', f)} className={catChip(p.decoration?.flowers === f)}>{f}</button>
                              ))}
                            </div>
                            {p.decoration?.flowers && (
                              <div className="mt-2">
                                {renderDecorPricedRow(p, 'flower', p.decoration.flowers)}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Mandap type</label>
                            <input type="text" value={p.decoration?.mandapType ?? ''} onChange={(e) => updatePackageDecoration(p.id, 'mandapType', e.target.value)}
                              placeholder="e.g. Traditional wooden" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                <span className="text-slate-500 text-xs">₹</span>
                                <input type="number" min={0} value={p.decoration?.mandapPrice ?? ''} onChange={(e) => updatePackageDecoration(p.id, 'mandapPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="Mandap price" className="w-28 py-2 bg-transparent text-white text-xs focus:outline-none" />
                              </div>
                              {p.decoration?.mandapImage && (
                                <div className="relative">
                                  <img src={p.decoration.mandapImage} alt="Mandap" className="w-10 h-10 rounded-lg object-cover border border-slate-800" />
                                  <button type="button" onClick={() => removeDecorImage(p.id, 'mandap:')}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-800 text-slate-300 hover:text-rose-400 flex items-center justify-center" aria-label="Remove image">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                              <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-[11px] font-bold cursor-pointer transition-colors">
                                {uploadingDecorImg === `${p.id}:mandap:` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                {p.decoration?.mandapImage ? 'Replace' : 'Upload'}
                                <input type="file" accept="image/*" className="hidden" disabled={!!uploadingDecorImg}
                                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDecorImage(p.id, 'mandap:', f); e.target.value = ''; }} />
                              </label>
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
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Function type <span className="text-slate-500 normal-case font-normal">— select, then set price / image</span></label>
                            <div className="flex flex-wrap gap-2">
                              {MAKEUP_TYPES.map((t) => (
                                <button type="button" key={t} onClick={() => toggleMakeupType(p.id, t)} className={catChip((p.makeup?.makeupTypes || []).includes(t))}>{t}</button>
                              ))}
                            </div>
                            {(p.makeup?.makeupTypes || []).length > 0 && (
                              <div className="mt-2 space-y-2">
                                {(p.makeup?.makeupTypes || []).map((t) => {
                                  const price = p.makeup?.makeupTypePrices?.[t];
                                  const img = p.makeup?.makeupTypeImages?.[t];
                                  return (
                                    <div key={t} className="flex items-center gap-2 flex-wrap rounded-lg border border-slate-800/70 bg-slate-950/30 p-2">
                                      <span className="text-[11px] font-bold text-amber-300 min-w-[80px]">{t}</span>
                                      <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                        <span className="text-slate-500 text-xs">₹</span>
                                        <input type="number" min={0} value={price ?? ''} onChange={(e) => setMakeupTypePrice(p.id, t, e.target.value === '' ? undefined : Number(e.target.value))}
                                          placeholder="Price" className="w-20 py-1.5 bg-transparent text-white text-xs focus:outline-none" />
                                      </div>
                                      {img && (
                                        <div className="relative">
                                          <img src={img} alt={t} className="w-10 h-10 rounded-lg object-cover border border-slate-800" />
                                          <button type="button" onClick={() => removeMakeupTypeImage(p.id, t)}
                                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-800 text-slate-300 hover:text-rose-400 flex items-center justify-center" aria-label="Remove image">
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}
                                      <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-[11px] font-bold cursor-pointer transition-colors">
                                        {uploadingMakeupImg === `${p.id}:${t}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                        {img ? 'Replace' : 'Upload'}
                                        <input type="file" accept="image/*" className="hidden" disabled={!!uploadingMakeupImg}
                                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMakeupTypeImage(p.id, t, f); e.target.value = ''; }} />
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Finish / Tier</label>
                            <div className="flex flex-wrap gap-2">
                              {MAKEUP_FINISHES.map((f) => (
                                <button type="button" key={f} onClick={() => updatePackageMakeup(p.id, 'finish', f)} className={catChip(p.makeup?.finish === f)}>{f}</button>
                              ))}
                            </div>
                            {p.makeup?.finish && (
                              <div className="mt-2 flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800 max-w-[240px]">
                                <span className="text-slate-500 text-xs">₹</span>
                                <input type="number" min={0} value={p.makeup?.finishPrice ?? ''} onChange={(e) => updatePackageMakeup(p.id, 'finishPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder={`Price for ${p.makeup.finish}`} className="flex-1 py-2 bg-transparent text-white text-xs focus:outline-none" />
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Extra family members covered</label>
                              <input type="number" min={0} value={p.makeup?.extraFamilyMembers ?? ''} onChange={(e) => updatePackageMakeup(p.id, 'extraFamilyMembers', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 2" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Extra family members price</label>
                              <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                <span className="text-slate-500 text-xs">₹</span>
                                <input type="number" min={0} value={p.makeup?.extraFamilyPrice ?? ''} onChange={(e) => updatePackageMakeup(p.id, 'extraFamilyPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="Price" className="flex-1 py-2 bg-transparent text-white text-xs focus:outline-none" />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Hair style name</label>
                              <input type="text" value={p.makeup?.hairstyleName ?? ''} onChange={(e) => updatePackageMakeup(p.id, 'hairstyleName', e.target.value)}
                                placeholder="e.g. Bridal bun" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Hair style price</label>
                              <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                <span className="text-slate-500 text-xs">₹</span>
                                <input type="number" min={0} value={p.makeup?.hairstylePrice ?? ''} onChange={(e) => updatePackageMakeup(p.id, 'hairstylePrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="Price" className="flex-1 py-2 bg-transparent text-white text-xs focus:outline-none" />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {([['draping', 'Saree / dupatta draping', 'drapingPrice'], ['trialSession', 'Trial session included', ''], ['travelToVenue', 'Travel to venue', 'travelPrice']] as const).map(([field, label, priceField]) => (
                              <div key={field} className="rounded-lg border border-slate-800/70 bg-slate-950/30 p-2">
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageMakeup(p.id, field, true)} className={catChip((p.makeup as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageMakeup(p.id, field, false)} className={catChip((p.makeup as any)?.[field] === false)}>No</button>
                                </div>
                                {priceField && (p.makeup as any)?.[field] === true && (
                                  <div className="mt-2 flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                    <span className="text-slate-500 text-xs">₹</span>
                                    <input type="number" min={0} value={(p.makeup as any)?.[priceField] ?? ''} onChange={(e) => updatePackageMakeup(p.id, priceField, e.target.value === '' ? undefined : Number(e.target.value))}
                                      placeholder="Price" className="flex-1 py-1.5 bg-transparent text-white text-xs focus:outline-none" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Media: structured spec (replaces capacity + generic price tiers). */}
                      {myVendor?.category === 'Media' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[10px] text-amber-400 uppercase font-bold">Media details</p>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tier</label>
                            <div className="flex flex-wrap gap-2">
                              {MEDIA_TIERS.map((t) => (
                                <button type="button" key={t} onClick={() => updatePackageMedia(p.id, 'tier', t)} className={catChip(p.media?.tier === t)}>{t}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Style <span className="text-slate-500 normal-case font-normal">— select, then set price / image</span></label>
                            <div className="flex flex-wrap gap-2">
                              {MEDIA_STYLES.map((s) => (
                                <button type="button" key={s} onClick={() => toggleMediaStyle(p.id, s)} className={catChip((p.media?.styles || []).includes(s))}>{s}</button>
                              ))}
                            </div>
                            {(p.media?.styles || []).length > 0 && (
                              <div className="mt-2 space-y-2">
                                {(p.media?.styles || []).map((s) => {
                                  const price = p.media?.stylePrices?.[s];
                                  const img = p.media?.styleImages?.[s];
                                  return (
                                    <div key={s} className="flex items-center gap-2 flex-wrap rounded-lg border border-slate-800/70 bg-slate-950/30 p-2">
                                      <span className="text-[11px] font-bold text-amber-300 min-w-[80px]">{s}</span>
                                      <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                        <span className="text-slate-500 text-xs">₹</span>
                                        <input type="number" min={0} value={price ?? ''} onChange={(e) => setMediaMapValue(p.id, 'stylePrices', s, e.target.value === '' ? undefined : Number(e.target.value))}
                                          placeholder="Price" className="w-20 py-1.5 bg-transparent text-white text-xs focus:outline-none" />
                                      </div>
                                      {img && (
                                        <div className="relative">
                                          <img src={img} alt={s} className="w-10 h-10 rounded-lg object-cover border border-slate-800" />
                                          <button type="button" onClick={() => removeMediaImage(p.id, `style:${s}`)}
                                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-800 text-slate-300 hover:text-rose-400 flex items-center justify-center" aria-label="Remove image">
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}
                                      <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-[11px] font-bold cursor-pointer transition-colors">
                                        {uploadingMediaImg === `${p.id}:style:${s}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                        {img ? 'Replace' : 'Upload'}
                                        <input type="file" accept="image/*" className="hidden" disabled={!!uploadingMediaImg}
                                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMediaImage(p.id, `style:${s}`, f); e.target.value = ''; }} />
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Coverage</label>
                            <div className="flex flex-wrap gap-2">
                              {MEDIA_COVERAGE.map((c) => (
                                <button type="button" key={c} onClick={() => updatePackageMedia(p.id, 'coverage', c)} className={catChip(p.media?.coverage === c)}>{c}</button>
                              ))}
                            </div>
                            {p.media?.coverage && (
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                  <span className="text-slate-500 text-xs">₹</span>
                                  <input type="number" min={0} value={p.media?.coveragePrice ?? ''} onChange={(e) => updatePackageMedia(p.id, 'coveragePrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="Price" className="flex-1 py-2 bg-transparent text-white text-xs focus:outline-none" />
                                </div>
                                <input type="text" value={p.media?.coverageSize ?? ''} onChange={(e) => updatePackageMedia(p.id, 'coverageSize', e.target.value)}
                                  placeholder="Size — e.g. 1080p / A4" className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs" />
                                <input type="text" value={p.media?.coverageQuality ?? ''} onChange={(e) => updatePackageMedia(p.id, 'coverageQuality', e.target.value)}
                                  placeholder="Quality — e.g. HD / 4K" className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs" />
                                <div className="flex items-center gap-2">
                                  {p.media?.coverageImage && (
                                    <div className="relative">
                                      <img src={p.media.coverageImage} alt="Coverage" className="w-10 h-10 rounded-lg object-cover border border-slate-800" />
                                      <button type="button" onClick={() => removeMediaImage(p.id, 'coverage')}
                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-800 text-slate-300 hover:text-rose-400 flex items-center justify-center" aria-label="Remove image">
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}
                                  <label className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-[11px] font-bold cursor-pointer transition-colors">
                                    {uploadingMediaImg === `${p.id}:coverage` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                    {p.media?.coverageImage ? 'Replace' : 'Upload'}
                                    <input type="file" accept="image/*" className="hidden" disabled={!!uploadingMediaImg}
                                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMediaImage(p.id, 'coverage', f); e.target.value = ''; }} />
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {([['daysOrEvents', 'Days / events', 'daysPrice'], ['crewCount', 'Crew (photographers / cinematographers)', 'crewPrice'], ['hoursCoverage', 'Total hours of coverage', 'hoursPrice']] as const).map(([field, label, priceField]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
                                <input type="number" min={0} value={(p.media as any)?.[field] ?? ''} onChange={(e) => updatePackageMedia(p.id, field, e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="0" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                <div className="mt-1 flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                  <span className="text-slate-500 text-xs">₹</span>
                                  <input type="number" min={0} value={(p.media as any)?.[priceField] ?? ''} onChange={(e) => updatePackageMedia(p.id, priceField, e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="Price" className="flex-1 py-1.5 bg-transparent text-white text-xs focus:outline-none" />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Deliverables</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Album type</label>
                                <input type="text" value={p.media?.albumType ?? ''} onChange={(e) => updatePackageMedia(p.id, 'albumType', e.target.value)}
                                  placeholder="e.g. Leather hardcover" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                <div className="mt-1 flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                  <span className="text-slate-500 text-xs">₹</span>
                                  <input type="number" min={0} value={p.media?.albumTypePrice ?? ''} onChange={(e) => updatePackageMedia(p.id, 'albumTypePrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="Album type price" className="flex-1 py-1.5 bg-transparent text-white text-xs focus:outline-none" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Photo frame</label>
                                <input type="text" value={p.media?.photoFrameSize ?? ''} onChange={(e) => updatePackageMedia(p.id, 'photoFrameSize', e.target.value)}
                                  placeholder="Size — e.g. 12x18 in" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                <div className="mt-1 flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                  <span className="text-slate-500 text-xs">₹</span>
                                  <input type="number" min={0} value={p.media?.photoFramePrice ?? ''} onChange={(e) => updatePackageMedia(p.id, 'photoFramePrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="Photo frame price" className="flex-1 py-1.5 bg-transparent text-white text-xs focus:outline-none" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Album pages</label>
                                <input type="number" min={0} value={p.media?.albumPages ?? ''} onChange={(e) => updatePackageMedia(p.id, 'albumPages', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="e.g. 30" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                <div className="mt-1 flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                  <span className="text-slate-500 text-xs">₹</span>
                                  <input type="number" min={0} value={p.media?.albumPagesPrice ?? ''} onChange={(e) => updatePackageMedia(p.id, 'albumPagesPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="Album pages price" className="flex-1 py-1.5 bg-transparent text-white text-xs focus:outline-none" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Edited photos count</label>
                                <input type="number" min={0} value={p.media?.editedPhotos ?? ''} onChange={(e) => updatePackageMedia(p.id, 'editedPhotos', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="e.g. 300" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {([['preWedding', 'Pre-wedding shoot'], ['drone', 'Drone'], ['teaser', 'Teaser'], ['film4k', '4K film']] as const).map(([field, label]) => (
                              <div key={field} className="rounded-lg border border-slate-800/70 bg-slate-950/30 p-2">
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</label>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePackageMedia(p.id, field, true)} className={catChip((p.media as any)?.[field] === true)}>Yes</button>
                                  <button type="button" onClick={() => updatePackageMedia(p.id, field, false)} className={catChip((p.media as any)?.[field] === false)}>No</button>
                                </div>
                                {(p.media as any)?.[field] === true && (
                                  <div className="mt-2 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                                        <span className="text-slate-500 text-xs">₹</span>
                                        <input type="number" min={0} value={p.media?.featurePrices?.[field] ?? ''} onChange={(e) => setMediaMapValue(p.id, 'featurePrices', field, e.target.value === '' ? undefined : Number(e.target.value))}
                                          placeholder="Price" className="w-20 py-1.5 bg-transparent text-white text-xs focus:outline-none" />
                                      </div>
                                      <input type="text" value={p.media?.featureQuality?.[field] ?? ''} onChange={(e) => setMediaMapValue(p.id, 'featureQuality', field, e.target.value)}
                                        placeholder="Quality" className="flex-1 min-w-[90px] p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {p.media?.featureImages?.[field] && (
                                        <div className="relative">
                                          <img src={p.media.featureImages[field]} alt={label} className="w-10 h-10 rounded-lg object-cover border border-slate-800" />
                                          <button type="button" onClick={() => removeMediaImage(p.id, `feature:${field}`)}
                                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-800 text-slate-300 hover:text-rose-400 flex items-center justify-center" aria-label="Remove image">
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}
                                      <label className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-[11px] font-bold cursor-pointer transition-colors">
                                        {uploadingMediaImg === `${p.id}:feature:${field}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                        {p.media?.featureImages?.[field] ? 'Replace' : 'Upload image'}
                                        <input type="file" accept="image/*" className="hidden" disabled={!!uploadingMediaImg}
                                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMediaImage(p.id, `feature:${field}`, f); e.target.value = ''; }} />
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Transport: structured spec (replaces capacity + generic price tiers). */}
                      {myVendor?.category === 'Transport' && (
                        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
                              <Car className="w-3.5 h-3.5" /> Vehicle &amp; Trip Details
                            </p>
                          </div>

                          {/* 1. Tier and Pricing Basis (Per day / Per km) with price options */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tier</label>
                              <div className="flex flex-wrap gap-2">
                                {TRANSPORT_TIERS.map((t) => (
                                  <button
                                    type="button"
                                    key={t}
                                    onClick={() => updatePackageTransport(p.id, 'tier', t)}
                                    className={catChip(p.transport?.tier === t)}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Priced</label>
                              <div className="flex flex-wrap gap-2">
                                {TRANSPORT_PRICING_BASIS.map((b) => (
                                  <button
                                    type="button"
                                    key={b}
                                    onClick={() => updatePackageTransport(p.id, 'pricingBasis', p.transport?.pricingBasis === b ? undefined : b)}
                                    className={catChip(p.transport?.pricingBasis === b)}
                                  >
                                    {b}
                                  </button>
                                ))}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                {(p.transport?.pricingBasis === 'Per day' || p.transport?.perDayPrice) && (
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Per day rate (₹)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.transport?.perDayPrice ?? ''}
                                      onChange={(e) => updatePackageTransport(p.id, 'perDayPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                      placeholder="e.g. 5000"
                                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                    />
                                  </div>
                                )}
                                {(p.transport?.pricingBasis === 'Per km' || p.transport?.perKmPrice) && (
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Per km rate (₹)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.transport?.perKmPrice ?? ''}
                                      onChange={(e) => updatePackageTransport(p.id, 'perKmPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                      placeholder="e.g. 18"
                                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 2. Vehicle Types (Car, SUV, Tempo Traveller, Bus, Decorated car) with seats, price, and image */}
                          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                                Vehicle Type (Select cars to configure seats, price &amp; photos)
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {TRANSPORT_VEHICLE_TYPES.map((v) => {
                                  const isSelected = (p.transport?.vehicleTypes || (p.transport?.vehicleType ? [p.transport.vehicleType] : [])).includes(v);
                                  return (
                                    <button
                                      type="button"
                                      key={v}
                                      onClick={() => toggleTransportVehicleType(p.id, v)}
                                      className={catChip(isSelected)}
                                    >
                                      {v}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Individual Vehicle Type Configurations */}
                            {((p.transport?.vehicleTypes && p.transport.vehicleTypes.length > 0)
                              ? p.transport.vehicleTypes
                              : (p.transport?.vehicleType ? [p.transport.vehicleType] : [])
                            ).map((v) => {
                              const seats = p.transport?.vehicleTypeSeats?.[v];
                              const price = p.transport?.vehicleTypePrices?.[v];
                              const imgUrl = p.transport?.vehicleTypeImages?.[v];
                              const uploadKey = `${p.id}:vehicle:${v}`;
                              const isUploading = uploadingTransportImg === uploadKey;

                              return (
                                <div key={v} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                      <Car className="w-3.5 h-3.5" /> {v}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleTransportVehicleType(p.id, v)}
                                      className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1"
                                    >
                                      ✕ Remove
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">
                                        How many seats in {v}
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={seats ?? ''}
                                        onChange={(e) => updateTransportVehicleSeat(p.id, v, e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder={v === 'Bus' ? 'e.g. 40' : v === 'Tempo Traveller' ? 'e.g. 14' : v === 'SUV' ? 'e.g. 7' : 'e.g. 4'}
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                                        Price for {v} (₹)
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={price ?? ''}
                                        onChange={(e) => updateTransportVehiclePrice(p.id, v, e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder="e.g. 3500"
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1">Image of {v}</label>
                                    <div className="flex items-center gap-2.5">
                                      {imgUrl ? (
                                        <div className="relative group">
                                          <img src={imgUrl} alt={v} className="w-16 h-12 rounded-lg object-cover border border-slate-700" />
                                          <button
                                            type="button"
                                            onClick={() => removeTransportImage(p.id, `vehicle:${v}`)}
                                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : null}
                                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors">
                                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                        {imgUrl ? 'Change photo' : `Upload ${v} photo`}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          disabled={isUploading}
                                          onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) uploadTransportImage(p.id, `vehicle:${v}`, f);
                                            e.target.value = '';
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* 3. Use (Baraat, Guests, Couple) with hours, persons, and price options */}
                          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Use</label>
                              <div className="flex flex-wrap gap-2">
                                {TRANSPORT_USES.map((u) => {
                                  const isSelected = (p.transport?.uses || (p.transport?.use ? [p.transport.use] : [])).includes(u);
                                  return (
                                    <button
                                      type="button"
                                      key={u}
                                      onClick={() => toggleTransportUse(p.id, u)}
                                      className={catChip(isSelected)}
                                    >
                                      {u}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Baraat: Hours + Price */}
                            {((p.transport?.uses || (p.transport?.use ? [p.transport.use] : [])).includes('Baraat')) && (
                              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                                <span className="text-[11px] font-bold text-amber-300">Baraat Options</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1">Hours for Baraat</label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={p.transport?.baraatHours ?? ''}
                                      onChange={(e) => updatePackageTransport(p.id, 'baraatHours', e.target.value === '' ? undefined : Number(e.target.value))}
                                      placeholder="e.g. 4 hours"
                                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Price for Baraat (₹)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.transport?.usePrices?.Baraat ?? ''}
                                      onChange={(e) => updateTransportUsePrice(p.id, 'Baraat', e.target.value === '' ? undefined : Number(e.target.value))}
                                      placeholder="e.g. 5000"
                                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Guests: How many persons + Price */}
                            {((p.transport?.uses || (p.transport?.use ? [p.transport.use] : [])).includes('Guests')) && (
                              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                                <span className="text-[11px] font-bold text-amber-300">Guests Transport Options</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1">How many persons (guests)</label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={p.transport?.guestsPersons ?? ''}
                                      onChange={(e) => updatePackageTransport(p.id, 'guestsPersons', e.target.value === '' ? undefined : Number(e.target.value))}
                                      placeholder="e.g. 50 persons"
                                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Price for Guests (₹)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.transport?.usePrices?.Guests ?? ''}
                                      onChange={(e) => updateTransportUsePrice(p.id, 'Guests', e.target.value === '' ? undefined : Number(e.target.value))}
                                      placeholder="e.g. 10000"
                                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Couple: Price option alone */}
                            {((p.transport?.uses || (p.transport?.use ? [p.transport.use] : [])).includes('Couple')) && (
                              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                                <span className="text-[11px] font-bold text-amber-300">Couple Transport</span>
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Price for Couple (₹)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.transport?.usePrices?.Couple ?? ''}
                                    onChange={(e) => updateTransportUsePrice(p.id, 'Couple', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="e.g. 6000"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 4. No. of vehicles, Seats/vehicle, Km/hours included + Package Price */}
                          <div className="pt-2 border-t border-slate-800/80">
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                              Fleet Specifications &amp; Package Price
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">No. of vehicles</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.transport?.numVehicles ?? ''}
                                  onChange={(e) => updatePackageTransport(p.id, 'numVehicles', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="0"
                                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Seats / vehicle</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.transport?.seatsPerVehicle ?? ''}
                                  onChange={(e) => updatePackageTransport(p.id, 'seatsPerVehicle', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="0"
                                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Km / hours included</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.transport?.kmHoursIncluded ?? ''}
                                  onChange={(e) => updatePackageTransport(p.id, 'kmHoursIncluded', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="0"
                                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-semibold mb-1">Package price (₹)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.transport?.kmHoursPrice ?? ''}
                                  onChange={(e) => updatePackageTransport(p.id, 'kmHoursPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="e.g. 8000"
                                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                />
                              </div>
                            </div>
                          </div>

                          {/* 5. Driver + Fuel Included with Price Option */}
                          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] text-slate-400 uppercase font-bold">Driver + fuel included</label>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updatePackageTransport(p.id, 'driverFuel', true)}
                                  className={catChip(p.transport?.driverFuel === true)}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updatePackageTransport(p.id, 'driverFuel', false)}
                                  className={catChip(p.transport?.driverFuel === false)}
                                >
                                  No
                                </button>
                              </div>
                            </div>
                            {p.transport?.driverFuel && (
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Driver + fuel price (₹)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.transport?.driverFuelPrice ?? ''}
                                  onChange={(e) => updatePackageTransport(p.id, 'driverFuelPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="e.g. 2000"
                                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                />
                              </div>
                            )}
                          </div>

                          {/* 6. Car Decoration with Type of decoration, Upload image, and Price */}
                          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] text-slate-400 uppercase font-bold">Car decoration</label>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updatePackageTransport(p.id, 'carDecoration', true)}
                                  className={catChip(p.transport?.carDecoration === true)}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updatePackageTransport(p.id, 'carDecoration', false)}
                                  className={catChip(p.transport?.carDecoration === false)}
                                >
                                  No
                                </button>
                              </div>
                            </div>
                            {p.transport?.carDecoration && (
                              <div className="space-y-2.5 pt-1.5 border-t border-slate-800">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1">Type of decoration</label>
                                    <input
                                      type="text"
                                      value={p.transport?.carDecorationType ?? ''}
                                      onChange={(e) => updatePackageTransport(p.id, 'carDecorationType', e.target.value)}
                                      placeholder="e.g. Fresh Flower Hood &amp; Ribbon Garlands"
                                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Decoration price (₹)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.transport?.carDecorationPrice ?? ''}
                                      onChange={(e) => updatePackageTransport(p.id, 'carDecorationPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                      placeholder="e.g. 2500"
                                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1">Upload decoration image</label>
                                  <div className="flex items-center gap-2.5">
                                    {p.transport?.carDecorationImage ? (
                                      <div className="relative group">
                                        <img src={p.transport.carDecorationImage} alt="Car decoration" className="w-16 h-12 rounded-lg object-cover border border-slate-700" />
                                        <button
                                          type="button"
                                          onClick={() => removeTransportImage(p.id, 'decoration')}
                                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ) : null}
                                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors">
                                      {uploadingTransportImg === `${p.id}:decoration` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                      {p.transport?.carDecorationImage ? 'Change photo' : 'Upload decoration photo'}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploadingTransportImg === `${p.id}:decoration`}
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f) uploadTransportImage(p.id, 'decoration', f);
                                          e.target.value = '';
                                        }}
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            )}
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
                        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5" /> Invitation Details &amp; Pricing
                            </p>
                          </div>

                          {/* Tier & 1. Design (Custom / Template) with only price option */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tier</label>
                              <div className="flex flex-wrap gap-2">
                                {INVITATION_TIERS.map((t) => (
                                  <button
                                    type="button"
                                    key={t}
                                    onClick={() => updatePackageInvitation(p.id, 'tier', t)}
                                    className={catChip(p.invitation?.tier === t)}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Design</label>
                              <div className="flex flex-wrap gap-2">
                                {INVITATION_DESIGNS.map((d) => (
                                  <button
                                    type="button"
                                    key={d}
                                    onClick={() => updatePackageInvitation(p.id, 'design', p.invitation?.design === d ? undefined : d)}
                                    className={catChip(p.invitation?.design === d)}
                                  >
                                    {d}
                                  </button>
                                ))}
                              </div>
                              {p.invitation?.design && (
                                <div className="mt-2">
                                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                                    Price for {p.invitation.design} design (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.invitation?.designPrices?.[p.invitation.design] ?? ''}
                                    onChange={(e) => updateInvitationDesignPrice(p.id, p.invitation!.design!, e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="e.g. 2500"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 2. Type (Digital e-invite, Video invite, Printed card) with price and upload option */}
                          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                                Type (Select types to set price &amp; upload sample)
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {INVITATION_TYPES.map((t) => {
                                  const isSelected = (p.invitation?.types || (p.invitation?.type ? [p.invitation.type] : [])).includes(t);
                                  return (
                                    <button
                                      type="button"
                                      key={t}
                                      onClick={() => toggleInvitationType(p.id, t)}
                                      className={catChip(isSelected)}
                                    >
                                      {t}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Individual Type Configurations */}
                            {((p.invitation?.types && p.invitation.types.length > 0)
                              ? p.invitation.types
                              : (p.invitation?.type ? [p.invitation.type] : [])
                            ).map((t) => {
                              const price = p.invitation?.typePrices?.[t];
                              const imgUrl = p.invitation?.typeImages?.[t];
                              const isUploading = uploadingInvitationImg === `${p.id}:${t}`;

                              return (
                                <div key={t} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                      <Mail className="w-3.5 h-3.5" /> {t}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleInvitationType(p.id, t)}
                                      className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1"
                                    >
                                      ✕ Remove
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                                        Price for {t} (₹)
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={price ?? ''}
                                        onChange={(e) => updateInvitationTypePrice(p.id, t, e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder="e.g. 1500"
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">
                                        Sample / Preview for {t}
                                      </label>
                                      <div className="flex items-center gap-2.5">
                                        {imgUrl ? (
                                          <div className="relative group">
                                            <img src={imgUrl} alt={t} className="w-16 h-12 rounded-lg object-cover border border-slate-700" />
                                            <button
                                              type="button"
                                              onClick={() => removeInvitationImage(p.id, t)}
                                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ) : null}
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors">
                                          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                          {imgUrl ? 'Change sample' : `Upload ${t} sample`}
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={isUploading}
                                            onChange={(e) => {
                                              const f = e.target.files?.[0];
                                              if (f) uploadInvitationImage(p.id, t, f);
                                              e.target.value = '';
                                            }}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* 3. Add-ons (RSVP link, Map, Invitation call by person) with prices */}
                          <div className="space-y-2 pt-2 border-t border-slate-800/80">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Add-ons</label>
                              <div className="flex flex-wrap gap-2">
                                {INVITATION_ADDONS.map((a) => {
                                  const isSelected = (p.invitation?.addOns || []).includes(a) || (a === 'Invitation call by person' && (p.invitation?.addOns || []).includes('Caricature'));
                                  return (
                                    <button
                                      type="button"
                                      key={a}
                                      onClick={() => toggleInvitationAddon(p.id, a)}
                                      className={catChip(isSelected)}
                                    >
                                      {a}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                              {(p.invitation?.addOns || []).includes('RSVP link') && (
                                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50">
                                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                                    Price for RSVP link (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.invitation?.addOnPrices?.['RSVP link'] ?? ''}
                                    onChange={(e) => updateInvitationAddonPrice(p.id, 'RSVP link', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="e.g. 500"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                  />
                                </div>
                              )}
                              {((p.invitation?.addOns || []).includes('Invitation call by person') || (p.invitation?.addOns || []).includes('Caricature')) && (
                                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50">
                                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                                    Price for Invitation call by person (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.invitation?.addOnPrices?.['Invitation call by person'] ?? p.invitation?.addOnPrices?.['Caricature'] ?? ''}
                                    onChange={(e) => updateInvitationAddonPrice(p.id, 'Invitation call by person', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="e.g. 2000"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 4. Languages with only price option */}
                          <div className="space-y-2 pt-2 border-t border-slate-800/80">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Languages</label>
                              <div className="flex flex-wrap gap-2">
                                {INVITATION_LANGUAGES.map((l) => (
                                  <button
                                    type="button"
                                    key={l}
                                    onClick={() => toggleInvitationArray(p.id, 'languages', l)}
                                    className={catChip((p.invitation?.languages || []).includes(l))}
                                  >
                                    {l}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {(p.invitation?.languages || []).length > 0 && (
                              <div className="mt-2 max-w-xs">
                                <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                                  Price for languages / translation (₹)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.invitation?.languagePrice ?? ''}
                                  onChange={(e) => updatePackageInvitation(p.id, 'languagePrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="e.g. 1000"
                                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                />
                              </div>
                            )}
                          </div>

                          {/* 5. Quantity (printed) with price option, revisions, and delivery time */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Quantity (printed)</label>
                              <input
                                type="number"
                                min={0}
                                value={p.invitation?.quantity ?? ''}
                                onChange={(e) => updatePackageInvitation(p.id, 'quantity', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 250"
                                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-semibold mb-1">Price for printed cards (₹)</label>
                              <input
                                type="number"
                                min={0}
                                value={p.invitation?.quantityPrice ?? ''}
                                onChange={(e) => updatePackageInvitation(p.id, 'quantityPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 5000"
                                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Design revisions</label>
                              <input
                                type="number"
                                min={0}
                                value={p.invitation?.revisions ?? ''}
                                onChange={(e) => updatePackageInvitation(p.id, 'revisions', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 3"
                                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Delivery time</label>
                              <input
                                type="text"
                                value={p.invitation?.deliveryTime ?? ''}
                                onChange={(e) => updatePackageInvitation(p.id, 'deliveryTime', e.target.value)}
                                placeholder="e.g. 3 days"
                                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Printing: structured product spec (replaces capacity + generic price tiers). */}
                      {myVendor?.category === 'Printing' && (
                        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
                              <Printer className="w-3.5 h-3.5" /> Printing Specifications &amp; Pricing
                            </p>
                          </div>

                          {/* 1. Products (Banners, Albums, Standees, Photo frames, Thank-you cards - Flex removed) */}
                          <div className="space-y-2.5">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                                Product (Select products to configure type, size, price &amp; photos)
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {PRINTING_PRODUCTS.map((pr) => {
                                  const isSelected = (p.printing?.products || (p.printing?.product ? [p.printing.product] : [])).includes(pr);
                                  return (
                                    <button
                                      type="button"
                                      key={pr}
                                      onClick={() => togglePrintingProduct(p.id, pr)}
                                      className={catChip(isSelected)}
                                    >
                                      {pr}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Individual Product Configurations */}
                            {((p.printing?.products && p.printing.products.length > 0)
                              ? p.printing.products
                              : (p.printing?.product ? [p.printing.product] : [])
                            ).map((pr) => {
                              const pType = p.printing?.productTypes?.[pr];
                              const pSize = p.printing?.productSizes?.[pr];
                              const pPrice = p.printing?.productPrices?.[pr];
                              const pImg = p.printing?.productImages?.[pr];
                              const isUploading = uploadingPrintingImg === `${p.id}:product:${pr}`;
                              const hasUpload = pr === 'Albums' || pr === 'Photo frames' || pr === 'Thank-you cards' || pr === 'Banners' || pr === 'Standees';

                              return (
                                <div key={pr} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                      <Printer className="w-3.5 h-3.5" /> {pr}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => togglePrintingProduct(p.id, pr)}
                                      className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1"
                                    >
                                      ✕ Remove
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">
                                        Type of {pr.toLowerCase()}
                                      </label>
                                      <input
                                        type="text"
                                        value={pType ?? ''}
                                        onChange={(e) => updatePrintingProductField(p.id, pr, 'types', e.target.value)}
                                        placeholder={pr === 'Banners' ? 'e.g. Vinyl / Star Flex / Backlit' : pr === 'Albums' ? 'e.g. Photobook / Layflat' : pr === 'Standees' ? 'e.g. Roll-up / X-standee' : pr === 'Photo frames' ? 'e.g. Acrylic / Canvas / Wood' : 'e.g. Folded card / Postcard'}
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">
                                        Size of {pr.toLowerCase()}
                                      </label>
                                      <input
                                        type="text"
                                        value={pSize ?? ''}
                                        onChange={(e) => updatePrintingProductField(p.id, pr, 'sizes', e.target.value)}
                                        placeholder={pr === 'Banners' ? 'e.g. 6x4 ft' : pr === 'Albums' ? 'e.g. 12x18 inch' : pr === 'Standees' ? 'e.g. 6x3 ft' : pr === 'Photo frames' ? 'e.g. 12x18 inch' : 'e.g. 4x6 inch'}
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                                        Price of {pr.toLowerCase()} (₹)
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={pPrice ?? ''}
                                        onChange={(e) => updatePrintingProductField(p.id, pr, 'prices', e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder="e.g. 1500"
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                  </div>

                                  {hasUpload && (
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">Upload sample photo for {pr}</label>
                                      <div className="flex items-center gap-2.5">
                                        {pImg ? (
                                          <div className="relative group">
                                            <img src={pImg} alt={pr} className="w-16 h-12 rounded-lg object-cover border border-slate-700" />
                                            <button
                                              type="button"
                                              onClick={() => removePrintingImage(p.id, `product:${pr}`)}
                                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ) : null}
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors">
                                          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                          {pImg ? 'Change photo' : `Upload ${pr} photo`}
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={isUploading}
                                            onChange={(e) => {
                                              const f = e.target.files?.[0];
                                              if (f) uploadPrintingImage(p.id, `product:${pr}`, f);
                                              e.target.value = '';
                                            }}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* 2. Material / Finish (Matte, Glossy, Lamination) with price and upload image */}
                          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                                Material / Finish (Select to configure price &amp; material photo)
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {PRINTING_FINISHES.map((f) => {
                                  const isSelected = (p.printing?.finishes || []).includes(f);
                                  return (
                                    <button
                                      type="button"
                                      key={f}
                                      onClick={() => togglePrintingFinish(p.id, f)}
                                      className={catChip(isSelected)}
                                    >
                                      {f}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Individual Finish Configurations */}
                            {(p.printing?.finishes || []).map((f) => {
                              const price = p.printing?.finishPrices?.[f];
                              const imgUrl = p.printing?.finishImages?.[f];
                              const isUploading = uploadingPrintingImg === `${p.id}:finish:${f}`;

                              return (
                                <div key={f} className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300">{f} Material</span>
                                    <button
                                      type="button"
                                      onClick={() => togglePrintingFinish(p.id, f)}
                                      className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1"
                                    >
                                      ✕ Remove
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                                        Price of {f} material (₹)
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={price ?? ''}
                                        onChange={(e) => updatePrintingFinishPrice(p.id, f, e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder="e.g. 500"
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">
                                        Upload image of {f} material
                                      </label>
                                      <div className="flex items-center gap-2.5">
                                        {imgUrl ? (
                                          <div className="relative group">
                                            <img src={imgUrl} alt={f} className="w-16 h-12 rounded-lg object-cover border border-slate-700" />
                                            <button
                                              type="button"
                                              onClick={() => removePrintingImage(p.id, `finish:${f}`)}
                                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ) : null}
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors">
                                          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                          {imgUrl ? 'Change photo' : `Upload ${f} photo`}
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={isUploading}
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) uploadPrintingImage(p.id, `finish:${f}`, file);
                                              e.target.value = '';
                                            }}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* 3. Delivery Time (Size & Quantity removed per request) */}
                          <div className="pt-2 border-t border-slate-800/80 max-w-xs">
                            <label className="block text-[10px] text-slate-500 mb-1">Delivery time</label>
                            <input
                              type="text"
                              value={p.printing?.deliveryTime ?? ''}
                              onChange={(e) => updatePackagePrinting(p.id, 'deliveryTime', e.target.value)}
                              placeholder="e.g. 2 days"
                              className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                            />
                          </div>

                          {/* 4. Design Included with price, what design description, and upload */}
                          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] text-slate-400 uppercase font-bold">Design included</label>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updatePackagePrinting(p.id, 'designIncluded', true)}
                                  className={catChip(p.printing?.designIncluded === true)}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updatePackagePrinting(p.id, 'designIncluded', false)}
                                  className={catChip(p.printing?.designIncluded === false)}
                                >
                                  No
                                </button>
                              </div>
                            </div>

                            {p.printing?.designIncluded && (
                              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                                      Price of design (₹)
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.printing?.designPrice ?? ''}
                                      onChange={(e) => updatePackagePrinting(p.id, 'designPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                      placeholder="e.g. 1000"
                                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1">
                                      What design
                                    </label>
                                    <input
                                      type="text"
                                      value={p.printing?.designDescription ?? ''}
                                      onChange={(e) => updatePackagePrinting(p.id, 'designDescription', e.target.value)}
                                      placeholder="e.g. Custom banner typography &amp; graphics"
                                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1">Upload design sample</label>
                                  <div className="flex items-center gap-2.5">
                                    {p.printing?.designImage ? (
                                      <div className="relative group">
                                        <img src={p.printing.designImage} alt="Design sample" className="w-16 h-12 rounded-lg object-cover border border-slate-700" />
                                        <button
                                          type="button"
                                          onClick={() => removePrintingImage(p.id, 'design')}
                                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ) : null}
                                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors">
                                      {uploadingPrintingImg === `${p.id}:design` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                      {p.printing?.designImage ? 'Change design photo' : 'Upload design sample'}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploadingPrintingImg === `${p.id}:design`}
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f) uploadPrintingImage(p.id, 'design', f);
                                          e.target.value = '';
                                        }}
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Return Gifts: structured spec (replaces capacity + generic price tiers). */}
                      {myVendor?.category === 'Return Gifts' && (
                        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
                              <Gift className="w-3.5 h-3.5" /> Return Gift Specifications &amp; Pricing
                            </p>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tier (per-piece budget)</label>
                            <div className="flex flex-wrap gap-2">
                              {RETURN_GIFTS_TIERS.map((t) => (
                                <button type="button" key={t} onClick={() => updatePackageReturnGifts(p.id, 'tier', t)} className={catChip(p.returnGifts?.tier === t)}>{t}</button>
                              ))}
                            </div>
                          </div>

                          {/* 1. Gift Types with details, price, and image upload */}
                          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                                Gift Type (Select to configure item details, price &amp; sample photo)
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {RETURN_GIFT_TYPES.map((g) => {
                                  const isSelected = (p.returnGifts?.giftTypes || (p.returnGifts?.giftType ? [p.returnGifts.giftType] : [])).includes(g);
                                  return (
                                    <button
                                      type="button"
                                      key={g}
                                      onClick={() => toggleReturnGiftType(p.id, g)}
                                      className={catChip(isSelected)}
                                    >
                                      {g}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Individual Gift Type Configurations */}
                            {((p.returnGifts?.giftTypes && p.returnGifts.giftTypes.length > 0)
                              ? p.returnGifts.giftTypes
                              : (p.returnGifts?.giftType ? [p.returnGifts.giftType] : [])
                            ).map((g) => {
                              const detail = p.returnGifts?.giftItemDetails?.[g];
                              const price = p.returnGifts?.giftPrices?.[g];
                              const imgUrl = p.returnGifts?.giftImages?.[g];
                              const isUploading = uploadingReturnGiftImg === `${p.id}:${g}`;

                              const detailLabel = g === 'Dry fruits' ? 'Grams / Kgs' : g === 'Silver items' ? 'Item name' : g === 'Potli bags' ? 'Item name / style' : g === 'Plants' ? 'What plant' : g === 'Hampers' ? 'Kind of hampers' : 'Types of sweets';
                              const detailPlaceholder = g === 'Dry fruits' ? 'e.g. 250g / 500g / 1kg' : g === 'Silver items' ? 'e.g. Silver coin 10g / Silver diya' : g === 'Potli bags' ? 'e.g. Velvet embroidered potli' : g === 'Plants' ? 'e.g. Money plant / Jade plant' : g === 'Hampers' ? 'e.g. Festive luxury hamper' : 'e.g. Kaju katli / Ghee mysore pak';

                              return (
                                <div key={g} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                      <Gift className="w-3.5 h-3.5" /> {g}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleReturnGiftType(p.id, g)}
                                      className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1"
                                    >
                                      ✕ Remove
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">{detailLabel}</label>
                                      <input
                                        type="text"
                                        value={detail ?? ''}
                                        onChange={(e) => updateReturnGiftField(p.id, g, 'details', e.target.value)}
                                        placeholder={detailPlaceholder}
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Price for {g.toLowerCase()} (₹)</label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={price ?? ''}
                                        onChange={(e) => updateReturnGiftField(p.id, g, 'price', e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder="e.g. 350"
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1">Upload image of {g.toLowerCase()}</label>
                                    <div className="flex items-center gap-2.5">
                                      {imgUrl ? (
                                        <div className="relative group">
                                          <img src={imgUrl} alt={g} className="w-16 h-12 rounded-lg object-cover border border-slate-700" />
                                          <button
                                            type="button"
                                            onClick={() => removeReturnGiftImage(p.id, g)}
                                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : null}
                                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors">
                                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                        {imgUrl ? 'Change photo' : `Upload ${g} photo`}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          disabled={isUploading}
                                          onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) uploadReturnGiftImage(p.id, g, f);
                                            e.target.value = '';
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* 2 & 3. Count of gifts with Price & Packaging type with Price */}
                          <div className="pt-2 border-t border-slate-800/80 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Count of gifts + price */}
                              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                                <label className="block text-[10px] text-slate-400 uppercase font-bold">Count of gifts</label>
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-1">Count / pieces</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.returnGifts?.countOfGifts ?? ''}
                                    onChange={(e) => updatePackageReturnGifts(p.id, 'countOfGifts', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="e.g. 100"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Price for count of gifts (₹)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.returnGifts?.countPrice ?? ''}
                                    onChange={(e) => updatePackageReturnGifts(p.id, 'countPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="e.g. 5000"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                  />
                                </div>
                              </div>

                              {/* Packaging type + price */}
                              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                                <label className="block text-[10px] text-slate-400 uppercase font-bold">Packaging type</label>
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-1">Packaging type</label>
                                  <input
                                    type="text"
                                    value={p.returnGifts?.packagingType ?? ''}
                                    onChange={(e) => updatePackageReturnGifts(p.id, 'packagingType', e.target.value)}
                                    placeholder="e.g. Gift box / Jute bag / Tin box"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Price for packaging (₹)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.returnGifts?.packagingPrice ?? ''}
                                    onChange={(e) => updatePackageReturnGifts(p.id, 'packagingPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="e.g. 1500"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Additional metadata: minQuantity, packingTimeDays, bulkDiscount */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Minimum quantity</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.returnGifts?.minQuantity ?? ''}
                                  onChange={(e) => updatePackageReturnGifts(p.id, 'minQuantity', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="e.g. 50"
                                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Packing time (days)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.returnGifts?.packingTimeDays ?? ''}
                                  onChange={(e) => updatePackageReturnGifts(p.id, 'packingTimeDays', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="e.g. 3"
                                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Bulk quantity discount</label>
                                <input
                                  type="text"
                                  value={p.returnGifts?.bulkDiscount ?? ''}
                                  onChange={(e) => updatePackageReturnGifts(p.id, 'bulkDiscount', e.target.value)}
                                  placeholder="e.g. 10% off above 200"
                                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                />
                              </div>
                            </div>
                          </div>

                          {/* 4. Customization (name / date print) with Price on vendor side */}
                          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] text-slate-400 uppercase font-bold">Customization (name / date print)</label>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updatePackageReturnGifts(p.id, 'customization', true)}
                                  className={catChip(p.returnGifts?.customization === true)}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updatePackageReturnGifts(p.id, 'customization', false)}
                                  className={catChip(p.returnGifts?.customization === false)}
                                >
                                  No
                                </button>
                              </div>
                            </div>

                            {p.returnGifts?.customization && (
                              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                                <div className="max-w-xs">
                                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Price for customization (₹)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.returnGifts?.customizationPrice ?? ''}
                                    onChange={(e) => updatePackageReturnGifts(p.id, 'customizationPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="e.g. 1000"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                  />
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  Customer will be prompted to enter the name / event date to print on the gift in the customer app.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Entertainment: structured act spec (replaces generic price tiers). */}
                      {myVendor?.category === 'Entertainment' && (
                        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-amber-400 uppercase font-bold">Act details &amp; Pricing</p>
                          </div>

                          {/* Act types — select, set price & upload photo per act */}
                          <div className="space-y-2">
                            <label className="block text-[10px] text-slate-400 uppercase font-bold">Act type (select to set price &amp; upload photo)</label>
                            <div className="flex flex-wrap gap-2">
                              {ENTERTAINMENT_ACT_TYPES.map((a) => (
                                <button type="button" key={a} onClick={() => toggleEntertainmentAct(p.id, a)} className={catChip((p.entertainment?.actTypes || []).includes(a))}>{a}</button>
                              ))}
                            </div>
                            {(p.entertainment?.actTypes || []).map((a) => {
                              const isUploading = uploadingEntertainmentImg === `${p.id}:${a}`;
                              const imgUrl = p.entertainment?.actTypeImages?.[a];
                              return (
                                <div key={a} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300">{a}</span>
                                    <button type="button" onClick={() => toggleEntertainmentAct(p.id, a)} className="text-slate-400 hover:text-rose-400 text-xs">✕ Remove</button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Price (₹)</label>
                                      <input type="number" min={0} value={p.entertainment?.actTypePrices?.[a] ?? ''} onChange={(e) => updateEntertainmentActPrice(p.id, a, e.target.value === '' ? undefined : Number(e.target.value))} placeholder="e.g. 15000" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">Upload photo</label>
                                      <div className="flex items-center gap-2.5">
                                        {imgUrl ? (<div className="relative"><img src={imgUrl} alt={a} className="w-16 h-12 rounded-lg object-cover border border-slate-700" /><button type="button" onClick={() => removeEntertainmentImage(p.id, a)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px]">✕</button></div>) : null}
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700">
                                          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-amber-400" />}
                                          {imgUrl ? 'Change photo' : 'Upload photo'}
                                          <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadEntertainmentImage(p.id, a, f); e.target.value = ''; }} />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Equipment & Travel — price fields */}
                          <div className="grid grid-cols-2 gap-2">
                            {([['equipmentPrice', 'Equipment (₹)'], ['travelPrice', 'Travel (₹)']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                                  <input type="number" min={0} value={(p.entertainment as any)?.[field] ?? ''} onChange={(e) => updatePackageEntertainment(p.id, field, e.target.value === '' ? undefined : Number(e.target.value))} placeholder="Blank if N/A" className="w-full pl-6 pr-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
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
                      {(myVendor?.category === 'Lighting' || myVendor?.category === 'Lights & Sounds') && (
                        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
                              Lights &amp; Sounds details &amp; Pricing
                            </p>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tier</label>
                            <div className="flex flex-wrap gap-2">
                              {LIGHTING_TIERS.map((t) => (
                                <button type="button" key={t} onClick={() => updatePackageLighting(p.id, 'tier', t)} className={catChip(p.lighting?.tier === t)}>{t}</button>
                              ))}
                            </div>
                          </div>

                          {/* 2. LIGHTING TYPE: options with price, what type of item is there, and upload image */}
                          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                                Lighting Type (Select options to configure item details, price &amp; sample photo)
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {LIGHTING_TYPES.map((l) => (
                                  <button
                                    type="button"
                                    key={l}
                                    onClick={() => toggleLightingType(p.id, l)}
                                    className={catChip((p.lighting?.lightingTypes || []).includes(l))}
                                  >
                                    {l}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Individual Lighting Type Configuration Cards */}
                            {(p.lighting?.lightingTypes || []).map((l) => {
                              const itemVal = p.lighting?.typeItems?.[l];
                              const priceVal = p.lighting?.typePrices?.[l];
                              const imgUrl = p.lighting?.typeImages?.[l];
                              const isUploading = uploadingLightingImg === `${p.id}:${l}`;

                              return (
                                <div key={l} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300">
                                      {l}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleLightingType(p.id, l)}
                                      className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1"
                                    >
                                      ✕ Remove
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">What type of item is there</label>
                                      <input
                                        type="text"
                                        value={itemVal ?? ''}
                                        onChange={(e) => updateLightingField(p.id, l, 'item', e.target.value)}
                                        placeholder={`e.g. Specific model / count for ${l}`}
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Price for {l.toLowerCase()} (₹)</label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={priceVal ?? ''}
                                        onChange={(e) => updateLightingField(p.id, l, 'price', e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder="e.g. 5000"
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1">Upload image of {l.toLowerCase()}</label>
                                    <div className="flex items-center gap-2.5">
                                      {imgUrl ? (
                                        <div className="relative group">
                                          <img src={imgUrl} alt={l} className="w-16 h-12 rounded-lg object-cover border border-slate-700" />
                                          <button
                                            type="button"
                                            onClick={() => removeLightingImage(p.id, l)}
                                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : null}
                                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors">
                                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-amber-400" />}
                                        {imgUrl ? 'Change photo' : `Upload ${l} photo`}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          disabled={isUploading}
                                          onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) uploadLightingImage(p.id, l, f);
                                            e.target.value = '';
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* 3. Area covered with Price option (Image 1 'Number of functions' removed) */}
                          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-1">Area covered</label>
                                <input
                                  type="text"
                                  value={p.lighting?.areaCovered ?? ''}
                                  onChange={(e) => updatePackageLighting(p.id, 'areaCovered', e.target.value)}
                                  placeholder="e.g. Stage + entrance"
                                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-semibold mb-1">Price for area covered (₹)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.lighting?.areaCoveredPrice ?? ''}
                                  onChange={(e) => updatePackageLighting(p.id, 'areaCoveredPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="e.g. 8000"
                                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                />
                              </div>
                            </div>
                            <div className="max-w-xs">
                              <label className="block text-[10px] text-slate-500 mb-1">Number of fixtures (optional)</label>
                              <input
                                type="number"
                                min={0}
                                value={p.lighting?.numFixtures ?? ''}
                                onChange={(e) => updatePackageLighting(p.id, 'numFixtures', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 20"
                                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                              />
                            </div>
                          </div>

                          {/* 4. Power backup & Setup + Teardown: with price option for each */}
                          <div className="pt-2 border-t border-slate-800/80 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Power backup */}
                              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[10px] text-slate-400 uppercase font-bold">Power backup</label>
                                  <div className="flex gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => updatePackageLighting(p.id, 'powerBackup', true)}
                                      className={catChip(p.lighting?.powerBackup === true)}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updatePackageLighting(p.id, 'powerBackup', false)}
                                      className={catChip(p.lighting?.powerBackup === false)}
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                                {p.lighting?.powerBackup && (
                                  <div className="pt-1.5">
                                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">Price for power backup (₹)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.lighting?.powerBackupPrice ?? ''}
                                      onChange={(e) => updatePackageLighting(p.id, 'powerBackupPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                      placeholder="e.g. 3000"
                                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Setup + teardown */}
                              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[10px] text-slate-400 uppercase font-bold">Setup + teardown included</label>
                                  <div className="flex gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => updatePackageLighting(p.id, 'setupTeardown', true)}
                                      className={catChip(p.lighting?.setupTeardown === true)}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updatePackageLighting(p.id, 'setupTeardown', false)}
                                      className={catChip(p.lighting?.setupTeardown === false)}
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                                {p.lighting?.setupTeardown && (
                                  <div className="pt-1.5">
                                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">Price for setup &amp; teardown (₹)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.lighting?.setupTeardownPrice ?? ''}
                                      onChange={(e) => updatePackageLighting(p.id, 'setupTeardownPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                      placeholder="e.g. 2500"
                                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Flowers: structured spec (replaces capacity/duration + generic price tiers). */}
                      {myVendor?.category === 'Flowers' && (
                        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                          {/* Header with Total amount badge */}
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
                              Flower details &amp; Pricing
                            </p>
                          </div>

                          {/* 1. IMAGE 1: VARIETY / TIER & FLOWERS KIND */}
                          <div className="space-y-3 pt-1">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-[10px] text-slate-400 uppercase font-bold">
                                  Variety / Tier (Select options to configure price &amp; upload photo)
                                </label>
                                <button
                                  type="button"
                                  onClick={() => addFlowersCustomVariety(p.id)}
                                  className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> Add item
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {FLOWERS_VARIETIES.map((v) => {
                                  const isSelected = (p.flowers?.varieties || (p.flowers?.variety ? [p.flowers.variety] : [])).includes(v);
                                  return (
                                    <button
                                      type="button"
                                      key={v}
                                      onClick={() => toggleFlowersVariety(p.id, v)}
                                      className={catChip(isSelected)}
                                    >
                                      {v}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Configuration cards for selected existing varieties */}
                            {(p.flowers?.varieties || (p.flowers?.variety ? [p.flowers.variety] : [])).map((v) => {
                              const priceVal = p.flowers?.varietyPrices?.[v];
                              const imgUrl = p.flowers?.varietyImages?.[v];
                              const isUploading = uploadingFlowersImg === `${p.id}:variety:${v}`;

                              return (
                                <div key={v} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300">{v}</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleFlowersVariety(p.id, v)}
                                      className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1"
                                    >
                                      ✕ Remove
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                                        Price for {v.toLowerCase()} (₹)
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={priceVal ?? ''}
                                        onChange={(e) => updateFlowersVarietyPrice(p.id, v, e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder="e.g. 5000"
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">
                                        Upload image of {v.toLowerCase()}
                                      </label>
                                      <div className="flex items-center gap-2.5">
                                        {imgUrl ? (
                                          <div className="relative group">
                                            <img src={imgUrl} alt={v} className="w-16 h-12 rounded-lg object-cover border border-slate-700" />
                                            <button
                                              type="button"
                                              onClick={() => removeFlowersImage(p.id, 'variety', v)}
                                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ) : null}
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors">
                                          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-amber-400" />}
                                          {imgUrl ? 'Change photo' : `Upload ${v} photo`}
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={isUploading}
                                            onChange={(e) => {
                                              const f = e.target.files?.[0];
                                              if (f) uploadFlowersImage(p.id, 'variety', v, f);
                                              e.target.value = '';
                                            }}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Configuration cards for custom added varieties */}
                            {(p.flowers?.customVarieties || []).map((cv, cIdx) => {
                              const isUploading = uploadingFlowersImg === `${p.id}:customVariety:${cIdx}`;
                              return (
                                <div key={`cv-${cIdx}`} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300">
                                      Custom Item #{cIdx + 1} {cv.name ? `— ${cv.name}` : ''}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeFlowersCustomVariety(p.id, cIdx)}
                                      className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1"
                                    >
                                      ✕ Remove
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Item name</label>
                                      <input
                                        type="text"
                                        value={cv.name || ''}
                                        onChange={(e) => updateFlowersCustomVariety(p.id, cIdx, 'name', e.target.value)}
                                        placeholder="e.g. Jasmine / Orchid"
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Price (₹)</label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={cv.price ?? ''}
                                        onChange={(e) => updateFlowersCustomVariety(p.id, cIdx, 'price', e.target.value)}
                                        placeholder="e.g. 2000"
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">Upload image</label>
                                      <div className="flex items-center gap-2.5">
                                        {cv.image ? (
                                          <div className="relative group">
                                            <img src={cv.image} alt={cv.name || 'item'} className="w-16 h-12 rounded-lg object-cover border border-slate-700" />
                                            <button
                                              type="button"
                                              onClick={() => removeFlowersImage(p.id, 'customVariety', cIdx)}
                                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ) : null}
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors">
                                          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-amber-400" />}
                                          {cv.image ? 'Change photo' : 'Upload photo'}
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={isUploading}
                                            onChange={(e) => {
                                              const f = e.target.files?.[0];
                                              if (f) uploadFlowersImage(p.id, 'customVariety', cIdx, f);
                                              e.target.value = '';
                                            }}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* FLOWERS (Fresh / Artificial) */}
                            <div className="pt-2 border-t border-slate-800/80">
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5">Flowers</label>
                              <div className="flex flex-wrap gap-2">
                                {FLOWERS_KINDS.map((k) => (
                                  <button
                                    type="button"
                                    key={k}
                                    onClick={() => updatePackageFlowers(p.id, 'flowerKind', p.flowers?.flowerKind === k ? undefined : k)}
                                    className={catChip(p.flowers?.flowerKind === k)}
                                  >
                                    {k}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* 2. IMAGE 2: ITEMS WITH PRICE AND UPLOAD IMAGE */}
                          <div className="space-y-3 pt-2 border-t border-slate-800/80">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[10px] text-slate-400 uppercase font-bold">
                                Items (Select to configure price &amp; upload image)
                              </label>
                              <button
                                type="button"
                                onClick={() => addFlowersCustomItem(p.id)}
                                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Add item
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {FLOWERS_ITEMS.map((it) => (
                                <button
                                  type="button"
                                  key={it}
                                  onClick={() => toggleFlowersItem(p.id, it)}
                                  className={catChip((p.flowers?.items || []).includes(it))}
                                >
                                  {it}
                                </button>
                              ))}
                            </div>

                            {/* Configuration cards for selected items */}
                            {(p.flowers?.items || []).map((it) => {
                              const priceVal = p.flowers?.itemPrices?.[it];
                              const imgUrl = p.flowers?.itemImages?.[it];
                              const isUploading = uploadingFlowersImg === `${p.id}:item:${it}`;

                              return (
                                <div key={it} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300">{it}</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleFlowersItem(p.id, it)}
                                      className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1"
                                    >
                                      ✕ Remove
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                                        Price for {it.toLowerCase()} (₹)
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={priceVal ?? ''}
                                        onChange={(e) => updateFlowersItemPrice(p.id, it, e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder="e.g. 3500"
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">
                                        Upload image of {it.toLowerCase()}
                                      </label>
                                      <div className="flex items-center gap-2.5">
                                        {imgUrl ? (
                                          <div className="relative group">
                                            <img src={imgUrl} alt={it} className="w-16 h-12 rounded-lg object-cover border border-slate-700" />
                                            <button
                                              type="button"
                                              onClick={() => removeFlowersImage(p.id, 'item', it)}
                                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ) : null}
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors">
                                          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-amber-400" />}
                                          {imgUrl ? 'Change photo' : `Upload ${it} photo`}
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={isUploading}
                                            onChange={(e) => {
                                              const f = e.target.files?.[0];
                                              if (f) uploadFlowersImage(p.id, 'item', it, f);
                                              e.target.value = '';
                                            }}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Configuration cards for custom added items */}
                            {(p.flowers?.customItems || []).map((ci, cIdx) => {
                              const isUploading = uploadingFlowersImg === `${p.id}:customItem:${cIdx}`;
                              return (
                                <div key={`ci-${cIdx}`} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300">
                                      Custom Item #{cIdx + 1} {ci.name ? `— ${ci.name}` : ''}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeFlowersCustomItem(p.id, cIdx)}
                                      className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1"
                                    >
                                      ✕ Remove
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Item name</label>
                                      <input
                                        type="text"
                                        value={ci.name || ''}
                                        onChange={(e) => updateFlowersCustomItem(p.id, cIdx, 'name', e.target.value)}
                                        placeholder="e.g. Floral backdrop / Rose petal shower"
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Price (₹)</label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={ci.price ?? ''}
                                        onChange={(e) => updateFlowersCustomItem(p.id, cIdx, 'price', e.target.value)}
                                        placeholder="e.g. 4000"
                                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">Upload image</label>
                                      <div className="flex items-center gap-2.5">
                                        {ci.image ? (
                                          <div className="relative group">
                                            <img src={ci.image} alt={ci.name || 'item'} className="w-16 h-12 rounded-lg object-cover border border-slate-700" />
                                            <button
                                              type="button"
                                              onClick={() => removeFlowersImage(p.id, 'customItem', cIdx)}
                                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ) : null}
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors">
                                          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-amber-400" />}
                                          {ci.image ? 'Change photo' : 'Upload photo'}
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={isUploading}
                                            onChange={(e) => {
                                              const f = e.target.files?.[0];
                                              if (f) uploadFlowersImage(p.id, 'customItem', cIdx, f);
                                              e.target.value = '';
                                            }}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* 3. IMAGE 3: TYPES OF PRICE (QUANTITY, DELIVERY TIMING, WHICH FUNCTION) */}
                          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                            <label className="block text-[10px] text-slate-400 uppercase font-bold">
                              Types of Price (Quantity, Delivery Timing, Function)
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Quantity & Unit Price */}
                              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                                <label className="block text-[10px] text-slate-400 uppercase font-bold">Quantity &amp; Price</label>
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-1">Quantity</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.flowers?.quantity ?? ''}
                                    onChange={(e) => updatePackageFlowers(p.id, 'quantity', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="e.g. 10"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Price per unit (₹)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.flowers?.unitPrice ?? ''}
                                    onChange={(e) => updatePackageFlowers(p.id, 'unitPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="e.g. 500"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm font-mono"
                                  />
                                </div>
                                {Number(p.flowers?.quantity) > 0 && Number(p.flowers?.unitPrice) > 0 && (
                                  <p className="text-[10px] text-amber-400 font-mono">
                                    Total = ₹{(Number(p.flowers?.quantity) * Number(p.flowers?.unitPrice)).toLocaleString('en-IN')}
                                  </p>
                                )}
                              </div>

                              {/* Delivery Timing & Price */}
                              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                                <label className="block text-[10px] text-slate-400 uppercase font-bold">Delivery Timing</label>
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-1">Delivery timing</label>
                                  <input
                                    type="text"
                                    value={p.flowers?.deliveryTiming ?? ''}
                                    onChange={(e) => updatePackageFlowers(p.id, 'deliveryTiming', e.target.value)}
                                    placeholder="e.g. Morning 6 AM"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Delivery timing price (₹)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.flowers?.deliveryTimingPrice ?? ''}
                                    onChange={(e) => updatePackageFlowers(p.id, 'deliveryTimingPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="e.g. 500"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm font-mono"
                                  />
                                </div>
                              </div>

                              {/* Which Function & Price */}
                              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                                <label className="block text-[10px] text-slate-400 uppercase font-bold">Function / Ceremony</label>
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-1">Which function</label>
                                  <input
                                    type="text"
                                    value={p.flowers?.whichFunction ?? ''}
                                    onChange={(e) => updatePackageFlowers(p.id, 'whichFunction', e.target.value)}
                                    placeholder="e.g. Muhurtham"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Function price (₹)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.flowers?.whichFunctionPrice ?? ''}
                                    onChange={(e) => updatePackageFlowers(p.id, 'whichFunctionPrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="e.g. 2000"
                                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>
                      )}

                      {/* Mehendi: structured spec (replaces duration + generic price tiers). */}
                      {myVendor?.category === 'Mehendi' && (
                        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-amber-400 uppercase font-bold">Mehendi details &amp; Pricing</p>
                          </div>

                          {/* TIER — select, set price & upload a photo per tier */}
                          <div className="space-y-2">
                            <label className="block text-[10px] text-slate-400 uppercase font-bold">Tier (select to set price &amp; upload photo)</label>
                            <div className="flex flex-wrap gap-2">
                              {MEHENDI_TIERS.map((t) => (
                                <button type="button" key={t} onClick={() => toggleMehendiChip(p.id, 'tiers', t)} className={catChip((p.mehendi?.tiers || []).includes(t))}>{t}</button>
                              ))}
                            </div>
                            {(p.mehendi?.tiers || []).map((t) => {
                              const isUploading = uploadingMehendiImg === `${p.id}:tier:${t}`;
                              const imgUrl = p.mehendi?.tierImages?.[t];
                              return (
                                <div key={t} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300">{t}</span>
                                    <button type="button" onClick={() => toggleMehendiChip(p.id, 'tiers', t)} className="text-slate-400 hover:text-rose-400 text-xs">✕ Remove</button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Price for {t.toLowerCase()} (₹)</label>
                                      <input type="number" min={0} value={p.mehendi?.tierPrices?.[t] ?? ''} onChange={(e) => updateMehendiMapPrice(p.id, 'tierPrices', t, e.target.value === '' ? undefined : Number(e.target.value))} placeholder="e.g. 5000" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">Upload {t.toLowerCase()} photo</label>
                                      <div className="flex items-center gap-2.5">
                                        {imgUrl ? (<div className="relative"><img src={imgUrl} alt={t} className="w-16 h-12 rounded-lg object-cover border border-slate-700" /><button type="button" onClick={() => removeMehendiImage(p.id, 'tier', t)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px]">✕</button></div>) : null}
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700">
                                          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-amber-400" />}
                                          {imgUrl ? 'Change photo' : 'Upload photo'}
                                          <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMehendiImage(p.id, 'tier', t, f); e.target.value = ''; }} />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* DESIGN INTRICACY — select, set price & upload a photo per option */}
                          <div className="space-y-2">
                            <label className="block text-[10px] text-slate-400 uppercase font-bold">Design intricacy (select to set price &amp; upload photo)</label>
                            <div className="flex flex-wrap gap-2">
                              {MEHENDI_INTRICACY.map((i) => (
                                <button type="button" key={i} onClick={() => toggleMehendiChip(p.id, 'intricacies', i)} className={catChip((p.mehendi?.intricacies || []).includes(i))}>{i}</button>
                              ))}
                            </div>
                            {(p.mehendi?.intricacies || []).map((i) => {
                              const isUploading = uploadingMehendiImg === `${p.id}:intricacy:${i}`;
                              const imgUrl = p.mehendi?.intricacyImages?.[i];
                              return (
                                <div key={i} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300">{i}</span>
                                    <button type="button" onClick={() => toggleMehendiChip(p.id, 'intricacies', i)} className="text-slate-400 hover:text-rose-400 text-xs">✕ Remove</button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Price for {i.toLowerCase()} (₹)</label>
                                      <input type="number" min={0} value={p.mehendi?.intricacyPrices?.[i] ?? ''} onChange={(e) => updateMehendiMapPrice(p.id, 'intricacyPrices', i, e.target.value === '' ? undefined : Number(e.target.value))} placeholder="e.g. 3000" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">Upload photo</label>
                                      <div className="flex items-center gap-2.5">
                                        {imgUrl ? (<div className="relative"><img src={imgUrl} alt={i} className="w-16 h-12 rounded-lg object-cover border border-slate-700" /><button type="button" onClick={() => removeMehendiImage(p.id, 'intricacy', i)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px]">✕</button></div>) : null}
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700">
                                          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-amber-400" />}
                                          {imgUrl ? 'Change photo' : 'Upload photo'}
                                          <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMehendiImage(p.id, 'intricacy', i, f); e.target.value = ''; }} />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* TYPE — price for each */}
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-2">Type — price for each (leave blank if not offered)</label>
                            <div className="grid grid-cols-2 gap-2">
                              {MEHENDI_TYPES.map((t) => (
                                <div key={t}>
                                  <label className="block text-[10px] text-slate-500 mb-1">{t}</label>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                                    <input type="number" min={0} value={p.mehendi?.typePrices?.[t] ?? ''} onChange={(e) => updateMehendiMapPrice(p.id, 'typePrices', t, e.target.value === '' ? undefined : Number(e.target.value))} placeholder="Price" className="w-full pl-6 pr-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Artists + priced options */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Artists (guest stalls)</label>
                              <input type="number" min={0} value={p.mehendi?.numArtists ?? ''} onChange={(e) => updatePackageMehendi(p.id, 'numArtists', e.target.value === '' ? undefined : Number(e.target.value))} placeholder="e.g. 2" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                            {([['artistsPrice', 'Artists price (₹)'], ['organicHennaPrice', 'Organic henna (₹)'], ['travelPrice', 'Travel (₹)']] as const).map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                                  <input type="number" min={0} value={(p.mehendi as any)?.[field] ?? ''} onChange={(e) => updatePackageMehendi(p.id, field, e.target.value === '' ? undefined : Number(e.target.value))} placeholder="Blank if N/A" className="w-full pl-6 pr-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
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
                        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-amber-400 uppercase font-bold">Rental details &amp; Pricing</p>
                          </div>

                          {/* Items — select, then set qty / price / detail / photo per item */}
                          <div className="space-y-2">
                            <label className="block text-[10px] text-slate-400 uppercase font-bold">Items (select to set quantity, price &amp; upload photo)</label>
                            <div className="flex flex-wrap gap-2">
                              {RENTAL_ITEMS.map((it) => (
                                <button type="button" key={it} onClick={() => toggleRentalItem(p.id, it)} className={catChip((p.rental?.items || []).includes(it))}>{it}</button>
                              ))}
                            </div>
                            {(p.rental?.items || []).map((it) => {
                              const isUploading = uploadingRentalImg === `${p.id}:${it}`;
                              const imgUrl = p.rental?.itemImages?.[it];
                              return (
                                <div key={it} className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300">{it}</span>
                                    <button type="button" onClick={() => toggleRentalItem(p.id, it)} className="text-slate-400 hover:text-rose-400 text-xs">✕ Remove</button>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">How many</label>
                                      <input type="number" min={0} value={p.rental?.itemQuantities?.[it] ?? ''} onChange={(e) => updateRentalItemField(p.id, 'itemQuantities', it, e.target.value === '' ? undefined : Number(e.target.value))} placeholder="e.g. 100" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">Price (₹)</label>
                                      <input type="number" min={0} value={p.rental?.itemPrices?.[it] ?? ''} onChange={(e) => updateRentalItemField(p.id, 'itemPrices', it, e.target.value === '' ? undefined : Number(e.target.value))} placeholder="e.g. 5000" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-1">Size / detail</label>
                                      <input type="text" value={p.rental?.itemDetails?.[it] ?? ''} onChange={(e) => updateRentalItemField(p.id, 'itemDetails', it, e.target.value)} placeholder="optional" className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1">Upload photo</label>
                                    <div className="flex items-center gap-2.5">
                                      {imgUrl ? (<div className="relative"><img src={imgUrl} alt={it} className="w-16 h-12 rounded-lg object-cover border border-slate-700" /><button type="button" onClick={() => removeRentalImage(p.id, it)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px]">✕</button></div>) : null}
                                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700">
                                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-amber-400" />}
                                        {imgUrl ? 'Change photo' : 'Upload photo'}
                                        <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadRentalImage(p.id, it, f); e.target.value = ''; }} />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Delivery — price */}
                          <div className="w-1/2">
                            <label className="block text-[10px] text-slate-500 mb-1">Delivery price (₹)</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                              <input type="number" min={0} value={p.rental?.deliveryPrice ?? ''} onChange={(e) => updatePackageRental(p.id, 'deliveryPrice', e.target.value === '' ? undefined : Number(e.target.value))} placeholder="Blank if free" className="w-full pl-6 pr-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Utensils for Rent: structured spec (material, vessel type prices, guest count, delivery + pickup price, deposit, cleaning). */}
                      {myVendor?.category === 'Utensils for Rent' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                          <div>
                            <p className="text-[10px] text-amber-400 uppercase font-bold">Utensils Details</p>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Material / Tier</label>
                            <div className="flex flex-wrap gap-2">
                              {UTENSILS_MATERIALS.map((m) => (
                                <button type="button" key={m} onClick={() => updatePackageUtensils(p.id, 'material', m)} className={catChip(p.utensils?.material === m)}>{m}</button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-2">Vessel Types — price for each (leave blank if not offered)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {UTENSILS_VESSEL_TYPES.map((v) => (
                                <div key={v}>
                                  <label className="block text-[10px] text-slate-500 mb-1">{v}</label>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.utensils?.vesselTypePrices?.[v] ?? ''}
                                      onChange={(e) => updateUtensilsVesselPrice(p.id, v, e.target.value === '' ? undefined : Number(e.target.value))}
                                      placeholder="Price"
                                      className="w-full pl-6 pr-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm font-mono"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Base Rental Price (₹)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.utensils?.basePrice ?? ''}
                                  onChange={(e) => updatePackageUtensils(p.id, 'basePrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="e.g. 5000"
                                  className="w-full pl-6 pr-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm font-mono"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Guest count served</label>
                              <input
                                type="number"
                                min={0}
                                value={p.utensils?.guestCount ?? ''}
                                onChange={(e) => updatePackageUtensils(p.id, 'guestCount', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 100"
                                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Security deposit (₹)</label>
                              <input
                                type="number"
                                min={0}
                                value={p.utensils?.securityDeposit ?? ''}
                                onChange={(e) => updatePackageUtensils(p.id, 'securityDeposit', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="e.g. 3000"
                                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Delivery + Pickup Price (₹)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.utensils?.deliveryPickupPrice ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? undefined : Number(e.target.value);
                                    updatePackageUtensils(p.id, 'deliveryPickupPrice', val);
                                    updatePackageUtensils(p.id, 'deliveryPickup', val !== undefined ? val >= 0 : false);
                                  }}
                                  placeholder="e.g. 1000 (0 for Free)"
                                  className="w-full pl-6 pr-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm font-mono"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Cleaning Included</label>
                              <div className="flex gap-1.5 pt-1">
                                <button type="button" onClick={() => updatePackageUtensils(p.id, 'cleaningIncluded', true)} className={catChip((p.utensils as any)?.cleaningIncluded === true)}>Yes</button>
                                <button type="button" onClick={() => updatePackageUtensils(p.id, 'cleaningIncluded', false)} className={catChip((p.utensils as any)?.cleaningIncluded === false)}>No</button>
                              </div>
                            </div>
                          </div>

                        </div>
                      )}

                      {/* Corporate Event Services: structured spec (replaces capacity/duration + generic price tiers). */}
                      {myVendor?.category === 'Corporate Event Services' && (
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                          <div>
                            <p className="text-[10px] text-amber-400 uppercase font-bold">Event Details</p>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5">Event Type</label>
                            <div className="flex flex-wrap gap-2 mb-2.5">
                              {CORPORATE_EVENT_TYPES.map((s) => (
                                <button
                                  type="button"
                                  key={s}
                                  onClick={() => {
                                    updatePackageCorporate(p.id, 'eventType', s);
                                    if (!p.packageName) {
                                      updatePackageField(p.id, 'packageName', `${s} Package`);
                                    }
                                  }}
                                  className={catChip(p.corporate?.eventType === s)}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Base Event Price (₹)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.corporate?.basePrice ?? ''}
                                  onChange={(e) => updatePackageCorporate(p.id, 'basePrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                  placeholder="e.g. 100000"
                                  className="w-full pl-6 pr-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm font-mono"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">No. of attendees</label>
                              <input
                                type="number"
                                min={0}
                                value={p.corporate?.numAttendees ?? ''}
                                onChange={(e) => updatePackageCorporate(p.id, 'numAttendees', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="0"
                                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">No. of days</label>
                              <input
                                type="number"
                                min={0}
                                value={p.corporate?.numDays ?? ''}
                                onChange={(e) => updatePackageCorporate(p.id, 'numDays', e.target.value === '' ? undefined : Number(e.target.value))}
                                placeholder="0"
                                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Add-ons — set a price for each (leave blank if not offered)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {CORPORATE_ADDONS.map(({ key, label }) => (
                                <div key={key}>
                                  <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={(p.corporate as any)?.[key] ?? ''}
                                      onChange={(e) => updatePackageCorporate(p.id, key, e.target.value === '' ? undefined : Number(e.target.value))}
                                      placeholder="Price"
                                      className="w-full pl-6 pr-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm font-mono"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Calculation Summary Box */}
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
                            <div className="text-slate-400">
                              <span>Base: </span>
                              <span className="text-slate-200 font-semibold font-mono">₹{(Number(p.corporate?.basePrice) || 0).toLocaleString('en-IN')}</span>
                              <span> + Add-ons: </span>
                              <span className="text-slate-200 font-semibold font-mono">
                                ₹{[p.corporate?.avStageBranding, p.corporate?.registrationDesk, p.corporate?.cateringCoordination, p.corporate?.mcHost]
                                  .reduce((a: number, b: any) => a + (Number(b) || 0), 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="text-amber-400 font-bold font-mono text-sm">
                              = Total Amount: ₹{(p.price || corporateTotal(p.corporate) || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Price tiers — categories with no structured spec above. */}
                      {myVendor?.category !== 'Catering' && myVendor?.category !== 'Venue' && myVendor?.category !== 'Decoration' && myVendor?.category !== 'Makeup & Beauty' && myVendor?.category !== 'Media' && myVendor?.category !== 'Transport' && myVendor?.category !== 'Pujari/Priest' && myVendor?.category !== 'Invitation' && myVendor?.category !== 'Printing' && myVendor?.category !== 'Return Gifts' && myVendor?.category !== 'Entertainment' && myVendor?.category !== 'Music/DJ' && myVendor?.category !== 'Lighting' && myVendor?.category !== 'Lights & Sounds' && myVendor?.category !== 'Flowers' && myVendor?.category !== 'Mehendi' && myVendor?.category !== 'Event Host/Anchor' && myVendor?.category !== 'Rental Equipment' && myVendor?.category !== 'Utensils for Rent' && myVendor?.category !== 'Wedding Planner' && myVendor?.category !== 'Corporate Event Services' && myVendor?.category !== 'Cleaning' && (
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
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleDateSlot(d, s.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                on
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                              }`}
                            >
                              {s.label}
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