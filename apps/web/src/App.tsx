import React, { useState, useEffect } from 'react';
import { Role, Vendor, Event, Booking, Invitation, Guest, EventFeedback } from './shared/shared-types';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { VendorMarketplace } from './components/VendorMarketplace';
import { VendorDetailModal } from './components/VendorDetailModal';
import { VendorCompareModal } from './components/VendorCompareModal';
import { EventWizardModal } from './components/EventWizardModal';
import { SmartBudgetPlanner } from './components/SmartBudgetPlanner';
import { CanvaInvitationDesigner } from './components/CanvaInvitationDesigner';
import { PublicInvitationView } from './components/PublicInvitationView';
import { GuestManagement } from './components/GuestManagement';
import { FeedbackModule } from './components/FeedbackModule';
import { VendorDashboard } from './components/VendorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { INVITATION_TEMPLATES } from './shared/canvas-engine';

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
    featured: true,
    galleryImages: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800',
      'https://images.unsplash.com/photo-1545232979-fbf34fe37722?w=800',
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800',
    ],
    contactEmail: 'events@leelachennai.com',
    contactPhone: '+91 44 33661234',
    packages: [
      { id: 'pkg-1-1', packageName: 'Royal Ballroom Package', price: 150000, description: 'AC Ballroom hall for 600 guests, stage setup, basic lighting.', includedServices: ['Hall Rent', 'Stage Decor', 'Centralized AC', 'VIP Suite'] },
      { id: 'pkg-1-2', packageName: 'Luxury Ocean View Deck', price: 250000, description: 'Outdoor seaside lawn + grand indoor hall for 1200 guests.', includedServices: ['Ocean Lawn', 'Valet Parking', 'Power Backup', '2 Executive Rooms'] }
    ],
    availableDates: ['2026-10-15', '2026-11-20', '2026-12-15'],
    policies: { cancellation: '50% refund up to 30 days prior', refund: 'Processed in 7 days', advancePercentage: 30 },
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
    featured: true,
    galleryImages: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
      'https://images.unsplash.com/photo-1610057099443-f63a15701c45?w=800',
    ],
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
    category: 'Photography',
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
    featured: true,
    galleryImages: [
      'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=800',
      'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800',
    ],
    contactEmail: 'hello@candidtales.com',
    contactPhone: '+91 9840998877',
    packages: [
      { id: 'pkg-3-1', packageName: 'Candid & Traditional Combo', price: 65000, description: '2 Candid Photographers, 1 Traditional Photographer, Photobook Album.', includedServices: ['Unlimited High-Res Photos', '1 Premium Canvera Album (50 pages)', 'Pre-wedding Shoot'] }
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
    featured: false,
    galleryImages: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800',
    ],
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

const INITIAL_EVENT: Event = {
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
    { id: 'b-4', category: 'Photography', allocatedPercentage: 10, allocatedAmount: 80000, actualSpent: 65000 },
    { id: 'b-5', category: 'Makeup & Beauty', allocatedPercentage: 5, allocatedAmount: 40000, actualSpent: 0 },
    { id: 'b-6', category: 'Transport', allocatedPercentage: 5, allocatedAmount: 40000, actualSpent: 0 },
    { id: 'b-7', category: 'Invitation', allocatedPercentage: 3, allocatedAmount: 24000, actualSpent: 0 },
    { id: 'b-8', category: 'Return Gifts', allocatedPercentage: 5, allocatedAmount: 40000, actualSpent: 0 },
    { id: 'b-9', category: 'Other', allocatedPercentage: 10, allocatedAmount: 80000, actualSpent: 0 },
  ],
  tasks: [
    { id: 't-1', title: 'Book Wedding Venue', category: 'Venue', completed: true, dueDate: '2026-09-01', priority: 'high' },
    { id: 't-2', title: 'Finalize Feast Caterer Menu', category: 'Catering', completed: false, dueDate: '2026-09-15', priority: 'high' },
    { id: 't-3', title: 'Book Photographer & Cinematic Videographer', category: 'Photography', completed: true, dueDate: '2026-09-20', priority: 'high' },
    { id: 't-4', title: 'Design Digital Web Invitation', category: 'Invitation', completed: false, dueDate: '2026-10-01', priority: 'medium' },
  ],
  schedule: [
    { id: 's-1', time: '07:00 AM', activity: 'Groom & Bride Prep / Makeup', location: 'Green Room' },
    { id: 's-2', time: '09:00 AM', activity: 'Muhurtham & Sacred Ceremony', location: 'Grand Mandap' },
    { id: 's-3', time: '12:30 PM', activity: 'Grand Traditional Banana Leaf Feast', location: 'Dining Hall' },
    { id: 's-4', time: '06:30 PM', activity: 'Evening Reception & Musical DJ Night', location: 'Grand Ballroom' },
  ],
  bookedVendorIds: ['vnd-1', 'vnd-3'],
  createdAt: new Date().toISOString(),
};

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'bk-1001',
    bookingNumber: 'BK-20260808-9481',
    eventId: 'evt-101',
    customerId: 'usr-customer-1',
    vendorId: 'vnd-1',
    vendorName: 'The Leela Palace Grand Ballroom',
    vendorCategory: 'Venue',
    packageId: 'pkg-1-1',
    packageName: 'Royal Ballroom Package',
    agreedPrice: 150000,
    advanceAmountPaid: 45000,
    remainingAmount: 105000,
    status: 'confirmed',
    eventDate: '2026-12-15',
    createdAt: new Date().toISOString(),
  },
];

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

const INITIAL_GUESTS: Guest[] = [
  {
    id: 'gst-1',
    eventId: 'evt-101',
    name: 'Suresh Kumar & Family',
    email: 'suresh@example.com',
    phone: '+91 9841098765',
    group: 'Bride Family',
    status: 'accepted',
    adultsCount: 4,
    childrenCount: 1,
    dietaryPreference: 'Veg',
    needsTransport: true,
    invitedAt: new Date().toISOString(),
  },
  {
    id: 'gst-2',
    eventId: 'evt-101',
    name: 'Anitha & Karthik',
    email: 'anitha@example.com',
    phone: '+91 9884011223',
    group: 'College Friends',
    status: 'accepted',
    adultsCount: 2,
    childrenCount: 0,
    dietaryPreference: 'Non-Veg',
    needsAccommodation: true,
    invitedAt: new Date().toISOString(),
  },
];

const INITIAL_FEEDBACK: EventFeedback[] = [
  {
    id: 'fb-1',
    eventId: 'evt-101',
    feedbackToken: 'fb-wed-felix-2026',
    guestName: 'Anitha',
    overallRating: 5,
    venueRating: 5,
    cateringRating: 5,
    decorationRating: 4,
    comments: 'The traditional banana leaf feast was extraordinary! Stunning venue backdrop.',
    createdAt: new Date().toISOString(),
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState<string>('marketplace');
  const [currentRole, setCurrentRole] = useState<Role>('customer');
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [events, setEvents] = useState<Event[]>([INITIAL_EVENT]);
  const [activeEvent, setActiveEvent] = useState<Event>(INITIAL_EVENT);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [invitation, setInvitation] = useState<Invitation>(INITIAL_INVITATION);
  const [guests, setGuests] = useState<Guest[]>(INITIAL_GUESTS);
  const [feedbackList, setFeedbackList] = useState<EventFeedback[]>(INITIAL_FEEDBACK);

  const [selectedVendorForModal, setSelectedVendorForModal] = useState<Vendor | null>(null);
  const [wishlist, setWishlist] = useState<string[]>(['vnd-1', 'vnd-3']);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showEventWizard, setShowEventWizard] = useState(false);
  const [showPublicInviteModal, setShowPublicInviteModal] = useState(false);

  useEffect(() => {
    async function syncMarketplace() {
      try {
        const res = await fetch('http://localhost:8000/api/v1/vendors');
        const json = await res.json();
        if (json.success && json.data?.vendors?.length > 0) {
          setVendors(json.data.vendors);
        }
      } catch (err) {
        // Fallback to initial vendors data
      }
    }
    syncMarketplace();
  }, []);

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleCompare = (id: string) => {
    setSelectedCompareIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const handleBookVendor = (vendor: Vendor, packageId?: string, price?: number) => {
    const agreedPrice = price || vendor.startingPrice;
    const advancePaid = Math.round(agreedPrice * (vendor.policies.advancePercentage / 100));

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      bookingNumber: `BK-${Date.now().toString().slice(-8)}`,
      eventId: activeEvent.id,
      customerId: 'usr-customer-1',
      vendorId: vendor.id,
      vendorName: vendor.businessName,
      vendorCategory: vendor.category,
      agreedPrice,
      advanceAmountPaid: advancePaid,
      remainingAmount: agreedPrice - advancePaid,
      status: 'confirmed',
      eventDate: activeEvent.date,
      createdAt: new Date().toISOString(),
    };

    setBookings((prev) => [newBooking, ...prev]);

    const updatedBreakdown = activeEvent.budgetBreakdown.map((item) => {
      if (item.category === vendor.category) {
        return { ...item, actualSpent: item.actualSpent + agreedPrice };
      }
      return item;
    });

    const updatedEvent = {
      ...activeEvent,
      spentBudget: activeEvent.spentBudget + agreedPrice,
      budgetBreakdown: updatedBreakdown,
    };

    setActiveEvent(updatedEvent);
    setEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
    setSelectedVendorForModal(null);
    setActiveTab('budget');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        wishlistCount={wishlist.length}
        openEventWizard={() => setShowEventWizard(true)}
      />

      {/* Main Page Layout */}
      <main className="flex-1">
        {activeTab === 'marketplace' && (
          <>
            <HeroSection
              onSearch={() => setActiveTab('marketplace')}
              openEventWizard={() => setShowEventWizard(true)}
            />

            <VendorMarketplace
              vendors={vendors}
              onSelectVendor={(v) => setSelectedVendorForModal(v)}
              wishlist={wishlist}
              toggleWishlist={toggleWishlist}
              selectedCompareIds={selectedCompareIds}
              toggleCompare={toggleCompare}
              openCompareModal={() => setShowCompareModal(true)}
            />
          </>
        )}

        {activeTab === 'events' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-3xl text-white">My Events</h2>
                <p className="text-slate-400 text-sm mt-1">Manage your active event plans and vendor bookings</p>
              </div>

              <button
                onClick={() => setShowEventWizard(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md"
              >
                + Create New Event
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((evt) => (
                <div key={evt.id} className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs">
                      {evt.eventType}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{evt.date}</span>
                  </div>

                  <h3 className="font-display font-bold text-2xl text-white">{evt.title}</h3>

                  <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-slate-400 block">Total Budget</span>
                      <span className="font-bold text-white">₹{evt.totalBudget.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-slate-400 block">Spent</span>
                      <span className="font-bold text-amber-400">₹{evt.spentBudget.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-slate-400 block">Guests</span>
                      <span className="font-bold text-emerald-400">{evt.guestCount} Attendees</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                    <button
                      onClick={() => {
                        setActiveEvent(evt);
                        setActiveTab('budget');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
                    >
                      Open Smart Budget Planner
                    </button>

                    <button
                      onClick={() => {
                        setActiveEvent(evt);
                        setActiveTab('invitations');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-pink-500 text-slate-300 text-xs font-bold"
                    >
                      Canva Invitation
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
            }}
          />
        )}

        {activeTab === 'invitations' && (
          <CanvaInvitationDesigner
            invitation={invitation}
            onSaveInvitation={(updated) => setInvitation(updated)}
            onOpenPublicView={() => setShowPublicInviteModal(true)}
          />
        )}

        {activeTab === 'guests' && (
          <GuestManagement
            guests={guests}
            onAddGuest={(newG) => {
              const g: Guest = {
                id: `gst-${Date.now()}`,
                eventId: activeEvent.id,
                name: newG.name || 'Guest',
                email: newG.email,
                phone: newG.phone,
                group: newG.group || 'General',
                status: 'invited',
                adultsCount: newG.adultsCount || 1,
                childrenCount: 0,
                dietaryPreference: newG.dietaryPreference || 'Veg',
                invitedAt: new Date().toISOString(),
              };
              setGuests((prev) => [g, ...prev]);
            }}
            onShareInviteLink={() => setShowPublicInviteModal(true)}
          />
        )}

        {activeTab === 'feedback' && (
          <FeedbackModule
            feedbackList={feedbackList}
            onAddFeedback={(fb) => setFeedbackList((prev) => [fb, ...prev])}
          />
        )}

        {activeTab === 'vendor-portal' && (
          <VendorDashboard
            vendor={vendors[0]}
            bookings={bookings}
            onAcceptBooking={(bookingId) => {
              setBookings((prev) =>
                prev.map((b) => (b.id === bookingId ? { ...b, status: 'confirmed' } : b))
              );
            }}
          />
        )}

        {activeTab === 'admin-portal' && (
          <AdminDashboard
            vendors={vendors}
            events={events}
            bookings={bookings}
          />
        )}
      </main>

      {/* Modals & Overlays */}
      {selectedVendorForModal && (
        <VendorDetailModal
          vendor={selectedVendorForModal}
          onClose={() => setSelectedVendorForModal(null)}
          onBookVendor={handleBookVendor}
        />
      )}

      {showCompareModal && (
        <VendorCompareModal
          vendors={vendors.filter((v) => selectedCompareIds.includes(v.id))}
          onClose={() => setShowCompareModal(false)}
          onSelectVendor={(v) => setSelectedVendorForModal(v)}
        />
      )}

      {showEventWizard && (
        <EventWizardModal
          onClose={() => setShowEventWizard(false)}
          onEventCreated={(newEvent) => {
            setEvents((prev) => [newEvent, ...prev]);
            setActiveEvent(newEvent);
            setActiveTab('budget');
          }}
        />
      )}

      {showPublicInviteModal && (
        <PublicInvitationView
          invitation={invitation}
          onClose={() => setShowPublicInviteModal(false)}
          onSubmitRSVP={(rsvp) => {
            const newGuest: Guest = {
              id: `gst-${Date.now()}`,
              eventId: activeEvent.id,
              name: rsvp.name,
              status: rsvp.status,
              adultsCount: rsvp.adults,
              childrenCount: 0,
              group: 'Web RSVP',
              dietaryPreference: rsvp.dietary as any,
              invitedAt: new Date().toISOString(),
              respondedAt: new Date().toISOString(),
            };
            setGuests((prev) => [newGuest, ...prev]);
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-10 mt-16 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="font-bold text-slate-300">
            Magizhnaazh — Enterprise MERN Microservices Event Management & Vendor Marketplace Platform
          </p>
          <p>© 2026 Magizhnaazh Technologies. All rights reserved. Powered by Node.js, Express, Next.js, and MongoDB.</p>
        </div>
      </footer>

    </div>
  );
}
