import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { connectDB } from '../../packages/shared-utils/db';
import { authMiddleware, requireRole } from '../../packages/shared-utils/auth';
import { requestLogger } from '../../packages/shared-utils/logging';
import { registerHealthRoute } from '../../packages/shared-utils/health';
import { LocalStorageProvider } from '../../packages/local-storage-provider';
import { VendorModel } from './models/Vendor';

const app = express();
const PORT = process.env.PORT || 8002;

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const storageProvider = new LocalStorageProvider(UPLOADS_DIR, `http://localhost:${PORT}/uploads`);
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(requestLogger('marketplace-service'));
registerHealthRoute(app, 'marketplace-service');
app.use('/uploads', express.static(UPLOADS_DIR));

async function seedIfEmpty() {
  const count = await VendorModel.countDocuments();
  if (count > 0) return;

  await VendorModel.create({
    id: 'vnd-1',
    userId: 'usr-vendor-1',
    businessName: 'The Leela Palace Grand Ballroom',
    category: 'Venue',
    description:
      'Luxury sea-facing banquets and grand ballroom in Chennai for royal weddings, grand receptions, and corporate galas.',
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
    ],
    packages: [
      { id: 'pkg-1-1', packageName: 'Royal Ballroom Package', price: 150000, description: 'AC Ballroom hall for 600 guests, stage setup, basic lighting.', includedServices: ['Hall Rent', 'Stage Decor', 'Centralized AC', 'VIP Suite'] },
      { id: 'pkg-1-2', packageName: 'Luxury Ocean View Deck', price: 250000, description: 'Outdoor seaside lawn + grand indoor hall for 1200 guests.', includedServices: ['Ocean Lawn', 'Valet Parking', 'Power Backup', '2 Executive Rooms'] },
    ],
    contactEmail: 'events@leelachennai.com',
    contactPhone: '+91 44 33661234',
    policies: { cancellation: 'Full refund up to 30 days before event.', refund: '50% refund within 30 days.', advancePercentage: 30 },
  });
  console.log('[marketplace-service] Seeded demo vendor.');
}

// 1. Search / discover vendors
app.get('/api/v1/vendors', async (req: Request, res: Response) => {
  const { category, city, search, lat, lng, radiusKm } = req.query;
  const filter: Record<string, unknown> = {};

  if (category && category !== 'All') {
    filter.category = new RegExp(`^${String(category)}$`, 'i');
  }
  if (city && city !== 'All') {
    filter['location.city'] = new RegExp(`^${String(city)}$`, 'i');
  }
  if (search) {
    filter.$text = { $search: String(search) };
  }
  if (lat && lng) {
    filter.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: (Number(radiusKm) || 25) * 1000,
      },
    };
  }

  const vendors = await VendorModel.find(filter).limit(100);
  res.json({ success: true, count: vendors.length, data: { vendors } });
});

// 2. The logged-in vendor's own listing (must be registered before /:id).
app.get('/api/v1/vendors/mine', authMiddleware(), requireRole('vendor', 'admin'), async (req: Request, res: Response) => {
  const vendor = await VendorModel.findOne({ userId: req.user!.sub });
  if (!vendor) return res.status(404).json({ success: false, message: 'No vendor listing found for this account yet.' });
  res.json({ success: true, data: { vendor } });
});

// 3. Vendor detail
app.get('/api/v1/vendors/:id', async (req: Request, res: Response) => {
  const vendor = await VendorModel.findOne({ id: req.params.id });
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  res.json({ success: true, data: { vendor } });
});

// 4. Register a vendor profile — requires an authenticated vendor account.
app.post('/api/v1/vendors', authMiddleware(), requireRole('vendor', 'admin'), async (req: Request, res: Response) => {
  const { businessName, category, city, startingPrice, description, contactEmail, contactPhone } = req.body;

  const vendor = await VendorModel.create({
    id: `vnd-${Date.now()}`,
    userId: req.user!.sub,
    businessName: businessName || 'New Vendor Business',
    category: category || 'Venue',
    description: description || '',
    location: { type: 'Point', coordinates: [80.27, 13.08], address: 'Main Road', city: city || 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
    startingPrice: Number(startingPrice) || 25000,
    yearsOfExperience: 0,
    ratingAverage: 0,
    reviewCount: 0,
    isVerified: false,
    galleryImages: ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800'],
    packages: [],
    contactEmail: contactEmail || req.user!.email,
    contactPhone: contactPhone || '+91 9000000000',
  });

  res.status(201).json({ success: true, message: 'Vendor profile created. Awaiting admin approval.', data: { vendor } });
});

// 5. Update own vendor profile (business info, packages, pricing).
app.put('/api/v1/vendors/:id', authMiddleware(), async (req: Request, res: Response) => {
  const vendor = await VendorModel.findOne({ id: req.params.id });
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  if (vendor.userId !== req.user!.sub && req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'You do not own this vendor listing.' });
  }

  const { businessName, category, description, city, startingPrice, contactEmail, contactPhone, packages } = req.body;
  if (businessName !== undefined) vendor.businessName = businessName;
  if (category !== undefined) vendor.category = category;
  if (description !== undefined) vendor.description = description;
  if (city !== undefined) vendor.location.city = city;
  if (startingPrice !== undefined) vendor.startingPrice = Number(startingPrice);
  if (contactEmail !== undefined) vendor.contactEmail = contactEmail;
  if (contactPhone !== undefined) vendor.contactPhone = contactPhone;
  if (Array.isArray(packages)) vendor.packages = packages;

  await vendor.save();
  res.json({ success: true, message: 'Vendor profile updated.', data: { vendor } });
});

// 6. Portfolio upload — stored via the shared LocalStorageProvider abstraction.
app.post('/api/v1/vendors/:id/upload', authMiddleware(), upload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const vendorId = req.params.id;
  const vendorForUpload = await VendorModel.findOne({ id: vendorId });
  if (!vendorForUpload) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  if (vendorForUpload.userId !== req.user!.sub && req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'You do not own this vendor listing.' });
  }

  const fileUrl = await storageProvider.saveFile(file.buffer, file.originalname, `vendor-${vendorId}`);

  await VendorModel.updateOne({ id: vendorId }, { $push: { galleryImages: fileUrl } });

  res.json({
    success: true,
    message: 'Portfolio asset uploaded to Local Disk Storage (/uploads).',
    data: { fileUrl, filename: file.originalname, sizeBytes: file.size },
  });
});

// 7. Admin/vendor verification toggle
app.put('/api/v1/vendors/:id/verify', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  const vendor = await VendorModel.findOne({ id: req.params.id });
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });

  vendor.isVerified = !vendor.isVerified;
  await vendor.save();
  res.json({ success: true, message: `Vendor verification status updated to ${vendor.isVerified}.`, data: { vendor } });
});

async function start() {
  await connectDB(process.env.MONGODB_URI, 'marketplace-service');
  await seedIfEmpty();
  app.listen(PORT, () => {
    console.log(`[Marketplace Microservice] Running on http://localhost:${PORT}`);
  });
}

start();
