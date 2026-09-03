import React, { useState, useEffect, useRef } from 'react';
import { Role, User, Vendor, Event, Booking, Invitation, Guest, EventFeedback } from '../../../packages/shared-types';
import { playNotificationSound } from './notificationSound';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { HeroSection } from './components/HeroSection';
import { VendorMarketplace } from './components/VendorMarketplace';
import { VendorDetailModal } from './components/VendorDetailModal';
import { VendorCompareModal } from './components/VendorCompareModal';
import { WishlistModal } from './components/WishlistModal';
import { EventWizardModal } from './components/EventWizardModal';
import { SmartBudgetPlanner } from './components/SmartBudgetPlanner';
import { CanvaInvitationDesigner } from './components/CanvaInvitationDesigner';
import { ShareLinkModal } from './components/ShareLinkModal';
import { inviteUrl } from './publicUrl';
import { GuestManagement } from './components/GuestManagement';
import { MyOrders } from './components/MyOrders';
import { FeedbackModule } from './components/FeedbackModule';
import { FloralGoldBackground } from './components/FloralGoldBackground';
import { INVITATION_TEMPLATES } from '../../../packages/canvas-engine';
import {
  fetchEvents,
  fetchVendors,
  updateEventBudget,
  createBookingQuote,
  fetchInvitationForEvent,
  createInvitation,
  updateInvitationCanvas,
  fetchGuestsForEvent,
  addGuest,
  fetchMyBookings,
  fetchLocations,
  fetchPublicSettings,
  ApiError,
  GATEWAY_URL,
} from './api';
import { groupCitiesByState, STATIC_CITY_GROUPS } from '../../../packages/shared-utils';
import { MessageSquare, CheckCircle2 } from 'lucide-react';

const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'vnd-1',
    userId: 'usr-vendor-1',
    businessName: 'The Leela Palace Grand Ballroom',
    category: 'Venue',
    description: 'Luxury sea-facing banquets and grand ballroom in Chennai for royal weddings, grand receptions, and corporate galas.',
    location: {
      type: 'Point',
      coordinates: [80.2707, 13.0827],
      address: 'Adyar Seaface, MRC Nagar',
      city: 'Chennai',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600028',
    },
    startingPrice: 150000,
    yearsOfExperience: 12,
    ratingAverage: 4.9,
    reviewCount: 142,
    isVerified: true,
    isSuspended: false,
    featured: true,
    galleryImages: [
      'https://images.unsplash.com/photo-1712314947761-a8d718bd8c32?w=800',
      'https://images.unsplash.com/photo-1655516433028-9e0e1599cf8b?w=800',
      'https://images.unsplash.com/photo-1780542900375-0cf459e38fbb?w=800',
    ],
    galleryVideos: ['https://videos.pexels.com/video-files/34926867/14794509_640_360_24fps.mp4'],
    contactEmail: 'events@leelachennai.com',
    contactPhone: '+91 44 33661234',
    packages: [
      { id: 'pkg-1-1', packageName: 'Royal Ballroom Package', price: 150000, description: 'AC Ballroom hall for 600 guests, stage setup, basic lighting.', includedServices: ['Hall Rent', 'Stage Decor', 'Centralized AC', 'VIP Suite'] },
      { id: 'pkg-1-2', packageName: 'Luxury Ocean View Deck', price: 250000, description: 'Outdoor seaside lawn + grand indoor hall for 1200 guests.', includedServices: ['Ocean Lawn', 'Valet Parking', 'Power Backup', '2 Executive Rooms'] }
    ],
    availableDates: ['2026-10-15', '2026-11-20', '2026-12-15'],
    policies: { cancellation: '50% refund up to 30 days prior', refund: 'Processed in 7 days', advancePercentage: 30 },
    facilities: {
      acRoom: true,
      fansOnly: false,
      brideGroomRoom: true,
      guestRoomAttachedWashroom: true,
      dormitoryHall: false,
      separateGuestWashroom: true,
      cookingUtensils: false,
      waterFilter: true,
      vipRoom: true,
      vipFrontChairs: true,
      garlands: true,
      catering: 'extra_cost',
      decoration: 'included',
      djService: 'not_offered',
      transport: 'not_offered',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vnd-5',
    userId: 'usr-vendor-5',
    businessName: 'Green Meadows Community Hall',
    category: 'Venue',
    description: 'Budget-friendly community hall with dormitory-style seating, ideal for large family functions and modest weddings.',
    location: {
      type: 'Point',
      coordinates: [76.9558, 11.0168],
      address: 'Sathy Road, Ganapathy',
      city: 'Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641006',
    },
    startingPrice: 25000,
    yearsOfExperience: 6,
    ratingAverage: 4.3,
    reviewCount: 58,
    isVerified: true,
    isSuspended: false,
    featured: false,
    galleryImages: [
      'https://images.unsplash.com/photo-1786062841848-18177898b3a7?w=800',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
      'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=800',
    ],
    galleryVideos: ['https://videos.pexels.com/video-files/11918060/11918060-sd_640_360_25fps.mp4'],
    contactEmail: 'bookings@greenmeadowshall.in',
    contactPhone: '+91 9843112200',
    packages: [
      { id: 'pkg-5-1', packageName: 'Community Hall Basic', price: 25000, description: 'Fan-cooled hall for 300 guests with dormitory seating and shared washrooms.', includedServices: ['Hall Rent', 'Basic Lighting', 'Sound System'] }
    ],
    availableDates: ['2026-10-20', '2026-11-10'],
    policies: { cancellation: 'No refund within 15 days', refund: 'Standard', advancePercentage: 20 },
    facilities: {
      acRoom: false,
      fansOnly: true,
      brideGroomRoom: false,
      guestRoomAttachedWashroom: false,
      dormitoryHall: true,
      separateGuestWashroom: true,
      cookingUtensils: true,
      waterFilter: true,
      vipRoom: true,
      vipFrontChairs: false,
      garlands: true,
      catering: 'not_offered',
      decoration: 'not_offered',
      djService: 'extra_cost',
      transport: 'not_offered',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vnd-6',
    userId: 'usr-vendor-6',
    businessName: 'Royal Orchid Convention Centre',
    category: 'Venue',
    description: 'Full-service AC convention centre with dedicated bride and groom suites, guest rooms, in-house catering, and DJ setup.',
    location: {
      type: 'Point',
      coordinates: [80.2101, 13.0382],
      address: 'Anna Nagar West',
      city: 'Chennai',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600040',
    },
    startingPrice: 95000,
    yearsOfExperience: 8,
    ratingAverage: 4.6,
    reviewCount: 112,
    isVerified: true,
    isSuspended: false,
    featured: true,
    galleryImages: [
      'https://images.unsplash.com/photo-1780542900375-0cf459e38fbb?w=800',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
    ],
    galleryVideos: ['https://videos.pexels.com/video-files/31501465/13430836_640_360_60fps.mp4'],
    contactEmail: 'info@royalorchidconvention.com',
    contactPhone: '+91 9840556677',
    packages: [
      { id: 'pkg-6-1', packageName: 'All-Inclusive Wedding Package', price: 95000, description: 'AC hall for 800 guests, bride and groom suites, in-house catering and DJ.', includedServices: ['AC Hall', 'Bride/Groom Suite', 'Guest Rooms', 'In-house Catering', 'DJ Setup'] }
    ],
    availableDates: ['2026-11-01', '2026-12-05'],
    policies: { cancellation: '40% refund up to 20 days prior', refund: 'Processed in 10 days', advancePercentage: 30 },
    facilities: {
      acRoom: true,
      fansOnly: false,
      brideGroomRoom: true,
      guestRoomAttachedWashroom: true,
      dormitoryHall: false,
      separateGuestWashroom: true,
      cookingUtensils: false,
      waterFilter: true,
      vipRoom: false,
      vipFrontChairs: false,
      garlands: false,
      catering: 'included',
      decoration: 'extra_cost',
      djService: 'included',
      transport: 'extra_cost',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vnd-2',
    userId: 'usr-vendor-2',
    businessName: 'Grand Chettinad Feast Caterers',
    category: 'Catering',
    description: 'Authentic South Indian banana leaf wedding feast, live counters, traditional sweets, and multi-cuisine buffet spreads.',
    location: {
      type: 'Point',
      coordinates: [80.2101, 13.0382],
      address: '12, MGR Salai, T. Nagar',
      city: 'Chennai',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600017',
    },
    startingPrice: 450,
    yearsOfExperience: 18,
    ratingAverage: 4.8,
    reviewCount: 215,
    isVerified: true,
    isSuspended: false,
    featured: true,
    galleryImages: [
      'https://images.unsplash.com/photo-1555244162-803834f70033?w=800',
      'https://images.unsplash.com/photo-1646578515903-67873a5398f9?w=800',
      'https://images.unsplash.com/photo-1581546085212-f25477a9d4fb?w=800',
    ],
    galleryVideos: ['https://videos.pexels.com/video-files/9797433/9797433-sd_640_360_25fps.mp4'],
    contactEmail: 'contact@chettinadcatering.in',
    contactPhone: '+91 9444012345',
    packages: [
      { id: 'pkg-2-1', packageName: 'Traditional Banana Leaf Meal', price: 450, description: '30-item South Indian traditional feast served on fresh banana leaf.', includedServices: ['Elai Sappadu', 'Live Jigarthanda', 'Welcome Drink', 'Service Staff'] },
      { id: 'pkg-2-2', packageName: 'Grand Multi-Cuisine Wedding Buffet', price: 750, description: 'South Indian + North Indian + Chinese live counters & dessert bar.', includedServices: ['Live Chaat', 'Italian Pasta Counter', 'Mocktail Bar', 'Uniformed Stewards'] }
    ],
    availableDates: ['2026-10-15', '2026-12-15'],
    policies: { cancellation: '30% advance non-refundable', refund: 'Credit note available', advancePercentage: 25 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vnd-3',
    userId: 'usr-vendor-3',
    businessName: 'Candid Tales Photography & Cinema',
    category: 'Media',
    description: 'Award-winning candid wedding photographers, traditional photojournalism, cinematic wedding films, and drone coverage.',
    location: {
      type: 'Point',
      coordinates: [80.2496, 13.0604],
      address: 'Kodambakkam High Road',
      city: 'Chennai',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600034',
    },
    startingPrice: 65000,
    yearsOfExperience: 9,
    ratingAverage: 4.95,
    reviewCount: 98,
    isVerified: true,
    isSuspended: false,
    featured: true,
    galleryImages: [
      'https://images.unsplash.com/photo-1574397188309-e83dfe918ecb?w=800',
      'https://images.unsplash.com/photo-1670296047577-36c2c1281a85?w=800',
      'https://images.unsplash.com/photo-1640290699030-b477f95f13b2?w=800',
    ],
    galleryVideos: ['https://videos.pexels.com/video-files/5591916/5591916-sd_640_360_25fps.mp4'],
    contactEmail: 'hello@candidtales.com',
    contactPhone: '+91 9840998877',
    packages: [
      { id: 'pkg-3-1', packageName: 'Candid & Traditional Combo', price: 65000, description: '2 Candid Photographers, 1 Traditional Photographer, Photobook Album.', includedServices: ['Unlimited High-Res Photos', '1 Premium Canvera Album (50 pages)', 'Pre-wedding Shoot'], durationHours: 10 },
      { id: 'pkg-3-2', packageName: 'Pre-Wedding Story Shoot', price: 25000, description: 'Half-day outdoor pre-wedding concept shoot with styling and edits.', includedServices: ['1 Candid Photographer', '80 Retouched Photos', '1 Location + Props', 'Reel-ready Edits'], durationHours: 5 },
      { id: 'pkg-3-3', packageName: 'Cinematic Film + Drone', price: 95000, description: 'Full-day cinematic wedding film with 4K drone aerial coverage.', includedServices: ['2 Cinematographers', '4K Drone Coverage', '3-4 min Teaser Film', 'Full-length Wedding Film'], durationHours: 12 },
      { id: 'pkg-3-4', packageName: 'Reception Coverage', price: 40000, description: 'Evening reception candid + traditional coverage with same-day highlights.', includedServices: ['2 Photographers', 'Stage & Guest Coverage', 'Same-Day Highlight Reel', '300+ Edited Photos'], durationHours: 6 },
      { id: 'pkg-3-5', packageName: 'Live Streaming (Multi-Cam)', price: 22000, description: 'Broadcast the wedding live so relatives can watch from anywhere on mobile.', includedServices: ['3-Camera Live Mixing', 'YouTube / Zoom / Meet Link', 'Full-HD Stream', 'Recorded Copy'], durationHours: 6 },
      { id: 'pkg-3-6', packageName: 'LED Wall Screens', price: 40000, description: 'Large LED screens at the venue so every guest sees the ceremony up close.', includedServices: ['2 × P3 LED Walls', 'Live Camera Feed to Screen', 'On-site Technician', 'Setup & Dismantle'], durationHours: 8 },
    ],
    availableDates: ['2026-11-05', '2026-12-15'],
    policies: { cancellation: 'Standard', refund: 'Standard', advancePercentage: 40 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vnd-4',
    userId: 'usr-vendor-4',
    businessName: 'Flora Dreams Floral & Theme Decorators',
    category: 'Decoration',
    description: 'Transforming wedding halls and event venues with fresh flowers, royal mandap designs, crystal chandeliers, and LED backdrops.',
    location: {
      type: 'Point',
      coordinates: [76.9558, 11.0168],
      address: 'RS Puram Main Road',
      city: 'Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641002',
    },
    startingPrice: 40000,
    yearsOfExperience: 10,
    ratingAverage: 4.7,
    reviewCount: 76,
    isVerified: true,
    isSuspended: false,
    featured: false,
    galleryImages: [
      'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800',
      'https://images.unsplash.com/photo-1640355105827-2aa98e908a7b?w=800',
      'https://images.unsplash.com/photo-1762709118823-7fe9c9afa8ff?w=800',
    ],
    galleryVideos: ['https://videos.pexels.com/video-files/13038199/13038199-sd_640_360_25fps.mp4'],
    contactEmail: 'contact@floradreams.in',
    contactPhone: '+91 9443011223',
    packages: [
      { id: 'pkg-4-1', packageName: 'Traditional Temple Mandap', price: 40000, description: 'Marigold & Jasmine flower mandap setup with wooden pillars.', includedServices: ['Mandap Decor', 'Entrance Arch', 'Stage Backdrop'] }
    ],
    availableDates: ['2026-10-15', '2026-12-15'],
    policies: { cancellation: 'Non-refundable advance', refund: 'None', advancePercentage: 35 },
    createdAt: new Date().toISOString(),
  },
];

// Friendly phrasing for the booking-status-change toast — fires whenever a
// vendor moves one of the customer's bookings forward (accepts a quote,
// marks it in progress, completes it, etc).
const STATUS_NOTICE: Record<string, string> = {
  confirmed: 'accepted',
  in_progress: 'now in progress',
  completed: 'completed',
  cancelled: 'cancelled',
  refunded: 'refunded',
};

// A real logged-in customer who hasn't created any event yet gets this empty
// placeholder instead of the Felix demo — its empty id makes the invitation
// effect skip link generation, so a share link only ever gets minted from an
// event the customer actually created.
const EMPTY_EVENT: Event = {
  id: '',
  userId: '',
  title: '',
  eventType: '',
  date: '',
  location: { city: '' },
  guestCount: 0,
  totalBudget: 0,
  spentBudget: 0,
  status: 'planning',
  budgetBreakdown: [],
  tasks: [],
  schedule: [],
  bookedVendorIds: [],
  createdAt: new Date().toISOString(),
};

const FALLBACK_EVENT: Event = {
  id: 'evt-101',
  userId: 'usr-customer-1',
  title: 'Felix & Priya Wedding Celebration',
  eventType: 'Wedding',
  date: '2026-12-15',
  location: {
    city: 'Chennai',
    venueName: 'The Leela Palace Grand Ballroom',
    address: 'MRC Nagar, Chennai',
  },
  guestCount: 500,
  totalBudget: 800000,
  spentBudget: 295000,
  status: 'planning',
  budgetBreakdown: [
    { id: 'b-1', category: 'Venue', allocatedPercentage: 25, allocatedAmount: 200000, actualSpent: 150000 },
    { id: 'b-2', category: 'Catering', allocatedPercentage: 25, allocatedAmount: 200000, actualSpent: 0 },
    { id: 'b-3', category: 'Decoration', allocatedPercentage: 12, allocatedAmount: 96000, actualSpent: 80000 },
    { id: 'b-4', category: 'Media', allocatedPercentage: 10, allocatedAmount: 80000, actualSpent: 65000 },
    { id: 'b-5', category: 'Makeup & Beauty', allocatedPercentage: 5, allocatedAmount: 40000, actualSpent: 0 },
    { id: 'b-6', category: 'Transport', allocatedPercentage: 5, allocatedAmount: 40000, actualSpent: 0 },
    { id: 'b-7', category: 'Invitation', allocatedPercentage: 3, allocatedAmount: 24000, actualSpent: 0 },
    { id: 'b-8', category: 'Return Gifts', allocatedPercentage: 5, allocatedAmount: 40000, actualSpent: 0 },
    { id: 'b-9', category: 'Other', allocatedPercentage: 10, allocatedAmount: 80000, actualSpent: 0 },
  ],
  tasks: [
    { id: 't-1', title: 'Book Wedding Venue', category: 'Venue', completed: true, dueDate: '2026-09-01', priority: 'high' },
    { id: 't-2', title: 'Finalize Feast Caterer Menu', category: 'Catering', completed: false, dueDate: '2026-09-15', priority: 'high' },
    { id: 't-3', title: 'Book Photographer & Cinematic Videographer', category: 'Media', completed: true, dueDate: '2026-09-20', priority: 'high' },
  ],
  schedule: [
    { id: 's-1', time: '07:00 AM', activity: 'Groom & Bride Prep / Makeup', location: 'Green Room' },
    { id: 's-2', time: '09:00 AM', activity: 'Muhurtham & Sacred Ceremony', location: 'Grand Mandap' },
    { id: 's-3', time: '12:30 PM', activity: 'Grand Traditional Banana Leaf Feast', location: 'Dining Hall' },
  ],
  bookedVendorIds: ['vnd-1', 'vnd-3'],
  createdAt: new Date().toISOString(),
};

const INITIAL_INVITATION: Invitation = {
  id: 'inv-101',
  eventId: 'evt-101',
  inviteToken: 'wed-felix-2026',
  templateId: 'tmpl-royal-wedding',
  eventTitle: 'Felix & Priya Wedding Celebration',
  hostName: 'Felix & Family',
  date: '2026-12-15',
  time: '10:00 AM',
  venueName: 'The Leela Palace Grand Ballroom',
  venueAddress: 'Adyar Seaface, MRC Nagar, Chennai',
  mapLocationUrl: 'https://maps.google.com/?q=The+Leela+Palace+Chennai',
  message: 'We request the honor of your presence to celebrate the grand wedding of Felix & Priya.',
  canvasData: {
    width: 400,
    height: 600,
    backgroundColor: '#1E1B4B',
    elements: INVITATION_TEMPLATES[0].elements,
  },
  createdAt: new Date().toISOString(),
};

// Shown when there's no active event yet — an invitation with no token, so the
// "Share Web RSVP Link" button knows there's no real link to share.
const EMPTY_INVITATION: Invitation = {
  ...INITIAL_INVITATION,
  id: '',
  eventId: '',
  inviteToken: '',
  eventTitle: '',
};

// Builds canvas elements personalised to a specific event, so a new
// invitation's designer reflects THAT event (its title, date, venue) instead of
// the static "Felix & Priya wedding" template being copied onto every event —
// which made a baby shower's designer still read as a wedding. `token`, when
// known, points the QR element at the event's real invite link.
function buildEventCanvasData(event: Event, token?: string): Invitation['canvasData'] {
  const base = INVITATION_TEMPLATES[0];
  let dateLabel = event.date;
  try {
    dateLabel = new Date(`${event.date}T00:00:00`)
      .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      .toUpperCase();
  } catch {
    /* keep the raw date string if it can't be parsed */
  }
  const time = INITIAL_INVITATION.time;
  const venue =
    [event.location.venueName, event.location.address || event.location.city].filter(Boolean).join(', ') || 'Venue TBD';
  const occasion = event.eventType
    ? `TO CELEBRATE THE ${event.eventType.toUpperCase()}`
    : 'TO CELEBRATE THIS SPECIAL OCCASION';

  const elements = base.elements.map((el) => {
    switch (el.id) {
      case 'el-header':
        return { ...el, content: "YOU'RE CORDIALLY INVITED" };
      case 'el-title':
        return { ...el, content: (event.title || 'Our Celebration').toUpperCase() };
      case 'el-sub':
        return { ...el, content: occasion };
      case 'el-date':
        return { ...el, content: `${dateLabel} • ${time}` };
      case 'el-venue':
        return { ...el, content: venue };
      case 'el-qr':
        return token ? { ...el, content: inviteUrl(token) } : { ...el };
      default:
        return { ...el };
    }
  });

  return { width: 400, height: 600, backgroundColor: base.backgroundColor, elements };
}

// A short, event-appropriate invitation message (shown as the quote on the
// public invite page) — replaces the hardcoded Felix & Priya wedding line.
function buildEventMessage(event: Event): string {
  const occasion = event.eventType ? ` — our ${event.eventType.toLowerCase()}` : '';
  return `We request the pleasure of your company at ${event.title}${occasion}.`;
}

const INITIAL_GUESTS: Guest[] = [
  { id: 'g-1', eventId: 'evt-101', name: 'Dr. R. Venkatraman', email: 'venkat@gmail.com', phone: '+91 9840112233', group: 'Groom Family', status: 'accepted', adultsCount: 2, childrenCount: 1, dietaryPreference: 'Veg', needsTransport: true, needsAccommodation: true, invitedAt: new Date().toISOString() },
  { id: 'g-2', eventId: 'evt-101', name: 'Suresh & Anitha Kumar', email: 'suresh@yahoo.com', phone: '+91 9840223344', group: 'Bride Family', status: 'accepted', adultsCount: 2, childrenCount: 0, dietaryPreference: 'Veg', needsTransport: false, needsAccommodation: false, invitedAt: new Date().toISOString() },
  { id: 'g-3', eventId: 'evt-101', name: 'Karthik Raja', email: 'karthik@tech.com', phone: '+91 9840334455', group: 'College Friends', status: 'invited', adultsCount: 1, childrenCount: 0, dietaryPreference: 'Non-Veg', needsTransport: false, needsAccommodation: false, invitedAt: new Date().toISOString() },
];

const INITIAL_FEEDBACK: EventFeedback[] = [
  { id: 'fb-1', eventId: 'evt-101', feedbackToken: 'wed-felix-2026', guestName: 'Kavitha S.', overallRating: 5, venueRating: 5, cateringRating: 5, decorationRating: 5, comments: 'The banana leaf feast and ocean deck venue were truly magnificent!', createdAt: new Date().toISOString() },
];

function deduplicateVendors(list: Vendor[]): Vendor[] {
  const seenIds = new Set<string>();
  const seenNameCats = new Set<string>();
  const result: Vendor[] = [];

  for (const v of list) {
    if (!v || !v.id) continue;
    if (seenIds.has(v.id)) continue;
    const nameCatKey = `${(v.businessName || '').toLowerCase().trim()}||${(v.category || '').toLowerCase().trim()}||${(v.location?.city || '').toLowerCase().trim()}`;
    if (seenNameCats.has(nameCatKey)) continue;

    seenIds.add(v.id);
    seenNameCats.add(nameCatKey);
    result.push(v);
  }
  return result;
}

export function App() {
  const [activeTab, setActiveTab] = useState<string>('marketplace');
  const [vendors, setVendors] = useState<Vendor[]>(() => deduplicateVendors(INITIAL_VENDORS));
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<Event>(EMPTY_EVENT);
  const [invitation, setInvitation] = useState<Invitation>(INITIAL_INVITATION);
  const [guests, setGuests] = useState<Guest[]>(INITIAL_GUESTS);
  const [feedbackList, setFeedbackList] = useState<EventFeedback[]>(INITIAL_FEEDBACK);

  const [selectedVendorForModal, setSelectedVendorForModal] = useState<Vendor | null>(null);
  const [wishlist, setWishlist] = useState<string[]>(['vnd-1', 'vnd-3']);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [showEventWizard, setShowEventWizard] = useState(false);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [notification, setNotification] = useState('');
  const [marketplaceCity, setMarketplaceCity] = useState('All');
  // Location dropdowns are driven by the backend's serviceable-cities list
  // (admin console → GET /api/v1/locations). Falls back to the full static
  // India catalogue until the backend responds (or if it's unreachable).
  const [cityGroups, setCityGroups] = useState<[string, string[]][]>(STATIC_CITY_GROUPS);

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);

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

  // Load the live vendor marketplace from the backend (vendor-service, via the gateway).
  // Public endpoint — runs once on mount regardless of login state. Falls back to the
  // local demo list (INITIAL_VENDORS) if the call fails or returns nothing, so the
  // marketplace is never empty.
  useEffect(() => {
    let cancelled = false;
    setVendorsLoading(true);

    fetchVendors()
      .then((res) => {
        if (cancelled) return;
        const serverVendors = res.data?.vendors || [];
        if (serverVendors.length > 0) {
          setVendors(deduplicateVendors(serverVendors));
        }
      })
      .catch((err) => {
        console.error('Failed to load vendors from server, using local fallback', err);
      })
      .finally(() => {
        if (!cancelled) setVendorsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load the serviceable-cities list from the backend so the location dropdowns
  // reflect what the admin console manages. Only active cities are shown; if the
  // call fails or returns nothing, the static India catalogue (the initial
  // state) stays in place so the dropdowns are never empty.
  useEffect(() => {
    let cancelled = false;

    fetchLocations()
      .then((res) => {
        if (cancelled) return;
        const active = (res.data?.locations || []).filter((c) => c.isActive);
        if (active.length > 0) {
          setCityGroups(groupCitiesByState(active));
        }
      })
      .catch((err) => {
        console.error('Failed to load serviceable cities, using static catalogue', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Apply the site-wide theme the admin chose (shared via platform settings).
  // Uses the last-seen value from localStorage immediately to avoid a flash,
  // then reconciles with the server.
  useEffect(() => {
    const local = (localStorage.getItem('magizhnaazh_theme') as 'light' | 'dark' | null) || 'dark';
    document.documentElement.setAttribute('data-theme', local);

    let cancelled = false;
    fetchPublicSettings()
      .then((res) => {
        if (cancelled) return;
        const theme = res.data?.settings.theme;
        if (theme) {
          localStorage.setItem('magizhnaazh_theme', theme);
          document.documentElement.setAttribute('data-theme', theme);
        }
      })
      .catch(() => {/* keep local theme */});

    return () => {
      cancelled = true;
    };
  }, []);

  // Load this user's real events from the backend (event-budget-service, via the gateway)
  // whenever they're logged in. Falls back to the local demo event if the call fails
  // or the user isn't authenticated yet, so the UI never looks empty.
  useEffect(() => {
    if (!user) {
      setEvents([FALLBACK_EVENT]);
      setActiveEvent(FALLBACK_EVENT);
      return;
    }

    let cancelled = false;
    setEventsLoading(true);

    fetchEvents()
      .then((res) => {
        if (cancelled) return;
        const serverEvents = res.data?.events || [];
        if (serverEvents.length > 0) {
          setEvents(serverEvents);
          setActiveEvent(serverEvents[0]);
        } else {
          // Logged in but no events yet — don't fall back to the Felix demo, so
          // no share link is generated until they create their own event.
          setEvents([]);
          setActiveEvent(EMPTY_EVENT);
        }
      })
      .catch((err) => {
        console.error('Failed to load events from server', err);
        if (!cancelled) {
          setEvents([FALLBACK_EVENT]);
          setActiveEvent(FALLBACK_EVENT);
        }
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Poll for booking status changes while signed in, and pop a toast the
  // moment a vendor moves something forward (accepts a quote, marks it in
  // progress, completes it) — this is how the customer finds out without
  // having to manually reopen My Orders and refresh.
  useEffect(() => {
    if (!user) return;

    const statusKey = `magizh_seen_booking_statuses_${user.id}`;
    let seen: Record<string, string> = {};
    try {
      seen = JSON.parse(localStorage.getItem(statusKey) || '{}');
    } catch {
      seen = {};
    }

    const checkForStatusChanges = () => {
      fetchMyBookings()
        .then((res) => {
          const bookings = res.data?.bookings || [];
          let changed = false;
          for (const b of bookings) {
            const prev = seen[b.id];
            if (prev && prev !== b.status) {
              triggerNotification(`${b.vendorName}: your booking (${b.bookingNumber}) was ${STATUS_NOTICE[b.status] || b.status}.`);
            }
            if (prev !== b.status) {
              seen[b.id] = b.status;
              changed = true;
            }
          }
          if (changed) {
            try {
              localStorage.setItem(statusKey, JSON.stringify(seen));
            } catch {
              /* ignore storage errors */
            }
          }
        })
        .catch(() => {
          /* silent — this is a background check, not user-initiated */
        });
    };

    checkForStatusChanges();
    const interval = setInterval(checkForStatusChanges, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load (or lazily create) the real, backend-persisted invitation for the active
  // event — this is what gives "Share Web RSVP Link" a real, working link instead
  // of the hardcoded local placeholder. Skipped while logged out.
  useEffect(() => {
    // No logged-in user or no real event yet → no link to generate. Clear any
    // stale (e.g. demo) invitation so the Share button doesn't offer a bogus link.
    if (!user || !activeEvent.id) {
      setInvitation(EMPTY_INVITATION);
      return;
    }
    let cancelled = false;

    fetchInvitationForEvent(activeEvent.id)
      .then(async (res) => {
        if (cancelled) return;
        if (res.data?.invitation) {
          const inv = res.data.invitation;
          // Heal older invitations whose canvas is still the untouched default
          // wedding template while the event isn't Felix's wedding — regenerate
          // it from the real event so the designer matches the shared link.
          const titleEl = inv.canvasData?.elements?.find((e) => e.id === 'el-title');
          const stillDefaultTemplate = titleEl?.content === 'FELIX & PRIYA';
          const notFelixWedding = !/felix/i.test(inv.eventTitle || '');
          if (stillDefaultTemplate && notFelixWedding) {
            const canvasData = buildEventCanvasData(activeEvent, inv.inviteToken);
            setInvitation({ ...inv, canvasData });
            updateInvitationCanvas(inv.id, canvasData).catch((err) =>
              console.error('Failed to personalise invitation canvas', err)
            );
          } else {
            setInvitation(inv);
          }
          return;
        }
        const created = await createInvitation({
          eventId: activeEvent.id,
          eventTitle: activeEvent.title,
          hostName: user.name,
          date: activeEvent.date,
          time: INITIAL_INVITATION.time,
          venueName: activeEvent.location.venueName || 'Venue TBD',
          venueAddress: activeEvent.location.address || activeEvent.location.city,
          message: buildEventMessage(activeEvent),
          canvasData: buildEventCanvasData(activeEvent),
        });
        if (!cancelled && created.data?.invitation) {
          const inv = created.data.invitation;
          // Now that the backend has minted the invite token, point the QR at
          // the real link and persist that one correction.
          const canvasData = buildEventCanvasData(activeEvent, inv.inviteToken);
          setInvitation({ ...inv, canvasData });
          updateInvitationCanvas(inv.id, canvasData).catch((err) =>
            console.error('Failed to finalise invitation QR', err)
          );
        }
      })
      .catch((err) => console.error('Failed to load/create invitation', err));

    return () => {
      cancelled = true;
    };
  }, [user, activeEvent.id]);

  // Load this event's real guest roster from the backend — includes any web RSVPs
  // guests submitted through the public /invite/:token link.
  useEffect(() => {
    if (!user || !activeEvent.id) return;
    let cancelled = false;

    fetchGuestsForEvent(activeEvent.id)
      .then((res) => {
        if (!cancelled) setGuests(res.data?.guests || []);
      })
      .catch((err) => console.error('Failed to load guests', err));

    return () => {
      cancelled = true;
    };
  }, [user, activeEvent.id]);

  const handleAuthSuccess = (loggedInUser: User, token: string) => {
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    localStorage.setItem('accessToken', token);
    setUser(loggedInUser);
    setShowAuthModal(false);
    triggerNotification(`Welcome, ${loggedInUser.name}!`);

    // Replay whatever action (e.g. "Book & Pay Advance") triggered the sign-in
    // prompt — otherwise it's silently dropped and the customer has to repeat
    // the click that got them here in the first place.
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    if (pending) pending();
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    setUser(null);
    triggerNotification('Signed out.');
  };

  const pendingActionRef = useRef<(() => void) | null>(null);

  const requireAuth = (action: () => void) => {
    if (!user) {
      pendingActionRef.current = action;
      setShowAuthModal(true);
      return;
    }
    action();
  };

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleCompare = (id: string) => {
    setSelectedCompareIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    playNotificationSound();
    setTimeout(() => setNotification(''), 4000);
  };

  // Opens the share modal only when there's a real, event-backed link. Without
  // an active event there's no token yet, so we nudge them to create one first.
  const openShareLink = () => {
    if (!invitation.inviteToken) {
      triggerNotification('Create an event first — the RSVP link is generated from your event.');
      return;
    }
    setShowShareLinkModal(true);
  };

  return (
    <div className="relative min-h-screen text-[#fdf1f5] flex flex-col font-sans">
      {/* App-wide gold + olive floral backdrop, fixed behind all scrolling content */}
      <div id="app-bg" className="fixed inset-0 -z-10">
        <FloralGoldBackground />
      </div>

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wishlistCount={wishlist.length}
        onOpenWishlist={() => setShowWishlistModal(true)}
        openEventWizard={() => requireAuth(() => setShowEventWizard(true))}
        user={user}
        onSignIn={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {notification && (
        <div className="bg-[#e85d8a] text-[#1a0a14] py-3 px-4 text-center font-bold text-xs sticky top-20 z-40 shadow-xl flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {notification}
        </div>
      )}

      <main className="flex-1 relative z-10">
        {activeTab === 'marketplace' && (
          <>
            <HeroSection
              onSearch={(params) => {
                setMarketplaceCity(params.city);
                triggerNotification(
                  `Showing vendors for ${params.eventType} in ${params.city} — ${params.guests} guests, ₹${(params.budget / 100000).toFixed(1)}L budget`
                );
                document.getElementById('vendor-marketplace-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              openEventWizard={() => requireAuth(() => setShowEventWizard(true))}
              cityGroups={cityGroups}
            />

            <VendorMarketplace
              vendors={vendors}
              onSelectVendor={(v) => setSelectedVendorForModal(v)}
              wishlist={wishlist}
              toggleWishlist={toggleWishlist}
              selectedCompareIds={selectedCompareIds}
              toggleCompare={toggleCompare}
              openCompareModal={() => setShowCompareModal(true)}
              selectedCity={marketplaceCity}
              onCityChange={setMarketplaceCity}
              cityGroups={cityGroups}
            />
          </>
        )}

        {activeTab === 'events' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-3xl text-[#fdf1f5]">My Planned Events</h2>
                <p className="text-[#cf9bb3] text-sm mt-1">Manage active plans, checklists, and vendor bookings</p>
              </div>

              <button
                onClick={() => requireAuth(() => setShowEventWizard(true))}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c9a648] to-[#b8860b] text-[#1a0a14] font-bold text-xs shadow-md"
              >
                + Create New Event
              </button>
            </div>

            {eventsLoading && (
              <div className="text-center py-10 text-[#cf9bb3] text-sm">Loading your events...</div>
            )}

            {!eventsLoading && events.length === 0 && (
              <div className="text-center py-16 text-[#cf9bb3] text-sm">
                You haven't created any events yet. Click "Create New Event" to get started.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((evt) => (
                <div key={evt.id} className="glass-card-gold glass-card-gold-hover p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-[#d4af37]/15 text-[#e8c874] font-bold text-xs">
                      {evt.eventType}
                    </span>
                    <span className="text-xs text-[#cf9bb3] font-semibold">{evt.date}</span>
                  </div>

                  <h3 className="font-display font-bold text-2xl text-[#fdf1f5]">{evt.title}</h3>

                  <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-xl bg-[#26101c]/70 border border-[#6b2140]/60">
                      <span className="text-[#cf9bb3] block">Total Target</span>
                      <span className="font-bold text-[#fdf1f5]">₹{evt.totalBudget.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#26101c]/70 border border-[#6b2140]/60">
                      <span className="text-[#cf9bb3] block">Spent</span>
                      <span className="font-bold text-[#f0c869]">₹{evt.spentBudget.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#26101c]/70 border border-[#6b2140]/60">
                      <span className="text-[#cf9bb3] block">Guests</span>
                      <span className="font-bold text-[#e85d8a]">{evt.guestCount} Attendees</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#6b2140]/60 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        setActiveEvent(evt);
                        setActiveTab('budget');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-[#c9a648] hover:bg-[#d4af37] text-[#1a0a14] font-bold text-xs shadow-md"
                    >
                      Open Smart Budget Planner
                    </button>

                    <button
                      onClick={() => {
                        setActiveEvent(evt);
                        setActiveTab('guests');
                      }}
                      className="py-2.5 px-4 rounded-xl bg-[#26101c] border border-[#6b2140]/60 hover:border-[#d4af37]/50 text-[#f5c9dc] font-bold text-xs"
                    >
                      Manage Guests ({guests.length})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <SmartBudgetPlanner
            event={activeEvent}
            vendors={vendors}
            onSelectVendor={(v) => setSelectedVendorForModal(v)}
            onUpdateEventBudget={(updatedBreakdown) => {
              const updated = { ...activeEvent, budgetBreakdown: updatedBreakdown };
              setActiveEvent(updated);
              setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
              // Persist the new allocation to the backend so it isn't lost on refresh
              // and so admin/vendor views stay in sync.
              updateEventBudget(updated.id, updatedBreakdown).catch((err) =>
                console.error('Failed to persist budget update', err)
              );
            }}
          />
        )}

        {activeTab === 'invitations' && (
          <CanvaInvitationDesigner
            invitation={invitation}
            onSaveInvitation={(updated) => {
              setInvitation(updated);
              updateInvitationCanvas(updated.id, updated.canvasData).catch((err) =>
                console.error('Failed to persist invitation design', err)
              );
              triggerNotification('Canva Invitation design saved successfully!');
            }}
            onOpenPublicView={openShareLink}
          />
        )}

        {activeTab === 'guests' && (
          <GuestManagement
            guests={guests}
            onAddGuest={(newG) => {
              const added: Guest = {
                id: `g-${Date.now()}`,
                eventId: activeEvent.id,
                name: newG.name || 'New Guest',
                phone: newG.phone,
                email: newG.email,
                group: newG.group || 'Family',
                status: 'invited',
                adultsCount: newG.adultsCount || 2,
                childrenCount: 0,
                dietaryPreference: newG.dietaryPreference || 'Veg',
                invitedAt: new Date().toISOString(),
              };
              setGuests([added, ...guests]);
              addGuest({
                eventId: activeEvent.id,
                name: added.name,
                email: added.email,
                phone: added.phone,
                group: added.group,
                adultsCount: added.adultsCount,
                childrenCount: added.childrenCount,
                dietaryPreference: added.dietaryPreference,
              }).catch((err) => console.error('Failed to persist new guest', err));
              triggerNotification(`Guest "${added.name}" added to event roster!`);
            }}
            onShareInviteLink={openShareLink}
          />
        )}

        {activeTab === 'orders' && (
          <MyOrders isAuthenticated={!!user} onSignIn={() => setShowAuthModal(true)} />
        )}

        {activeTab === 'feedback' && (
          <FeedbackModule
            feedbackList={feedbackList}
            eventId={activeEvent?.id}
            onAddFeedback={(fb) => {
              setFeedbackList([fb, ...feedbackList]);
              triggerNotification('Feedback submitted successfully!');
            }}
          />
        )}
      </main>

      {/* Sub-Header Navigation Bar for Feedback and Quick Utilities */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setActiveTab('feedback')}
          className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#b8336a] to-[#6b2140] text-[#fdf1f5] font-bold text-xs shadow-2xl flex items-center gap-2 hover:scale-105 transition-all border border-[#d4af37]/30"
        >
          <MessageSquare className="w-4 h-4" /> Guest Feedback Portal
        </button>
      </div>

      {selectedVendorForModal && (
        <VendorDetailModal
          vendor={selectedVendorForModal}
          onClose={() => setSelectedVendorForModal(null)}
          isAuthenticated={!!user}
          onRequireAuth={() => setShowAuthModal(true)}
          onBookVendor={(v, pkgId, price, notes, eventDate, selectedOptions, referenceImages, timeSlot) => {
            // Named so it can be re-run automatically after a re-login: the
            // customer's `user` staying set doesn't mean their token is
            // still valid (it expires after a few hours), so requireAuth's
            // "already logged in" check alone can't catch a stale session —
            // only the 401 the booking call comes back with can.
            const doBook = () => requireAuth(async () => {
              const p = price || v.startingPrice;
              setBookingInProgress(true);

              try {
                const pkg = v.packages.find((pk) => pk.id === pkgId);
                const quote = await createBookingQuote({
                  vendorId: v.id,
                  vendorName: v.businessName,
                  vendorCategory: v.category,
                  customerName: user?.name,
                  eventId: activeEvent.id,
                  packageId: pkgId,
                  packageName: pkg?.packageName,
                  price: p,
                  eventDate: eventDate || activeEvent.date,
                  timeSlot,
                  notes,
                  selectedOptions,
                  referenceImages,
                  // They've clicked Confirm Order — that's a payment claim, not
                  // a verified payment, so this lands as 'pending_payment'
                  // rather than auto-confirming.
                  // The vendor has to verify and confirm it on their end (My Orders
                  // reflects that as "Awaiting Vendor Confirmation").
                  advancePaymentClaimed: true,
                });
                const spent = quote.data?.booking.agreedPrice ?? p;

                // Credit the spend against the matching budget line (falling back to
                // "Other" if this category isn't broken out) so "Actual Spent to Date"
                // on the Smart Budget dashboard reflects real bookings, not just the
                // top-level spentBudget total.
                const targetCategory = activeEvent.budgetBreakdown.some((b) => b.category === v.category)
                  ? v.category
                  : 'Other';
                const updatedBreakdown = activeEvent.budgetBreakdown.map((b) =>
                  b.category === targetCategory ? { ...b, actualSpent: b.actualSpent + spent } : b
                );

                const updated = {
                  ...activeEvent,
                  spentBudget: activeEvent.spentBudget + spent,
                  budgetBreakdown: updatedBreakdown,
                };
                setActiveEvent(updated);
                setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
                setSelectedVendorForModal(null);

                // Best-effort persist — local state above already reflects the spend
                // immediately, so a failure here (e.g. this is the shared demo fallback
                // event and isn't owned by this account) shouldn't block the booking flow.
                updateEventBudget(updated.id, updatedBreakdown).catch((err) =>
                  console.error('Failed to persist updated budget breakdown', err)
                );

                triggerNotification(
                  `Advance payment submitted for ${v.businessName} — ₹${p.toLocaleString('en-IN')} allocated. ` +
                    `Waiting for the vendor to confirm they've received it.` +
                    (notes ? ` Your request was shared with the vendor.` : '')
                );
                setActiveTab('budget');
              } catch (err: any) {
                console.error('Booking failed', err);
                if (err instanceof ApiError && err.status === 401) {
                  // Session expired while they were browsing — sign them out
                  // locally, prompt sign-in again, and automatically finish
                  // this exact booking once they're back in instead of
                  // silently dropping it.
                  handleLogout();
                  pendingActionRef.current = doBook;
                  setShowAuthModal(true);
                  triggerNotification("Your session expired — sign in again and we'll finish this booking for you.");
                  return;
                }
                // Surface the server's actual reason (e.g. "vendor hasn't opened up
                // this date") instead of a generic retry message when we have one.
                triggerNotification(err?.message || `Booking failed for ${v.businessName} — please try again.`);
              } finally {
                setBookingInProgress(false);
              }
            });
            doBook();
          }}
        />
      )}

      {showCompareModal && (
        <VendorCompareModal
          vendors={vendors.filter((v) => selectedCompareIds.includes(v.id))}
          onClose={() => setShowCompareModal(false)}
          onSelectVendor={(v) => setSelectedVendorForModal(v)}
        />
      )}

      {showWishlistModal && (
        <WishlistModal
          vendors={vendors.filter((v) => wishlist.includes(v.id))}
          onClose={() => setShowWishlistModal(false)}
          onRemove={toggleWishlist}
          onSelectVendor={(v) => {
            setShowWishlistModal(false);
            setSelectedVendorForModal(v);
          }}
        />
      )}

      {showEventWizard && (
        <EventWizardModal
          onClose={() => setShowEventWizard(false)}
          onEventCreated={(newEvent) => {
            setEvents((prev) => [newEvent, ...prev]);
            setActiveEvent(newEvent);
            triggerNotification(`Event "${newEvent.title}" launched! Budget allocated.`);
            setActiveTab('budget');
          }}
        />
      )}

      {showShareLinkModal && (
        <ShareLinkModal
          url={inviteUrl(invitation.inviteToken)}
          title={invitation.eventTitle}
          onClose={() => setShowShareLinkModal(false)}
        />
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} onAuthSuccess={handleAuthSuccess} />
      )}

      <footer className="relative z-10 border-t border-[#6b2140]/50 py-6 text-center text-xs text-[#cf9bb3]">
        © 2026 Magizhnaazh Customer Event Planner Portal — Port 3000
      </footer>
    </div>
  );
}