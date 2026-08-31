import path from 'path';
import dotenv from 'dotenv';
// Loads MONGODB_URI and INTERNAL_API_SECRET (guards the internal rating-sync route).
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { connectDB } from '../../packages/shared-utils/db';
import { authMiddleware, requireRole } from '../../packages/shared-utils/auth';
import { requestLogger } from '../../packages/shared-utils/logging';
import { registerHealthRoute } from '../../packages/shared-utils/health';
import { LocalStorageProvider } from '../../packages/local-storage-provider';
import { serviceUrl } from '../../packages/shared-utils/serviceUrl';
import { VENDOR_CATEGORIES } from '../../packages/shared-types';
import { INDIA_STATES_AND_CITIES } from '../../packages/shared-utils/indiaLocations';
import { VendorModel } from './models/Vendor';
import { CategoryModel } from './models/Category';
import { CityModel } from './models/City';
import { BannerModel } from './models/Banner';

const app = express();
const PORT = process.env.PORT || 8002;

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
// Files are served statically at `/uploads` (see below). The base URL baked
// into each saved file's public URL must be reachable from the customer's
// browser — in prod that's this service's own public https URL
// (MARKETPLACE_SERVICE_URL), NOT localhost. Locally the env var is unset and we
// fall back to localhost. Without this, uploaded menu/package/gallery images
// resolve to http://localhost:8002 and show as broken images to customers.
const PUBLIC_BASE_URL = serviceUrl(process.env.MARKETPLACE_SERVICE_URL, `http://localhost:${PORT}`);
const storageProvider = new LocalStorageProvider(UPLOADS_DIR, `${PUBLIC_BASE_URL}/uploads`);
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(requestLogger('marketplace-service'));
registerHealthRoute(app, 'marketplace-service');
app.use('/uploads', express.static(UPLOADS_DIR));

// Cities across India used to place demo vendors.
const CITIES: Record<string, { coords: [number, number]; state: string; pincode: string }> = {
  Chennai: { coords: [80.2707, 13.0827], state: 'Tamil Nadu', pincode: '600001' },
  Coimbatore: { coords: [76.9558, 11.0168], state: 'Tamil Nadu', pincode: '641001' },
  Madurai: { coords: [78.1198, 9.9252], state: 'Tamil Nadu', pincode: '625001' },
  Mumbai: { coords: [72.8777, 19.076], state: 'Maharashtra', pincode: '400001' },
  Pune: { coords: [73.8567, 18.5204], state: 'Maharashtra', pincode: '411001' },
  'New Delhi': { coords: [77.209, 28.6139], state: 'Delhi', pincode: '110001' },
  Bangalore: { coords: [77.5946, 12.9716], state: 'Karnataka', pincode: '560001' },
  Hyderabad: { coords: [78.4867, 17.385], state: 'Telangana', pincode: '500001' },
  Kolkata: { coords: [88.3639, 22.5726], state: 'West Bengal', pincode: '700001' },
  Jaipur: { coords: [75.7873, 26.9124], state: 'Rajasthan', pincode: '302001' },
  Ahmedabad: { coords: [72.5714, 23.0225], state: 'Gujarat', pincode: '380001' },
  Kochi: { coords: [76.2673, 9.9312], state: 'Kerala', pincode: '682001' },
  Lucknow: { coords: [80.9462, 26.8467], state: 'Uttar Pradesh', pincode: '226001' },
  Varanasi: { coords: [82.9739, 25.3176], state: 'Uttar Pradesh', pincode: '221001' },
  Goa: { coords: [73.8278, 15.4909], state: 'Goa', pincode: '403001' },
  Chandigarh: { coords: [76.7794, 30.7333], state: 'Chandigarh', pincode: '160001' },
};

interface VendorSpec {
  name: string;
  category: string;
  city: string;
  price: number;
  rating: number;
  reviews: number;
  img: string;
  years: number;
}

// Demo vendors — one+ realistic business per category, spread across India.
const VENDOR_SPECS: VendorSpec[] = [
  // Venue
  { name: 'The Leela Palace Grand Ballroom', category: 'Venue', city: 'Chennai', price: 150000, rating: 4.9, reviews: 142, img: 'photo-1712314947761-a8d718bd8c32', years: 12 },
  { name: 'Taj Falaknuma Palace Banquets', category: 'Venue', city: 'Hyderabad', price: 220000, rating: 4.8, reviews: 98, img: 'photo-1655516433028-9e0e1599cf8b', years: 20 },
  { name: 'Umaid Heritage Wedding Lawns', category: 'Venue', city: 'Jaipur', price: 180000, rating: 4.7, reviews: 76, img: 'photo-1780542900375-0cf459e38fbb', years: 15 },
  // Catering
  { name: 'Grand Chettinad Feast Caterers', category: 'Catering', city: 'Chennai', price: 450, rating: 4.8, reviews: 215, img: 'photo-1555244162-803834f70033', years: 18 },
  { name: 'Maharaja Thali Catering Co.', category: 'Catering', city: 'New Delhi', price: 600, rating: 4.6, reviews: 180, img: 'photo-1581546085212-f25477a9d4fb', years: 14 },
  { name: 'Spice Route Wedding Caterers', category: 'Catering', city: 'Mumbai', price: 750, rating: 4.9, reviews: 320, img: 'photo-1646578515903-67873a5398f9', years: 10 },
  // Media (Photography)
  { name: 'Candid Tales Photography & Cinema', category: 'Media', city: 'Chennai', price: 65000, rating: 4.95, reviews: 98, img: 'photo-1574397188309-e83dfe918ecb', years: 9 },
  { name: 'Frame Stories Wedding Films', category: 'Media', city: 'New Delhi', price: 120000, rating: 4.9, reviews: 210, img: 'photo-1519741497674-611481863552', years: 11 },
  { name: 'Sunset Reels Photography', category: 'Media', city: 'Goa', price: 90000, rating: 4.8, reviews: 134, img: 'photo-1615966650071-855b15f29ad1', years: 7 },
  // Decoration
  { name: 'Flora Dreams Floral & Theme Decor', category: 'Decoration', city: 'Coimbatore', price: 40000, rating: 4.7, reviews: 76, img: 'photo-1605553426886-c0a99033fda0', years: 8 },
  { name: 'Marigold Mandap Designers', category: 'Decoration', city: 'Jaipur', price: 80000, rating: 4.6, reviews: 90, img: 'photo-1756190564669-215843660e93', years: 12 },
  { name: 'Petals & Pillars Event Decor', category: 'Decoration', city: 'Mumbai', price: 65000, rating: 4.8, reviews: 156, img: 'photo-1640355105827-2aa98e908a7b', years: 9 },
  // Makeup & Beauty
  { name: 'Blush Bridal Makeup Studio', category: 'Makeup & Beauty', city: 'Bangalore', price: 15000, rating: 4.9, reviews: 240, img: 'photo-1600685890506-593fdf55949b', years: 6 },
  { name: 'Glam Diaries by Aditi', category: 'Makeup & Beauty', city: 'Mumbai', price: 25000, rating: 4.8, reviews: 310, img: 'photo-1619002117199-47c7f0427d21', years: 8 },
  { name: 'Roopam Bridal Artistry', category: 'Makeup & Beauty', city: 'Hyderabad', price: 18000, rating: 4.7, reviews: 128, img: 'photo-1641382161166-4f3c320f0c6d', years: 10 },
  // Transport
  { name: 'Royal Ride Wedding Cars', category: 'Transport', city: 'Chennai', price: 6000, rating: 4.6, reviews: 88, img: 'photo-1592514313074-794923c98162', years: 7 },
  { name: 'Baraat Express Fleet', category: 'Transport', city: 'New Delhi', price: 4000, rating: 4.5, reviews: 64, img: 'photo-1570118054363-ff4d296962f5', years: 9 },
  { name: 'Vintage Wheels Luxury Cars', category: 'Transport', city: 'Pune', price: 15000, rating: 4.8, reviews: 52, img: 'photo-1571113908007-5d6aae13d73e', years: 11 },
  // Pujari/Priest
  { name: 'Vedic Purohit Services', category: 'Pujari/Priest', city: 'Chennai', price: 8000, rating: 4.9, reviews: 120, img: 'photo-1774024051976-7b5a15542a05', years: 22 },
  { name: 'Shubh Muhurat Pandit Ji', category: 'Pujari/Priest', city: 'Varanasi', price: 6000, rating: 4.8, reviews: 95, img: 'photo-1630764883473-e8c2056f0589', years: 25 },
  { name: 'Iyer Vadhyar Associates', category: 'Pujari/Priest', city: 'Madurai', price: 7000, rating: 4.7, reviews: 71, img: 'photo-1636559527737-ea8576ae6571', years: 18 },
  // Return Gifts
  { name: 'Giftology Return Favors', category: 'Return Gifts', city: 'Bangalore', price: 60, rating: 4.6, reviews: 140, img: 'photo-1622595701760-039942e936de', years: 5 },
  { name: 'Silver Shagun Gifts', category: 'Return Gifts', city: 'Jaipur', price: 120, rating: 4.7, reviews: 88, img: 'photo-1644061925268-053b6a592c2e', years: 8 },
  { name: 'EcoGift Wedding Favors', category: 'Return Gifts', city: 'Pune', price: 40, rating: 4.5, reviews: 60, img: 'photo-1615737183238-2a9f1788608e', years: 4 },
  // Music/DJ
  { name: 'Beat Box DJ & Sound', category: 'Music/DJ', city: 'Mumbai', price: 8000, rating: 4.7, reviews: 175, img: 'photo-1470225620780-dba8ba36b745', years: 9 },
  { name: 'Nadhaswaram Isai Kuzhu', category: 'Music/DJ', city: 'Madurai', price: 6000, rating: 4.9, reviews: 64, img: 'photo-1579018372296-afd56f194ebc', years: 20 },
  { name: 'Sufi Nights Live Band', category: 'Music/DJ', city: 'New Delhi', price: 20000, rating: 4.8, reviews: 112, img: 'photo-1565035010268-a3816f98589a', years: 12 },
  // Media (Videography)
  { name: 'Frame & Motion Films', category: 'Media', city: 'Chennai', price: 70000, rating: 4.8, reviews: 84, img: 'photo-1580707221190-bd94d9087b7f', years: 8 },
  { name: 'Cinereel Wedding Films', category: 'Media', city: 'Bangalore', price: 95000, rating: 4.7, reviews: 61, img: 'photo-1629756048377-09540f52caa1', years: 6 },
  // Invitation
  { name: 'Pixel Invites Studio', category: 'Invitation', city: 'Chennai', price: 2500, rating: 4.7, reviews: 132, img: 'photo-1632610992723-82d7c212f6d7', years: 5 },
  { name: 'Royal Card Creations', category: 'Invitation', city: 'Jaipur', price: 4000, rating: 4.6, reviews: 77, img: 'photo-1721176487015-5408ae0e9bc2', years: 9 },
  // Printing
  { name: 'Classic Press Wedding Cards', category: 'Printing', city: 'Coimbatore', price: 3000, rating: 4.6, reviews: 58, img: 'photo-1503694978374-8a2fa686963a', years: 14 },
  { name: 'FlexPrint Banners & Albums', category: 'Printing', city: 'Madurai', price: 5000, rating: 4.5, reviews: 40, img: 'photo-1581508512961-0e3b9524db40', years: 10 },
  // Entertainment
  { name: 'Encore Live Entertainment', category: 'Entertainment', city: 'Mumbai', price: 25000, rating: 4.7, reviews: 96, img: 'photo-1563841930606-67e2bce48b78', years: 7 },
  { name: 'Firework Nights Events', category: 'Entertainment', city: 'New Delhi', price: 40000, rating: 4.6, reviews: 55, img: 'photo-1470229722913-7c0e2dbbafd3', years: 6 },
  // Lighting
  { name: 'Luminous Stage Lighting', category: 'Lighting', city: 'Bangalore', price: 15000, rating: 4.7, reviews: 70, img: 'photo-1576514129883-2f1d47a65da6', years: 8 },
  { name: 'Chandelier & Laser Co.', category: 'Lighting', city: 'Hyderabad', price: 22000, rating: 4.6, reviews: 48, img: 'photo-1558620013-a08999547a36', years: 5 },
  // Flowers
  { name: 'Petal Craft Florists', category: 'Flowers', city: 'Chennai', price: 8000, rating: 4.8, reviews: 110, img: 'photo-1469371670807-013ccf25f16a', years: 9 },
  { name: 'Bloom & Garland Studio', category: 'Flowers', city: 'Coimbatore', price: 6000, rating: 4.6, reviews: 65, img: 'photo-1727081203667-4792c134061a', years: 6 },
  // Mehendi
  { name: 'Henna Traditions Studio', category: 'Mehendi', city: 'Jaipur', price: 5000, rating: 4.9, reviews: 145, img: 'photo-1732118400647-a81e3b37be87', years: 11 },
  { name: 'Mehendi Moments by Ritu', category: 'Mehendi', city: 'Mumbai', price: 7000, rating: 4.7, reviews: 92, img: 'photo-1753597500229-d2534c9a01f8', years: 7 },
  // Event Host/Anchor
  { name: 'MicDrop Event Anchors', category: 'Event Host/Anchor', city: 'Bangalore', price: 12000, rating: 4.7, reviews: 63, img: 'photo-1702562546665-4632bdb96e04', years: 6 },
  { name: 'Stagecraft Emcee Services', category: 'Event Host/Anchor', city: 'Chennai', price: 15000, rating: 4.6, reviews: 44, img: 'photo-1538449327350-43b4fcfd35ac', years: 8 },
  // Security
  { name: 'Shield Guard Event Security', category: 'Security', city: 'Mumbai', price: 10000, rating: 4.5, reviews: 39, img: 'photo-1566245024852-04fbf7842ce9', years: 12 },
  { name: 'SafeZone Crowd Management', category: 'Security', city: 'New Delhi', price: 12000, rating: 4.6, reviews: 51, img: 'photo-1652739758426-56a564265f9e', years: 9 },
  // Cleaning
  { name: 'SpotFree Event Cleaning', category: 'Cleaning', city: 'Pune', price: 4000, rating: 4.5, reviews: 33, img: 'photo-1580842402762-6f5868c17412', years: 5 },
  { name: 'FreshStart Sanitation Co.', category: 'Cleaning', city: 'Ahmedabad', price: 5000, rating: 4.4, reviews: 27, img: 'photo-1615506355925-dd0a54d099dd', years: 4 },
  // Rental Equipment
  { name: 'EventGear Rentals', category: 'Rental Equipment', city: 'Chennai', price: 9000, rating: 4.6, reviews: 87, img: 'photo-1695393386569-cf141ff2c552', years: 10 },
  { name: 'Canopy & Chairs Co.', category: 'Rental Equipment', city: 'Kochi', price: 7000, rating: 4.5, reviews: 52, img: 'photo-1675376616537-c8aa9ddc9977', years: 8 },
  // Wedding Planner
  { name: 'Dream Day Wedding Planners', category: 'Wedding Planner', city: 'Mumbai', price: 100000, rating: 4.9, reviews: 118, img: 'photo-1568847811512-803314424fdc', years: 12 },
  { name: 'Vivaha Event Consultants', category: 'Wedding Planner', city: 'Chennai', price: 75000, rating: 4.8, reviews: 90, img: 'photo-1691480174869-436af8fd6eba', years: 9 },
  // Corporate Event Services
  { name: 'ProSummit Corporate Events', category: 'Corporate Event Services', city: 'Bangalore', price: 60000, rating: 4.7, reviews: 54, img: 'photo-1540575467063-178a50c2df87', years: 8 },
  { name: 'Momentum MICE Solutions', category: 'Corporate Event Services', city: 'New Delhi', price: 80000, rating: 4.6, reviews: 46, img: 'photo-1587825140708-dfaf72ae4b04', years: 7 },
  // Utensils for Rent — vessels/serving-ware rental (common for South-Indian weddings).
  { name: 'Annapurna Vessels & Utensils Rentals', category: 'Utensils for Rent', city: 'Chennai', price: 3000, rating: 4.7, reviews: 58, img: 'photo-1652960018678-1f19799996c5', years: 11 },
  { name: 'Sri Lakshmi Catering Vessels', category: 'Utensils for Rent', city: 'Coimbatore', price: 2500, rating: 4.6, reviews: 41, img: 'photo-1548688977-3e38ddc590f6', years: 8 },
];

function buildVendor(spec: VendorSpec, idx: number) {
  const c = CITIES[spec.city];
  const perPlate = spec.category === 'Catering';
  const slug = spec.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return {
    id: `vnd-${idx + 1}`,
    userId: `usr-vendor-${idx + 1}`,
    businessName: spec.name,
    category: spec.category,
    description: `${spec.name} — a trusted ${spec.category} partner in ${spec.city}, ${c.state}, serving weddings and events across India.`,
    location: {
      type: 'Point' as const,
      coordinates: c.coords,
      address: `${spec.city} City Centre`,
      city: spec.city,
      district: spec.city,
      state: c.state,
      pincode: c.pincode,
    },
    startingPrice: spec.price,
    yearsOfExperience: spec.years,
    ratingAverage: spec.rating,
    reviewCount: spec.reviews,
    isVerified: true,
    featured: idx < 4,
    galleryImages: [`https://images.unsplash.com/${spec.img}?w=800`],
    packages: [
      {
        id: `pkg-${idx + 1}-1`,
        packageName: `${spec.category} Signature Package`,
        price: spec.price,
        description: `Signature ${spec.category} package${perPlate ? ' (price per plate)' : ''} by ${spec.name}.`,
        includedServices: ['Experienced professional team', 'On-time service', 'Event coordination'],
      },
    ],
    contactEmail: `contact@${slug}.in`,
    contactPhone: `+91 90${String(100000 + idx).slice(-6)}`,
    policies: { cancellation: 'Full refund up to 30 days before event.', refund: '50% refund within 30 days.', advancePercentage: 30 },
  };
}

async function seedIfEmpty() {
  // Insert only the demo specs whose id isn't already in the collection.
  // Real vendors registered through the app also get a `vnd-` prefixed id
  // (see the POST /api/v1/vendors handler below), so this must never delete
  // by id prefix — a blanket delete+reinsert wiped out real vendor listings
  // (and the demo set) on every restart. Being purely additive also means
  // new entries appended to VENDOR_SPECS get seeded in on the next restart
  // without disturbing anything already in the database.
  const docs = VENDOR_SPECS.map(buildVendor);
  const existingIds = new Set((await VendorModel.find({}, { id: 1 }).lean()).map((v) => v.id));
  const missing = docs.filter((d) => !existingIds.has(d.id));
  if (missing.length === 0) return;
  await VendorModel.insertMany(missing, { ordered: false });
  console.log(`[marketplace-service] Seeded ${missing.length} new demo vendors.`);
}

// One-time (idempotent) data migration for existing databases:
//   1. Photography + Videography were merged into a single "Media" category —
//      flip any legacy vendor/category records over to "Media".
//   2. "Advance" is no longer a bookable option (it lives in Business Profile),
//      so strip it out of every vendor's offeredOptions / prices / items.
// Runs on every startup but only touches records that still need it, so it's
// safe to leave in place.
async function migrateMediaAndAdvance() {
  try {
    // 1a. Vendors: Photography/Videography -> Media
    const vendorRes = await VendorModel.updateMany(
      { category: { $in: ['Photography', 'Videography'] } },
      { $set: { category: 'Media' } }
    );
    if (vendorRes.modifiedCount) {
      console.log(`[marketplace-service] Migrated ${vendorRes.modifiedCount} vendor(s) to the Media category.`);
    }

    // 1b. Category docs: drop the old Photography/Videography entries (the
    //     additive category seed re-adds "Media" right after this).
    const catRes = await CategoryModel.deleteMany({ name: { $in: ['Photography', 'Videography'] } });
    if (catRes.deletedCount) {
      console.log(`[marketplace-service] Removed ${catRes.deletedCount} legacy Photography/Videography category record(s).`);
    }

    // 2. Strip the retired "Advance" option from every vendor that still has it.
    const advanceVendors = await VendorModel.find({ offeredOptions: 'Advance' });
    for (const v of advanceVendors) {
      (v as any).offeredOptions = ((v as any).offeredOptions || []).filter((o: string) => o !== 'Advance');
      const prices = { ...((v as any).offeredOptionPrices || {}) };
      const items = { ...((v as any).offeredOptionItems || {}) };
      delete prices['Advance'];
      delete items['Advance'];
      (v as any).offeredOptionPrices = prices;
      (v as any).offeredOptionItems = items;
      v.markModified('offeredOptionPrices');
      v.markModified('offeredOptionItems');
      await v.save();
    }
    if (advanceVendors.length) {
      console.log(`[marketplace-service] Removed the "Advance" option from ${advanceVendors.length} vendor(s).`);
    }
  } catch (err) {
    console.error('[marketplace-service] Media/Advance migration failed:', err);
  }
}

async function seedCategoriesAndCities() {
  // Additive category seed: back-fill any category from VENDOR_CATEGORIES that
  // isn't already in the collection (matched by name), so new categories added
  // to shared-types show up in the admin console on the next restart without
  // disturbing existing ones.
  try {
    const existingCats = await CategoryModel.find({}, { name: 1 }).lean();
    const existingNames = new Set(existingCats.map((c) => c.name.toLowerCase()));
    const missingCats = VENDOR_CATEGORIES.filter((name) => !existingNames.has(name.toLowerCase())).map((name) => ({
      id: `cat-${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      isActive: true,
    }));
    if (missingCats.length > 0) {
      await CategoryModel.insertMany(missingCats, { ordered: false });
      console.log(`[marketplace-service] Seeded ${missingCats.length} vendor categories.`);
    }
  } catch (err: any) {
    if (err?.code !== 11000) throw err; // benign: another instance seeded concurrently
  }

  // Seed the full India-wide serviceable-cities catalogue. Additive: only the
  // cities not already present (matched by name+state) are inserted, so an
  // existing DB that was seeded with the old 4-city set gets back-filled to the
  // full catalogue on the next restart, and any city an admin added or removed
  // by hand is left untouched.
  try {
    const existing = await CityModel.find({}, { name: 1, state: 1 }).lean();
    const existingSet = new Set(
      existing.map((c) => `${c.name.toLowerCase()}|${(c.state || '').toLowerCase()}`)
    );

    const catalogue = Object.entries(INDIA_STATES_AND_CITIES).flatMap(([state, cities]) =>
      cities.map((name) => ({ name, state }))
    );
    // De-duplicate the catalogue itself (a couple of cities appear under NCR/UP both).
    const seen = new Set<string>();
    const toInsert = catalogue
      .filter(({ name, state }) => {
        const key = `${name.toLowerCase()}|${state.toLowerCase()}`;
        if (existingSet.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(({ name, state }, idx) => ({
        id: `city-seed-${idx + 1}`,
        name,
        state,
        isActive: true,
      }));

    if (toInsert.length > 0) {
      await CityModel.insertMany(toInsert, { ordered: false });
      console.log(`[marketplace-service] Seeded ${toInsert.length} serviceable cities.`);
    }
  } catch (err: any) {
    if (err?.code !== 11000) throw err;
  }
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

  // The customer web fetches all vendors and filters client-side, so the cap
  // must comfortably exceed the total listing count — a too-low limit silently
  // hid the newest vendors (a brand-new listing never appeared in search).
  // Newest first so recent signups are never the ones dropped if the cap is hit.
  const vendors = await VendorModel.find(filter).sort({ createdAt: -1 }).limit(1000);
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

const getDefaultImageForCategory = (category: string): string => {
  const fallbacks: Record<string, string> = {
    Catering: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800',
    Media: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800',
    Transport: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
    'Pujari/Priest': 'https://images.unsplash.com/photo-1609137144813-2dbe488ae650?w=800',
    Invitation: 'https://images.unsplash.com/photo-1632610992723-82d7c212f6d7?w=800',
    Printing: 'https://images.unsplash.com/photo-1503694978374-8a2fa686963a?w=800',
    Flowers: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800',
    Mehendi: 'https://images.unsplash.com/photo-1732118400647-a81e3b37be87?w=800',
    'Event Host/Anchor': 'https://images.unsplash.com/photo-1702562546665-4632bdb96e04?w=800',
    Security: 'https://images.unsplash.com/photo-1566245024852-04fbf7842ce9?w=800',
    Cleaning: 'https://images.unsplash.com/photo-1580842402762-6f5868c17412?w=800',
    'Rental Equipment': 'https://images.unsplash.com/photo-1695393386569-cf141ff2c552?w=800',
    'Utensils for Rent': 'https://images.unsplash.com/photo-1695393386569-cf141ff2c552?w=800',
    'Wedding Planner': 'https://images.unsplash.com/photo-1568847811512-803314424fdc?w=800',
    'Corporate Event Services': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  };
  return fallbacks[category] || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800';
};

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
    // Auto-approve new vendors so every vendor that signs up is live on the
    // marketplace immediately (no manual admin gate). An admin can still
    // suspend a bad listing via isSuspended.
    isVerified: true,
    galleryImages: [getDefaultImageForCategory(category || 'Venue')],
    packages: [],
    contactEmail: contactEmail || req.user!.email,
    contactPhone: contactPhone || '+91 9000000000',
  });

  res.status(201).json({ success: true, message: 'Vendor profile created and live on the marketplace.', data: { vendor } });
});

// 5. Update own vendor profile (business info, packages, pricing).
// Close a single date on a vendor's availability once a customer books it, so
// the same date can't be double-booked. Called server-to-server by the booking
// service (forwarding the booking customer's token) right after a booking is
// placed; any authenticated user may close the date they're booking.
app.post('/api/v1/vendors/:id/book-date', authMiddleware(), async (req: Request, res: Response) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ success: false, message: 'date is required.' });
  const vendor = await VendorModel.findOne({ id: req.params.id });
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  // Block the date unconditionally: take it out of "available" (if listed) and
  // add it to "booked" so a confirmed booking's date is closed off for everyone,
  // even for vendors that don't publish explicit availability.
  vendor.availableDates = (vendor.availableDates || []).filter((d) => d !== date);
  const booked = Array.isArray(vendor.bookedDates) ? vendor.bookedDates : [];
  if (!booked.includes(date)) vendor.bookedDates = [...booked, date];
  await vendor.save();
  res.json({ success: true, data: { availableDates: vendor.availableDates, bookedDates: vendor.bookedDates } });
});

// Free a previously-blocked date (e.g. a booking was cancelled) — moves it back
// out of bookedDates. Does not re-add to availableDates (the vendor re-opens it).
app.post('/api/v1/vendors/:id/free-date', authMiddleware(), async (req: Request, res: Response) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ success: false, message: 'date is required.' });
  const vendor = await VendorModel.findOne({ id: req.params.id });
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  vendor.bookedDates = (vendor.bookedDates || []).filter((d) => d !== date);
  await vendor.save();
  res.json({ success: true, data: { availableDates: vendor.availableDates, bookedDates: vendor.bookedDates } });
});

app.put('/api/v1/vendors/:id', authMiddleware(), async (req: Request, res: Response) => {
  const vendor = await VendorModel.findOne({ id: req.params.id });
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  if (vendor.userId !== req.user!.sub && req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'You do not own this vendor listing.' });
  }

  const { businessName, category, description, city, startingPrice, contactEmail, contactPhone, upiId, packages, facilities, galleryImages, availableDates, offeredOptions, offeredOptionPrices, offeredOptionItems, offeredOptionQuality, offeredOptionImages, giftCount, giftDiscount, policies, deals } = req.body;
  if (Array.isArray(deals)) {
    vendor.deals = deals;
    vendor.markModified('deals');
  }
  if (offeredOptionImages !== undefined) {
    (vendor as any).offeredOptionImages = offeredOptionImages;
    vendor.markModified('offeredOptionImages');
  }
  if (giftCount !== undefined) (vendor as any).giftCount = giftCount === null || giftCount === '' ? undefined : Number(giftCount);
  if (giftDiscount !== undefined) (vendor as any).giftDiscount = giftDiscount;
  if (businessName !== undefined) vendor.businessName = businessName;
  if (category !== undefined) vendor.category = category;
  if (description !== undefined) vendor.description = description;
  if (city !== undefined) vendor.location.city = city;
  if (startingPrice !== undefined) vendor.startingPrice = Number(startingPrice);
  if (contactEmail !== undefined) vendor.contactEmail = contactEmail;
  if (contactPhone !== undefined) vendor.contactPhone = contactPhone;
  if (upiId !== undefined) (vendor as any).upiId = upiId;
  if (Array.isArray(packages)) {
    vendor.packages = packages;
    vendor.markModified('packages');
  }
  if (facilities !== undefined) vendor.facilities = { ...(vendor.facilities as any), ...facilities };
  if (Array.isArray(galleryImages)) {
    vendor.galleryImages = galleryImages;
    vendor.markModified('galleryImages');
  }
  if (Array.isArray(availableDates)) {
    vendor.availableDates = availableDates;
    vendor.markModified('availableDates');
  }
  if (Array.isArray(offeredOptions)) (vendor as any).offeredOptions = offeredOptions;
  if (offeredOptionPrices !== undefined) {
    (vendor as any).offeredOptionPrices = offeredOptionPrices;
    vendor.markModified('offeredOptionPrices');
  }
  if (offeredOptionItems !== undefined) {
    (vendor as any).offeredOptionItems = offeredOptionItems;
    vendor.markModified('offeredOptionItems');
  }
  if (offeredOptionQuality !== undefined) {
    (vendor as any).offeredOptionQuality = offeredOptionQuality;
    vendor.markModified('offeredOptionQuality');
  }
  if (policies !== undefined) {
    vendor.policies = { ...(vendor.policies as any), ...policies };
    vendor.markModified('policies');
  }
  // Return Gifts vendors: how many pieces and any quantity discount.
  if (giftCount !== undefined) (vendor as any).giftCount = giftCount === '' || giftCount === null ? undefined : Number(giftCount);
  if (giftDiscount !== undefined) (vendor as any).giftDiscount = giftDiscount;

  vendor.markModified('facilities');
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

  const isVideo = file.mimetype?.startsWith('video/') || /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.originalname);

  if (isVideo) {
    await VendorModel.updateOne({ id: vendorId }, { $push: { galleryVideos: fileUrl } });
  } else {
    await VendorModel.updateOne({ id: vendorId }, { $push: { galleryImages: fileUrl } });
  }

  res.json({
    success: true,
    message: 'Portfolio asset uploaded to Local Disk Storage (/uploads).',
    data: { fileUrl, filename: file.originalname, sizeBytes: file.size, isVideo },
  });
});

// 6b. UPI payment QR code upload — single image, replaces any previous one.
app.post('/api/v1/vendors/:id/upload-qr', authMiddleware(), upload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const vendorId = req.params.id;
  const vendorForUpload = await VendorModel.findOne({ id: vendorId });
  if (!vendorForUpload) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  if (vendorForUpload.userId !== req.user!.sub && req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'You do not own this vendor listing.' });
  }

  const fileUrl = await storageProvider.saveFile(file.buffer, file.originalname, `vendor-${vendorId}-qr`);

  await VendorModel.updateOne({ id: vendorId }, { qrCodeImage: fileUrl });

  res.json({
    success: true,
    message: 'UPI QR code uploaded to Local Disk Storage (/uploads).',
    data: { fileUrl, filename: file.originalname, sizeBytes: file.size },
  });
});

// 6c. Package image upload — stored via the shared LocalStorageProvider abstraction.
app.post('/api/v1/vendors/:id/upload-package-image', authMiddleware(), upload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const vendorId = req.params.id;
  const vendorForUpload = await VendorModel.findOne({ id: vendorId });
  if (!vendorForUpload) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  if (vendorForUpload.userId !== req.user!.sub && req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'You do not own this vendor listing.' });
  }

  const fileUrl = await storageProvider.saveFile(file.buffer, file.originalname, `vendor-${vendorId}-package-${Date.now()}`);

  res.json({
    success: true,
    message: 'Package image uploaded successfully.',
    data: { fileUrl, filename: file.originalname, sizeBytes: file.size },
  });
});

// 6b-ii. Customer reference-image upload — any authenticated user can upload
// an image (saved under their own folder) and get back a URL to attach to a
// booking, so the vendor can see what the customer wants. Not tied to any
// vendor's gallery, so no ownership check.
app.post('/api/v1/uploads', authMiddleware(), upload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const fileUrl = await storageProvider.saveFile(file.buffer, file.originalname, `customer-${req.user!.sub}`);
  res.json({
    success: true,
    message: 'Image uploaded to Local Disk Storage (/uploads).',
    data: { fileUrl, filename: file.originalname, sizeBytes: file.size },
  });
});

// 6c. Internal rating sync — the guest-feedback service pushes a vendor's
// recomputed aggregate rating here after a verified review is published, so the
// vendor's card and dashboard reflect real reviews. Inputs are clamped; in a
// hardened deployment this should sit behind an internal-only network or a
// shared service secret rather than the public gateway.
app.put('/api/v1/vendors/:id/rating', async (req: Request, res: Response) => {
  // Only the guest-feedback service should call this. When INTERNAL_API_SECRET
  // is set, require a matching header so the public gateway can't be used to
  // spoof vendor ratings. (Left open only if the secret is unset, for local dev.)
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (internalSecret && req.headers['x-internal-secret'] !== internalSecret) {
    return res.status(403).json({ success: false, message: 'Forbidden: internal endpoint.' });
  }

  const { ratingAverage, reviewCount } = req.body;
  const vendor = await VendorModel.findOne({ id: req.params.id });
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });

  if (ratingAverage !== undefined) vendor.ratingAverage = Math.max(0, Math.min(5, Number(ratingAverage) || 0));
  if (reviewCount !== undefined) vendor.reviewCount = Math.max(0, Math.round(Number(reviewCount) || 0));
  await vendor.save();
  res.json({ success: true, data: { vendor } });
});

// 6b. Vendor submits a verification request (KYC details + proof documents) to
// earn the Verified badge. Owner-only; moves status to 'pending' for admin review.
app.post('/api/v1/vendors/:id/verification', authMiddleware(), requireRole('vendor', 'admin'), async (req: Request, res: Response) => {
  const vendor = await VendorModel.findOne({ id: req.params.id });
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  if (vendor.userId !== req.user!.sub && req.user!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'You can only submit verification for your own listing.' });
  }
  if (vendor.verification?.status === 'verified') {
    return res.status(409).json({ success: false, message: 'This listing is already verified.' });
  }

  const { legalName, registrationNumber, gstNumber, contactPerson, documents } = req.body;
  vendor.verification = {
    status: 'pending',
    legalName: (legalName || '').trim(),
    registrationNumber: (registrationNumber || '').trim(),
    gstNumber: (gstNumber || '').trim(),
    contactPerson: (contactPerson || '').trim(),
    documents: Array.isArray(documents) ? documents.filter((d: any) => typeof d === 'string') : [],
    submittedAt: new Date().toISOString(),
    reviewedAt: '',
    rejectionReason: '',
  };
  await vendor.save();
  res.json({ success: true, message: 'Verification request submitted for review.', data: { vendor } });
});

// 7. Admin verification decision. With a body of { decision: 'approve' | 'reject',
// reason? } it records the review outcome; with no body it toggles (legacy UI).
app.put('/api/v1/vendors/:id/verify', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  const vendor = await VendorModel.findOne({ id: req.params.id });
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });

  const decision = req.body?.decision as 'approve' | 'reject' | undefined;
  const now = new Date().toISOString();
  const v = vendor.verification;
  // Preserve the KYC details the vendor submitted; only the status/review fields change.
  const current = {
    legalName: v?.legalName || '',
    registrationNumber: v?.registrationNumber || '',
    gstNumber: v?.gstNumber || '',
    contactPerson: v?.contactPerson || '',
    documents: v?.documents || [],
    submittedAt: v?.submittedAt || '',
  };

  if (decision === 'approve') {
    vendor.isVerified = true;
    vendor.verification = { ...current, status: 'verified', reviewedAt: now, rejectionReason: '' };
  } else if (decision === 'reject') {
    vendor.isVerified = false;
    vendor.verification = { ...current, status: 'rejected', reviewedAt: now, rejectionReason: (req.body?.reason || '').trim() };
  } else {
    // Legacy toggle — keep verification.status consistent with the flag.
    vendor.isVerified = !vendor.isVerified;
    vendor.verification = { ...current, status: vendor.isVerified ? 'verified' : 'unverified', reviewedAt: now, rejectionReason: '' };
  }
  await vendor.save();
  res.json({ success: true, message: `Vendor verification status updated to ${vendor.isVerified}.`, data: { vendor } });
});

// 8. Admin suspend/reinstate a vendor listing (hides it from a real storefront in future work).
app.put('/api/v1/vendors/:id/suspend', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  const vendor = await VendorModel.findOne({ id: req.params.id });
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });

  vendor.isSuspended = !vendor.isSuspended;
  await vendor.save();
  res.json({ success: true, message: `Vendor ${vendor.isSuspended ? 'suspended' : 'reinstated'}.`, data: { vendor } });
});

// --- Categories ---
app.get('/api/v1/categories', async (req: Request, res: Response) => {
  const categories = await CategoryModel.find().sort({ name: 1 });
  res.json({ success: true, data: { categories } });
});

app.post('/api/v1/categories', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'name is required.' });

  const category = await CategoryModel.create({ id: `cat-${Date.now()}`, name, icon });
  res.status(201).json({ success: true, message: 'Category added.', data: { category } });
});

app.delete('/api/v1/categories/:id', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  await CategoryModel.deleteOne({ id: req.params.id });
  res.json({ success: true, message: 'Category removed.' });
});

// --- Serviceable locations/cities ---
app.get('/api/v1/locations', async (req: Request, res: Response) => {
  const locations = await CityModel.find().sort({ name: 1 });
  res.json({ success: true, data: { locations } });
});

app.post('/api/v1/locations', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  const { name, state, locations } = req.body;

  if (Array.isArray(locations)) {
    try {
      const existing = await CityModel.find({}, { name: 1, state: 1 });
      const existingSet = new Set(existing.map(e => `${e.name.toLowerCase()}|${e.state.toLowerCase()}`));

      const toInsert = locations
        .filter((loc: any) => loc.name && loc.state && !existingSet.has(`${loc.name.trim().toLowerCase()}|${loc.state.trim().toLowerCase()}`))
        .map((loc: any, idx: number) => ({
          id: `city-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          name: loc.name.trim(),
          state: loc.state.trim(),
          isActive: true
        }));

      if (toInsert.length === 0) {
        return res.status(200).json({ success: true, message: 'All selected locations already exist.' });
      }

      const result = await CityModel.insertMany(toInsert, { ordered: false });
      return res.status(201).json({ success: true, message: `${result.length} locations added.`, data: { locations: result } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Bulk write error.' });
    }
  }

  if (!name) return res.status(400).json({ success: false, message: 'name is required.' });

  try {
    const existing = await CityModel.findOne({
      name: new RegExp(`^${name.trim()}$`, 'i'),
      state: new RegExp(`^${state.trim()}$`, 'i')
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Location already exists.' });
    }

    const location = await CityModel.create({ id: `city-${Date.now()}`, name: name.trim(), state: state.trim() });
    res.status(201).json({ success: true, message: 'Location added.', data: { location } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create location.' });
  }
});


app.delete('/api/v1/locations/:id', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  await CityModel.deleteOne({ id: req.params.id });
  res.json({ success: true, message: 'Location removed.' });
});

// --- Promotional banners ---
app.get('/api/v1/banners', async (req: Request, res: Response) => {
  const banners = await BannerModel.find().sort({ order: 1 });
  res.json({ success: true, data: { banners } });
});

app.post('/api/v1/banners', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  const { title, imageUrl, linkUrl, order } = req.body;
  if (!title || !imageUrl) return res.status(400).json({ success: false, message: 'title and imageUrl are required.' });

  const banner = await BannerModel.create({ id: `ban-${Date.now()}`, title, imageUrl, linkUrl, order: Number(order) || 0 });
  res.status(201).json({ success: true, message: 'Banner added.', data: { banner } });
});

app.delete('/api/v1/banners/:id', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  await BannerModel.deleteOne({ id: req.params.id });
  res.json({ success: true, message: 'Banner removed.' });
});

async function start() {
  await connectDB(process.env.MONGODB_URI, 'marketplace-service');
  await migrateMediaAndAdvance();
  // Demo/sample vendors are opt-in (SEED_DEMO_VENDORS=true) — off by default so
  // production only ever shows real, registered vendors. The seed is additive,
  // so leaving it on would re-create the demo vendors on every restart even
  // after they're deleted.
  if (process.env.SEED_DEMO_VENDORS === 'true') {
    await seedIfEmpty();
  }
  await seedCategoriesAndCities();
  app.listen(PORT, () => {
    console.log(`[Marketplace Microservice] Running on http://localhost:${PORT}`);
  });
}

start();
// reload 2
