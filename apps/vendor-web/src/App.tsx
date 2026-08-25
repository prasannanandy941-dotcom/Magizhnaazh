import React, { useState, useEffect, useRef } from 'react';
import { Store, Star, Upload, Check, LogOut, Loader2, Plus, SlidersHorizontal, ChevronDown, Receipt, X, Bell } from 'lucide-react';
import { User, Vendor, Booking, Review, VendorFacilities, VendorPackage, OfferedOptionItem, VENDOR_CATEGORIES, CATEGORY_OPTIONS, CATERING_OPTION_STYLE, MEDIA_QUALITY_OPTIONS, MEDIA_EQUIPMENT_OPTIONS, mediaExtraField } from '../../../packages/shared-types';
import { STATIC_CITY_GROUPS } from '../../../packages/shared-utils';
import { AuthGate } from './components/AuthGate';
import { FloralGoldBackground } from './components/FloralGoldBackground';
import { fetchMyVendor, createVendor, updateVendor, fetchVendorBookings, fetchVendorBookingsSilent, confirmBooking, sendCounterQuote, updateBookingStatus, updateSpendBreakdown, fetchVendorReviews, GATEWAY_URL } from './api';
import { playNotificationSound } from './notificationSound';
import { getItemSuggestions, suggestionListId } from './itemSuggestions';

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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'reviews' | 'portfolio' | 'facilities' | 'availability' | 'packages' | 'profile'>('dashboard');
  // Bookable packages the vendor offers — shown on the customer's "Packages" tab.
  const [packages, setPackages] = useState<VendorPackage[]>([]);
  const [savingPackages, setSavingPackages] = useState(false);
  const [packagesNotice, setPackagesNotice] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
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
        setPackages(v.packages || []);

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
    if (newDate && !availableDates.includes(newDate)) setAvailableDates((prev) => [...prev, newDate].sort());
    setNewDate('');
  };
  const removeDate = (d: string) => setAvailableDates((prev) => prev.filter((x) => x !== d));

  const handleSaveAvailability = async () => {
    if (!token || !myVendor) return;
    setSavingAvailability(true);
    setAvailabilityNotice('');
    try {
      const res = await updateVendor(token, myVendor.id, { availableDates } as any);
      if (res.data?.vendor) {
        setMyVendor(res.data.vendor);
        setAvailableDates(res.data.vendor.availableDates || []);
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

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-slate-800 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-slate-950">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-extrabold text-xl text-white">Magizhnaazh Vendor Portal</span>
              <span className="block text-[10px] text-amber-400 font-bold uppercase tracking-wider">Business Partner Workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="hidden sm:block text-slate-400">
              Signed in as <strong className="text-slate-200">{user.name}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-rose-400 font-bold text-xs transition-colors"
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
          <div className="glass-card p-8 rounded-3xl border border-slate-800 space-y-4">
            <div className="text-center space-y-1">
              <h2 className="font-display font-bold text-xl text-white">Set Up Your Business Listing</h2>
              <p className="text-xs text-slate-400">
                Welcome{user?.name ? `, ${user.name}` : ''}! Your account doesn't have a
                marketplace listing yet. Add a few details to create it and open your dashboard.
              </p>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Rohini Caterers"
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

            <div>
              <label className="block text-xs text-slate-400 mb-1">Short Description <span className="text-slate-600">(optional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Tell customers what your business offers."
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
              />
            </div>

            {createNotice && (
              <p className="text-xs text-rose-400 text-center">{createNotice}</p>
            )}

            <button
              onClick={handleCreateListing}
              disabled={creatingListing}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm shadow-md hover:brightness-110 disabled:opacity-60"
            >
              {creatingListing && <Loader2 className="w-4 h-4 animate-spin" />}
              {creatingListing ? 'Creating your listing…' : 'Create Listing & Continue'}
            </button>
            <p className="text-[11px] text-slate-600 text-center">
              You can edit all of this later in Business Profile.
            </p>
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
            { key: 'facilities', label: 'Facilities & Options' },
            { key: 'packages', label: `${myVendor?.category === 'Venue' ? 'Halls' : 'Packages'}${packages.length ? ` (${packages.length})` : ''}` },
            ...(myVendor?.category !== 'Invitation' ? [{ key: 'availability', label: 'Availability' }] : []),
            { key: 'portfolio', label: 'Local Disk Portfolio' },
            { key: 'profile', label: 'Business Profile' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
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
              <div className="glass-card p-5 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">Confirmed Bookings</span>
                <div className="font-display font-extrabold text-2xl text-white mt-1">{confirmedBookings.length}</div>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-amber-400 uppercase">Pending Quotes</span>
                <div className="font-display font-extrabold text-2xl text-amber-400 mt-1">
                  {bookings.filter((b) => b.status === 'quote_requested' || b.status === 'enquiry').length}
                </div>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">Partner Rating</span>
                <div className="font-display font-extrabold text-2xl text-amber-400 mt-1 flex items-center gap-1">
                  <Star className="w-5 h-5 fill-amber-400" /> {myVendor.ratingAverage} ({myVendor.reviewCount} Reviews)
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

            <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
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
                          Package: <strong className="text-slate-200">{b.packageName}</strong> • Date: <strong className="text-amber-400">{b.eventDate}</strong>
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
                <SlidersHorizontal className="w-5 h-5 text-amber-400" /> Facilities &amp; Options
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
                      return (
                        <div key={a.key} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                            <Check className="w-3.5 h-3.5" /> {a.label}
                          </div>
                          {items.map((it, i) => (
                            <div key={i} className="flex items-center gap-2 flex-wrap">
                              <input
                                value={it.name}
                                onChange={(e) => updateOptionItem(a.label, i, 'name', e.target.value)}
                                placeholder={`e.g. ${a.example}`}
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

                  <div className={`grid grid-cols-1 ${myVendor?.category === 'Catering' ? 'sm:grid-cols-1' : myVendor?.category === 'Pujari/Priest' || myVendor?.category === 'Security' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                        {myVendor?.category === 'Catering' ? 'Price per plate (₹)' : myVendor?.category === 'Security' ? 'Cost per person (₹)' : 'Price (₹)'}
                      </label>
                      <input
                        type="number"
                        value={p.price || ''}
                        onChange={(e) => updatePackageField(p.id, 'price', e.target.value)}
                        placeholder={myVendor?.category === 'Catering' ? '500' : myVendor?.category === 'Security' ? '2000' : '150000'}
                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                      />
                    </div>
                    {myVendor?.category !== 'Pujari/Priest' && myVendor?.category !== 'Security' && myVendor?.category !== 'Catering' && (
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                          {myVendor?.category === 'Return Gifts' ? 'Count of items' : 'Capacity (persons)'}
                        </label>
                        <input
                          type="number"
                          value={p.capacityPersons ?? ''}
                          onChange={(e) => updatePackageField(p.id, 'capacityPersons', e.target.value)}
                          placeholder={myVendor?.category === 'Return Gifts' ? '100' : '500'}
                          className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                        />
                      </div>
                    )}
                    {myVendor?.category !== 'Pujari/Priest' && myVendor?.category !== 'Security' && myVendor?.category !== 'Catering' && (
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                          {myVendor?.category === 'Return Gifts' ? 'Packing time (days)' : 'Duration (hours)'}
                        </label>
                        <input
                          type="number"
                          value={p.durationHours ?? ''}
                          onChange={(e) => updatePackageField(p.id, 'durationHours', e.target.value)}
                          placeholder={myVendor?.category === 'Return Gifts' ? '2' : '8'}
                          className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                        />
                      </div>
                    )}
                  </div>

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

                      {/* Price tiers — vendor names them (Normal / HD / Premium, etc.) */}
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5">
                          {myVendor?.category === 'Catering' ? 'Serving options (optional — e.g. For 2 Persons / Jumbo)' : 'Price tiers (optional — e.g. Normal / HD / Premium)'}
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
                            <Plus className="w-3.5 h-3.5" /> {myVendor?.category === 'Catering' ? 'Add serving option' : 'Add tier'}
                          </button>
                        </div>
                      </div>

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
              {myVendor?.category !== 'Pujari/Priest' &&
                myVendor?.category !== 'Printing' &&
                myVendor?.category !== 'Flowers' &&
                myVendor?.category !== 'Security' &&
                myVendor?.category !== 'Cleaning' &&
                myVendor?.category !== 'Rental Equipment' &&
                myVendor?.category !== 'Utensils for Rent' &&
                myVendor?.category !== 'Wedding Planner' &&
                myVendor?.category !== 'Corporate Event Services' &&
                myVendor?.category !== 'Venue' &&
                myVendor?.category !== 'Catering' && (
                <button
                  type="button"
                  onClick={addTierPackages}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300"
                >
                  <Plus className="w-4 h-4" /> Quick-add tiers ({tierNamesForCategory(myVendor.category).join(' / ')})
                </button>
              )}
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
        {activeTab === 'availability' && myVendor?.category !== 'Invitation' && (
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-2xl space-y-5">
            <div>
              <h3 className="font-bold text-xl text-white">Availability Calendar</h3>
              <p className="text-xs text-slate-400 mt-1">Add the dates you're open to book. Customers can only request these dates.</p>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Add an available date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="date-input-amber w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                />
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
              <div className="flex flex-wrap gap-2">
                {availableDates.map((d) => (
                  <span key={d} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold">
                    {new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    <button type="button" onClick={() => removeDate(d)} aria-label={`Remove ${d}`} className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-emerald-500/40 hover:text-white">×</button>
                  </span>
                ))}
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
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-2xl mx-auto space-y-4">
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
        )}

      </main>
      )}

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        © 2026 Magizhnaazh Vendor Management Portal — Port 3001
      </footer>
    </div>
  );
}