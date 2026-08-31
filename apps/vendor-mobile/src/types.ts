// Minimal shapes the mobile app uses, mirroring the platform's shared-types.
// Kept local so the Metro bundler doesn't need to reach outside the app.

export type Role = 'customer' | 'vendor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  businessName?: string;
  avatarUrl?: string;
}

export interface VendorPackage {
  id: string;
  packageName: string;
  price: number;
  description?: string;
  capacityPersons?: number;
  images?: string[];
}

export interface LocationPoint {
  city?: string;
  address?: string;
  district?: string;
  state?: string;
}

export interface Vendor {
  id: string;
  businessName: string;
  category: string;
  location?: LocationPoint;
  description?: string;
  startingPrice: number;
  ratingAverage?: number;
  reviewCount?: number;
  galleryImages?: string[];
  packages?: VendorPackage[];
  isVerified?: boolean;
  contactPhone?: string;
  upiId?: string;
  policies?: { advancePercentage?: number; advanceAmount?: number };
}

export interface EventItem {
  id: string;
  title: string;
  eventType: string;
  date: string;
  location?: { city?: string };
  guestCount: number;
  totalBudget: number;
  spentBudget: number;
}

export interface Booking {
  id: string;
  vendorId: string;
  vendorName?: string;
  vendorCategory?: string;
  packageName?: string;
  amount?: number;
  status?: string;
  eventDate?: string;
  createdAt?: string;
}
