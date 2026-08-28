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

export interface Vendor {
  id: string;
  businessName: string;
  category: string;
  city: string;
  description?: string;
  startingPrice: number;
  rating?: number;
  reviewCount?: number;
  coverImage?: string;
  galleryImages?: string[];
  packages?: VendorPackage[];
  isVerified?: boolean;
  contactPhone?: string;
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
