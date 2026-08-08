import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 8002;

app.use(cors());
app.use(express.json());

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
fs.ensureDirSync(UPLOADS_DIR);
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const vendorId = req.params.id || 'general';
    const dest = path.join(UPLOADS_DIR, `vendor-${vendorId}`);
    fs.ensureDirSync(dest);
    cb(null, dest);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname);
    cb(null, `portfolio-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

interface VendorPackage {
  id: string;
  packageName: string;
  price: number;
  description: string;
  includedServices: string[];
}

interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  category: string;
  description: string;
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: [number, number];
  };
  startingPrice: number;
  yearsOfExperience: number;
  ratingAverage: number;
  reviewCount: number;
  isVerified: boolean;
  galleryImages: string[];
  packages: VendorPackage[];
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
}

const VENDORS: Vendor[] = [
  {
    id: 'vnd-1',
    userId: 'usr-vendor-1',
    businessName: 'The Leela Palace Grand Ballroom',
    category: 'Venue',
    description: 'Luxury sea-facing banquets and grand ballroom in Chennai for royal weddings, grand receptions, and corporate galas.',
    location: { address: 'Adyar Seaface, MRC Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600028', coordinates: [80.2707, 13.0827] },
    startingPrice: 150000,
    yearsOfExperience: 12,
    ratingAverage: 4.9,
    reviewCount: 142,
    isVerified: true,
    galleryImages: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800',
      'https://images.unsplash.com/photo-1545232979-fbf34fe37722?w=800',
    ],
    packages: [
      { id: 'pkg-1-1', packageName: 'Royal Ballroom Package', price: 150000, description: 'AC Ballroom hall for 600 guests, stage setup, basic lighting.', includedServices: ['Hall Rent', 'Stage Decor', 'Centralized AC', 'VIP Suite'] },
      { id: 'pkg-1-2', packageName: 'Luxury Ocean View Deck', price: 250000, description: 'Outdoor seaside lawn + grand indoor hall for 1200 guests.', includedServices: ['Ocean Lawn', 'Valet Parking', 'Power Backup', '2 Executive Rooms'] }
    ],
    contactEmail: 'events@leelachennai.com',
    contactPhone: '+91 44 33661234',
    createdAt: new Date().toISOString(),
  },
];

app.get('/api/v1/vendors', (req: Request, res: Response) => {
  const { category, city, search } = req.query;
  let result = VENDORS;

  if (category && category !== 'All') {
    result = result.filter((v) => v.category.toLowerCase() === String(category).toLowerCase());
  }

  if (city && city !== 'All') {
    result = result.filter((v) => v.location.city.toLowerCase() === String(city).toLowerCase());
  }

  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter(
      (v) => v.businessName.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, count: result.length, data: { vendors: result } });
});

app.get('/api/v1/vendors/:id', (req: Request, res: Response) => {
  const vendor = VENDORS.find((v) => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  res.json({ success: true, data: { vendor } });
});

app.post('/api/v1/vendors', (req: Request, res: Response) => {
  const { businessName, category, city, startingPrice, description, contactEmail, contactPhone } = req.body;

  const newVendor: Vendor = {
    id: `vnd-${Date.now()}`,
    userId: `usr-vendor-${Date.now()}`,
    businessName: businessName || 'New Vendor Business',
    category: category || 'Venue',
    description: description || '',
    location: { address: 'Main Road', city: city || 'Chennai', state: 'Tamil Nadu', pincode: '600001', coordinates: [80.27, 13.08] },
    startingPrice: Number(startingPrice) || 25000,
    yearsOfExperience: 5,
    ratingAverage: 5.0,
    reviewCount: 1,
    isVerified: false,
    galleryImages: ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800'],
    packages: [],
    contactEmail: contactEmail || 'vendor@magizhnaazh.com',
    contactPhone: contactPhone || '+91 9000000000',
    createdAt: new Date().toISOString(),
  };

  VENDORS.push(newVendor);
  res.status(201).json({ success: true, message: 'Vendor profile created. Awaiting admin approval.', data: { vendor: newVendor } });
});

app.post('/api/v1/vendors/:id/upload', upload.single('file'), (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const vendorId = req.params.id;
  const fileUrl = `http://localhost:${PORT}/uploads/vendor-${vendorId}/${file.filename}`;

  const vendor = VENDORS.find((v) => v.id === vendorId);
  if (vendor) {
    vendor.galleryImages.push(fileUrl);
  }

  res.json({
    success: true,
    message: 'Portfolio asset uploaded to Local Disk Storage (/uploads).',
    data: {
      fileUrl,
      filename: file.filename,
      sizeBytes: file.size,
    },
  });
});

app.put('/api/v1/vendors/:id/verify', (req: Request, res: Response) => {
  const vendor = VENDORS.find((v) => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });

  vendor.isVerified = !vendor.isVerified;
  res.json({ success: true, message: `Vendor verification status updated to ${vendor.isVerified}.`, data: { vendor } });
});

app.listen(PORT, () => {
  console.log(`[Marketplace Microservice] Running on http://localhost:${PORT}`);
});
