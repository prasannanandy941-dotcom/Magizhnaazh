export type Role = 'customer' | 'vendor' | 'event_manager' | 'admin' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  avatarUrl?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface LocationPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

export interface VendorPackage {
  id: string;
  packageName: string;
  price: number;
  description: string;
  includedServices: string[];
  durationHours?: number;
  capacityPersons?: number;
}

export interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  category: VendorCategory;
  description: string;
  location: LocationPoint;
  startingPrice: number;
  yearsOfExperience: number;
  ratingAverage: number;
  reviewCount: number;
  isVerified: boolean;
  featured: boolean;
  galleryImages: string[];
  galleryVideos?: string[];
  contactEmail: string;
  contactPhone: string;
  packages: VendorPackage[];
  availableDates: string[]; // ISO date strings
  policies: {
    cancellation: string;
    refund: string;
    advancePercentage: number;
  };
  createdAt: string;
}

export type VendorCategory =
  | 'Catering'
  | 'Venue'
  | 'Decoration'
  | 'Makeup & Beauty'
  | 'Photography'
  | 'Videography'
  | 'Transport'
  | 'Pujari/Priest'
  | 'Invitation'
  | 'Printing'
  | 'Return Gifts'
  | 'Entertainment'
  | 'Music/DJ'
  | 'Lighting'
  | 'Flowers'
  | 'Mehendi'
  | 'Event Host/Anchor'
  | 'Security'
  | 'Cleaning'
  | 'Rental Equipment'
  | 'Wedding Planner'
  | 'Corporate Event Services'
  | 'Other';

export const VENDOR_CATEGORIES: VendorCategory[] = [
  'Catering',
  'Venue',
  'Decoration',
  'Makeup & Beauty',
  'Photography',
  'Videography',
  'Transport',
  'Pujari/Priest',
  'Invitation',
  'Printing',
  'Return Gifts',
  'Entertainment',
  'Music/DJ',
  'Lighting',
  'Flowers',
  'Mehendi',
  'Event Host/Anchor',
  'Security',
  'Cleaning',
  'Rental Equipment',
  'Wedding Planner',
  'Corporate Event Services',
  'Other',
];

export interface EventType {
  id: string;
  name: string;
  icon: string;
  description: string;
  defaultCategoryPercentages: Record<string, number>;
}

export interface EventBudgetItem {
  id: string;
  category: VendorCategory;
  allocatedPercentage: number;
  allocatedAmount: number;
  actualSpent: number;
  notes?: string;
}

export interface EventTask {
  id: string;
  title: string;
  category?: VendorCategory;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface EventScheduleItem {
  id: string;
  time: string;
  activity: string;
  location?: string;
  notes?: string;
}

export interface Event {
  id: string;
  userId: string;
  title: string;
  eventType: string;
  date: string;
  location: {
    city: string;
    venueName?: string;
    address?: string;
  };
  guestCount: number;
  totalBudget: number;
  spentBudget: number;
  status: 'planning' | 'ongoing' | 'completed' | 'cancelled';
  budgetBreakdown: EventBudgetItem[];
  tasks: EventTask[];
  schedule: EventScheduleItem[];
  bookedVendorIds: string[];
  createdAt: string;
}

export type BookingStatus =
  | 'enquiry'
  | 'quote_requested'
  | 'quote_received'
  | 'negotiation'
  | 'pending_payment'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface Booking {
  id: string;
  bookingNumber: string;
  eventId: string;
  customerId: string;
  vendorId: string;
  vendorName: string;
  vendorCategory: VendorCategory;
  packageId?: string;
  packageName?: string;
  agreedPrice: number;
  advanceAmountPaid: number;
  remainingAmount: number;
  status: BookingStatus;
  eventDate: string;
  specialInstructions?: string;
  quotesHistory?: {
    sender: 'customer' | 'vendor';
    amount: number;
    notes?: string;
    timestamp: string;
  }[];
  createdAt: string;
}

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'qr' | 'shape' | 'button';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  zIndex: number;
}

export interface Invitation {
  id: string;
  eventId: string;
  inviteToken: string; // URL slug
  templateId?: string;
  eventTitle: string;
  hostName: string;
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  mapLocationUrl?: string;
  message: string;
  canvasData: {
    width: number;
    height: number;
    backgroundColor: string;
    backgroundImageUrl?: string;
    elements: CanvasElement[];
  };
  exportedImageUrl?: string;
  createdAt: string;
}

export type RSVPStatus = 'invited' | 'viewed' | 'accepted' | 'declined' | 'maybe';

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  phone?: string;
  email?: string;
  group?: string; // e.g. "Bride Family", "Friends"
  status: RSVPStatus;
  adultsCount: number;
  childrenCount: number;
  dietaryPreference?: 'Veg' | 'Non-Veg' | 'Jain' | 'Vegan';
  needsTransport?: boolean;
  needsAccommodation?: boolean;
  invitedAt: string;
  respondedAt?: string;
}

export interface EventFeedback {
  id: string;
  eventId: string;
  feedbackToken: string;
  guestName?: string;
  overallRating: number; // 1-5
  venueRating?: number;
  cateringRating?: number;
  decorationRating?: number;
  organizationRating?: number;
  photographyRating?: number;
  comments?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  vendorId: string;
  customerId: string;
  customerName: string;
  bookingId: string;
  overallRating: number; // 1-5
  serviceQuality: number;
  professionalism: number;
  valueForMoney: number;
  communication: number;
  punctuality: number;
  comment: string;
  eventType: string;
  eventDate: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  code?: string;
  data: T;
}
