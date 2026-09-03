export type Role = 'customer' | 'vendor' | 'event_manager' | 'admin' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  avatarUrl?: string;
  // How the account signs in. 'password' is the default email+password account;
  // 'google' is created/linked via "Sign in with Google" and has no usable password
  // until the user sets one through Forgot Password.
  authProvider?: 'password' | 'google';
  isVerified: boolean;
  isSuspended: boolean;
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
  pricePerPlate?: number; // per plate / per person cost (catering)
  description: string;
  includedServices: string[];
  durationHours?: number;
  capacityPersons?: number;
  // Photos of this package / hall (URLs on the storage service), shown to
  // customers on the package card.
  images?: string[];
  // Optional vendor-defined price tiers (named however the vendor likes —
  // Normal / HD / Premium, Silver / Gold, …). When present the customer picks
  // one and its price is used; when empty the flat `price` applies.
  tiers?: PackageTier[];
  // Catering-only structured menu details. Only set/shown for Catering vendors,
  // whose package form replaces the generic fields with these.
  catering?: CateringPackageDetails;
  // Venue-only structured hall details. Only set/shown for Venue vendors.
  venue?: VenuePackageDetails;
  // Decoration-only structured details. Only set/shown for Decoration vendors.
  decoration?: DecorationPackageDetails;
  // Makeup & Beauty-only structured details.
  makeup?: MakeupPackageDetails;
  // Media (Photo/Video)-only structured details.
  media?: MediaPackageDetails;
  // Transport-only structured details.
  transport?: TransportPackageDetails;
  // Pujari/Priest-only structured details.
  priest?: PriestPackageDetails;
  // Invitation-only structured details.
  invitation?: InvitationPackageDetails;
  // Printing-only structured details.
  printing?: PrintingPackageDetails;
  // Return Gifts-only structured details.
  returnGifts?: ReturnGiftsPackageDetails;
  // Entertainment-only structured details. (Number of performers reuses
  // capacityPersons; Duration reuses durationHours.)
  entertainment?: EntertainmentPackageDetails;
  // Music/DJ-only structured details.
  musicDj?: MusicDjPackageDetails;
  // Lighting-only structured details.
  lighting?: LightingPackageDetails;
  // Flowers-only structured details.
  flowers?: FlowersPackageDetails;
  // Mehendi-only structured details.
  mehendi?: MehendiPackageDetails;
  // Event Host/Anchor-only structured details.
  eventHost?: EventHostPackageDetails;
  // Security-only structured details.
  security?: SecurityPackageDetails;
  // Rental Equipment-only structured details.
  rental?: RentalPackageDetails;
  // Utensils for Rent-only structured details.
  utensils?: UtensilsPackageDetails;
  // Wedding Planner-only structured details.
  weddingPlanner?: WeddingPlannerPackageDetails;
  // Corporate Event Services-only structured details.
  corporate?: CorporatePackageDetails;
}

// Structured details for a Corporate Event Services vendor's package (per event / head).
// The add-on options each carry their OWN price (₹) so the vendor prices them
// separately; a blank/0 price means the add-on is not offered.
export interface CorporatePackageDetails {
  eventType?: string; // Event type chosen (Conference / Product launch / Awards / Team outing)
  basePrice?: number; // Base event package price (₹)
  eventTypePrices?: Record<string, number>; // price (₹) per event type offered
  numAttendees?: number;
  numDays?: number;
  avStageBranding?: number; // price (₹) for AV + stage + branding
  registrationDesk?: number; // price (₹) for the registration desk
  cateringCoordination?: number; // price (₹) for catering coordination
  mcHost?: number; // price (₹) for MC / host
}

// The Corporate add-on options that each take their own price, in display order.
export const CORPORATE_ADDONS = [
  { key: 'avStageBranding', label: 'AV + stage + branding' },
  { key: 'registrationDesk', label: 'Registration desk' },
  { key: 'cateringCoordination', label: 'Catering coordination' },
  { key: 'mcHost', label: 'MC / host' },
] as const;

// Option set for the Corporate Event Services package form.
export const CORPORATE_EVENT_TYPES = ['Conference', 'Product launch', 'Awards', 'Team outing'] as const;

// Structured details for a Wedding Planner vendor's package (per package / function).
export interface WeddingPlannerPackageDetails {
  scope?: string; // Day coordination / Partial / Full / Destination (also the tier)
  numFunctions?: number;
  vendorCoordination?: boolean;
  budgetManagement?: boolean;
  teamSize?: number; // on-ground team size
  guestManagement?: boolean; // guest management / hospitality
  planningMeetings?: number;
}

// Option set for the Wedding Planner package form.
export const WEDDING_PLANNER_SCOPES = ['Day coordination', 'Partial', 'Full', 'Destination'] as const;

// Structured details for a Utensils for Rent vendor's package (per guest / set).
export interface UtensilsPackageDetails {
  material?: string; // Steel / Brass / Premium
  vesselTypes?: string[]; // Cooking vessels / Serving / Plates & tumblers / Banana-leaf holders
  vesselTypePrices?: Record<string, number>; // price (₹) per vessel type offered
  basePrice?: number; // Base rental price
  guestCount?: number; // guest count served
  deliveryPickup?: boolean; // legacy boolean
  deliveryPickupPrice?: number; // price (₹) for delivery + pickup
  cleaningIncluded?: boolean;
  securityDeposit?: number; // ₹
}

// Option sets for the Utensils for Rent package form.
export const UTENSILS_MATERIALS = ['Steel', 'Brass', 'Premium'] as const;
export const UTENSILS_VESSEL_TYPES = ['Cooking vessels', 'Serving', 'Plates & tumblers', 'Banana-leaf holders'] as const;

// Structured details for a Rental Equipment vendor's package (per item, per day).
export interface RentalPackageDetails {
  items?: string[]; // Chairs / Tables / Tents / Stage / Sofas / Carpets / Coolers / Fans / Generators
  quantity?: number;
  setupTeardown?: boolean; // setup + teardown included
  delivery?: boolean;
  securityDeposit?: number; // ₹
}

// Option set for the Rental Equipment package form.
export const RENTAL_ITEMS = ['Chairs', 'Tables', 'Tents', 'Stage', 'Sofas', 'Carpets', 'Coolers', 'Fans', 'Generators'] as const;

// Structured details for a Security vendor's package (per guard / per shift).
export interface SecurityPackageDetails {
  numGuards?: number;
  type?: string; // Guards / Bouncers
  gender?: string; // Male / Female / Mixed
  hoursShifts?: number;
  metalDetectors?: boolean;
  cctv?: boolean;
  vipProtection?: boolean;
  crowdManagement?: boolean; // gate / crowd management
}

// Option sets for the Security package form.
export const SECURITY_TYPES = ['Guards', 'Bouncers'] as const;
export const SECURITY_GENDERS = ['Male', 'Female', 'Mixed'] as const;

// Structured details for an Event Host/Anchor vendor's package (per event).
export interface EventHostPackageDetails {
  eventType?: string; // Wedding / Sangeet / Reception / Corporate
  languages?: string[]; // Tamil / Hindi / English / Telugu
  hours?: number;
  numEvents?: number;
  gamesScripting?: boolean; // games / scripting included
  hostMode?: string; // Solo / Co-host
  travelIncluded?: boolean;
}

// Option sets for the Event Host/Anchor package form.
export const EVENT_HOST_EVENT_TYPES = ['Wedding', 'Sangeet', 'Reception', 'Corporate'] as const;
export const EVENT_HOST_LANGUAGES = ['Tamil', 'Hindi', 'English', 'Telugu'] as const;
export const EVENT_HOST_MODES = ['Solo', 'Co-host'] as const;

// Structured details for a Mehendi vendor's package (per bride / per hand).
export interface MehendiPackageDetails {
  tier?: string; // Guest-simple / Bridal / Arabic / Rajasthani
  type?: string; // Bridal / Guest / Arabic / Rajasthani / Glitter
  intricacy?: string; // Simple / Full hands + feet
  numArtists?: number; // for guest stalls
  perHandPrice?: number; // per-hand price for guests
  organicHenna?: boolean;
  durationHours?: number;
  travelIncluded?: boolean;
}

// Option sets for the Mehendi package form.
export const MEHENDI_TIERS = ['Guest-simple', 'Bridal', 'Arabic', 'Rajasthani'] as const;
export const MEHENDI_TYPES = ['Bridal', 'Guest', 'Arabic', 'Rajasthani', 'Glitter'] as const;
export const MEHENDI_INTRICACY = ['Simple', 'Full hands + feet'] as const;

// Structured details for a Flowers vendor's package (per item / per function).
export interface FlowersPackageDetails {
  variety?: string; // Marigold / Rose / Imported (also the tier)
  items?: string[]; // Garlands (maalai) / Car decor / Mandap / Bouquet / Jaimala / Hair flowers / Rangoli
  flowerKind?: string; // Fresh / Artificial
  quantity?: number;
  deliveryTiming?: string; // free text
  whichFunction?: string; // free text
}

// Option sets for the Flowers package form.
export const FLOWERS_VARIETIES = ['Marigold', 'Rose', 'Imported'] as const;
export const FLOWERS_ITEMS = ['Garlands (maalai)', 'Car decor', 'Mandap', 'Bouquet', 'Jaimala', 'Hair flowers', 'Rangoli'] as const;
export const FLOWERS_KINDS = ['Fresh', 'Artificial'] as const;

// Structured details for a Lighting vendor's package (per function).
export interface LightingPackageDetails {
  tier?: string; // Basic / Premium / Grand
  lightingTypes?: string[]; // Ambient / Laser / LED walls / Up-lighting / Fairy lights / Gobo monogram / Pathway
  areaCovered?: string; // free text
  numFixtures?: number;
  powerBackup?: boolean;
  setupTeardown?: boolean; // setup + teardown included
  numFunctions?: number;
}

// Option sets for the Lighting package form.
export const LIGHTING_TIERS = ['Basic', 'Premium', 'Grand'] as const;
export const LIGHTING_TYPES = ['Ambient', 'Laser', 'LED walls', 'Up-lighting', 'Fairy lights', 'Gobo monogram', 'Pathway'] as const;

// Structured details for a Music/DJ vendor's package (per event / per hour).
export interface MusicDjPackageDetails {
  tier?: string; // Basic / Premium
  type?: string; // DJ / Live band / Nadhaswaram / Sangeet setup
  hours?: number; // number of hours
  soundSystem?: boolean; // sound system + speakers included
  lighting?: boolean; // lighting included
  numArtists?: number;
  mcHost?: boolean; // MC / host included
  venueType?: string; // Indoor / Outdoor
  generator?: boolean;
}

// Option sets for the Music/DJ package form.
export const MUSIC_DJ_TIERS = ['Basic', 'Premium'] as const;
export const MUSIC_DJ_TYPES = ['DJ', 'Live band', 'Nadhaswaram', 'Sangeet setup'] as const;
export const MUSIC_DJ_VENUE_TYPES = ['Indoor', 'Outdoor'] as const;

// Structured details for an Entertainment vendor's package (per act / per hour).
export interface EntertainmentPackageDetails {
  actType?: string; // Fireworks / Celebrity / Live band / Dance troupe / Magician / Folk artists
  equipmentIncluded?: boolean;
  travelIncluded?: boolean;
}

// Option set for the Entertainment package form.
export const ENTERTAINMENT_ACT_TYPES = ['Fireworks', 'Celebrity', 'Live band', 'Dance troupe', 'Magician', 'Folk artists'] as const;

// Structured details for a Return Gifts vendor's package (per piece).
export interface ReturnGiftsPackageDetails {
  tier?: string; // Economy / Standard / Premium
  giftType?: string; // Dry fruits / Silver items / Potli bags / Plants / Hampers / Sweets
  countOfGifts?: number; // number of gift pieces per order/set
  minQuantity?: number;
  packingTimeDays?: number; // packing time in days
  customization?: boolean; // name / date print
  packagingType?: string; // free text
  bulkDiscount?: string; // free text, e.g. "10% off above 200"
}

// Option sets for the Return Gifts package form.
export const RETURN_GIFTS_TIERS = ['Economy', 'Standard', 'Premium'] as const;
export const RETURN_GIFT_TYPES = ['Dry fruits', 'Silver items', 'Potli bags', 'Plants', 'Hampers', 'Sweets'] as const;

// Structured details for a Printing vendor's package (per quantity).
export interface PrintingPackageDetails {
  product?: string; // Banners / Flex / Albums / Standees / Photo frames / Thank-you cards
  size?: string; // free text
  quantity?: number;
  finishes?: string[]; // Matte / Glossy / Lamination
  designIncluded?: boolean; // design included
  deliveryTime?: string; // free text, e.g. "2 days"
}

// Option sets for the Printing package form.
export const PRINTING_PRODUCTS = ['Banners', 'Flex', 'Albums', 'Standees', 'Photo frames', 'Thank-you cards'] as const;
export const PRINTING_FINISHES = ['Matte', 'Glossy', 'Lamination'] as const;

// Structured details for an Invitation vendor's package (per design / quantity).
export interface InvitationPackageDetails {
  tier?: string; // Digital / Printed / Premium
  type?: string; // Digital e-invite / Video invite / Printed card
  design?: string; // Custom / Template
  quantity?: number; // for printed
  revisions?: number; // number of design revisions
  addOns?: string[]; // RSVP link, Map, Caricature
  deliveryTime?: string; // free text, e.g. "3 days"
  languages?: string[]; // Tamil / Hindi / English / Telugu
}

// Option sets for the Invitation package form.
export const INVITATION_TIERS = ['Digital', 'Printed', 'Premium'] as const;
export const INVITATION_TYPES = ['Digital e-invite', 'Video invite', 'Printed card'] as const;
export const INVITATION_DESIGNS = ['Custom', 'Template'] as const;
export const INVITATION_ADDONS = ['RSVP link', 'Map', 'Caricature'] as const;
export const INVITATION_LANGUAGES = ['Tamil', 'Hindi', 'English', 'Telugu'] as const;

// Structured details for a Pujari/Priest vendor's package (per ceremony).
export interface PriestPackageDetails {
  ceremonyType?: string; // Wedding / Engagement / Griha Pravesh / Naming
  community?: string; // free text: Iyer / Iyengar / North Indian / etc.
  languages?: string[]; // Tamil / Sanskrit / Hindi
  samagriIncluded?: boolean; // pooja items (samagri) included
  numPriests?: number;
  durationHours?: number;
  muhurthamConsult?: boolean; // muhurtham consultation
}

// Option sets for the Pujari/Priest package form.
export const PRIEST_CEREMONY_TYPES = ['Wedding', 'Engagement', 'Griha Pravesh', 'Naming'] as const;
export const PRIEST_LANGUAGES = ['Tamil', 'Sanskrit', 'Hindi'] as const;

// Structured details for a Transport vendor's package (per vehicle).
export interface TransportPackageDetails {
  tier?: string; // Economy / Sedan / Luxury / Vintage-decorated
  vehicleType?: string; // legacy single vehicle type
  vehicleTypes?: string[]; // Car / SUV / Tempo Traveller / Bus / Decorated car (multi)
  vehicleTypeSeats?: Record<string, number>; // seats per vehicle type
  vehicleTypePrices?: Record<string, number>; // price per vehicle type
  vehicleTypeImages?: Record<string, string>; // image per vehicle type
  pricingBasis?: string; // legacy Per day / Per km selector
  perDayPrice?: number; // price when hired per day
  perKmPrice?: number; // price when hired per km
  numVehicles?: number;
  numVehiclesPrice?: number;
  seatsPerVehicle?: number;
  seatsPrice?: number;
  kmHoursIncluded?: number; // kilometres / hours included
  kmHoursPrice?: number;
  driverFuel?: boolean; // driver + fuel included
  driverFuelPrice?: number;
  carDecoration?: boolean;
  carDecorationType?: string; // type of decoration
  carDecorationPrice?: number;
  carDecorationImage?: string;
  use?: string; // legacy single use
  uses?: string[]; // Baraat / Guests / Couple (multi)
  usePrices?: Record<string, number>; // price per use
  baraatHours?: number; // hours for Baraat use
  guestsPersons?: number; // persons for Guests use
}

// Option sets for the Transport package form.
export const TRANSPORT_TIERS = ['Economy', 'Sedan', 'Luxury', 'Vintage-decorated'] as const;
export const TRANSPORT_VEHICLE_TYPES = ['Car', 'SUV', 'Tempo Traveller', 'Bus', 'Decorated car'] as const;
export const TRANSPORT_PRICING_BASIS = ['Per day', 'Per km'] as const;
export const TRANSPORT_USES = ['Baraat', 'Guests', 'Couple'] as const;

// Structured details for a Media vendor's package (per event / per day).
export interface MediaPackageDetails {
  tier?: string; // Silver / Gold / Platinum
  coverage?: string; // Photo only / Photo + Video / Cinematic
  coveragePrice?: number; // price for the chosen coverage
  coverageImage?: string; // sample image for the coverage
  coverageSize?: string; // size of the video / photo
  coverageQuality?: string; // quality of the video / photo
  styles?: string[]; // Candid / Traditional
  stylePrices?: Record<string, number>; // price per selected style
  styleImages?: Record<string, string>; // image per selected style
  daysOrEvents?: number; // number of days or events
  daysPrice?: number; // price for days / events
  preWedding?: boolean; // pre-wedding shoot
  drone?: boolean;
  crewCount?: number; // photographers / cinematographers
  crewPrice?: number; // price for the crew
  editedPhotos?: number; // deliverable: edited photos count
  albumType?: string; // album type
  albumTypePrice?: number; // price for the album type
  photoFrameSize?: string; // photo frame size
  photoFramePrice?: number; // price for the photo frame
  albumPages?: number; // deliverable: album pages
  albumPagesPrice?: number; // price for the album pages
  teaser?: boolean; // deliverable: teaser
  film4k?: boolean; // deliverable: 4K film
  hoursCoverage?: number; // total hours of coverage
  hoursPrice?: number; // price for hours of coverage
  // For each "Yes" deliverable (preWedding, drone, teaser, film4k): an optional
  // price, quality note, and uploaded image, keyed by the field name.
  featurePrices?: Record<string, number>;
  featureQuality?: Record<string, string>;
  featureImages?: Record<string, string>;
}

// Option sets for the Media package form.
export const MEDIA_TIERS = ['Silver', 'Gold', 'Platinum'] as const;
export const MEDIA_COVERAGE = ['Photo only', 'Photo + Video', 'Cinematic'] as const;
export const MEDIA_STYLES = ['Candid', 'Traditional'] as const;

// Structured details for a Makeup & Beauty vendor's package (per look / function).
export interface MakeupPackageDetails {
  makeupTypes?: string[]; // Function type: Bridal / Engagement / Reception / Groom / Party guest
  makeupTypePrices?: Record<string, number>; // price per selected function type
  makeupTypeImages?: Record<string, string>; // image per selected function type
  finish?: string; // Regular / HD / Airbrush (also the tier)
  finishPrice?: number; // price for the chosen finish / tier
  hairstyleName?: string; // name of the hairstyle offered
  hairstylePrice?: number; // price of the hairstyle
  hairstyling?: boolean; // legacy: hairstyling included (superseded by hairstyleName/Price)
  draping?: boolean; // saree / dupatta draping included
  drapingPrice?: number; // price when draping is offered
  looksCount?: number; // number of looks / functions (legacy, no longer edited)
  trialSession?: boolean; // trial session included
  travelToVenue?: boolean;
  travelPrice?: number; // price when travel to venue is offered
  extraFamilyMembers?: number; // extra family members covered
  extraFamilyPrice?: number; // price for extra family members
}

// Option sets for the Makeup & Beauty package form.
export const MAKEUP_TYPES = ['Bridal', 'Engagement', 'Reception', 'Groom', 'Party guest'] as const;
export const MAKEUP_FINISHES = ['Regular', 'HD', 'Airbrush'] as const;

// Structured details for a Decoration vendor's package (priced per function).
export interface DecorationPackageDetails {
  tier?: string; // Basic / Premium / Luxury
  themes?: string[]; // Floral / Royal / Minimal / Traditional / Destination
  themePrices?: Record<string, number>; // price per selected theme
  themeImages?: Record<string, string>; // image per selected theme
  areas?: string[]; // Stage, Entrance, Mandap, Walkway, Reception backdrop
  areaPrices?: Record<string, number>; // price per selected area
  areaImages?: Record<string, string>; // image per selected area
  flowers?: string; // Fresh / Artificial
  flowerPrices?: Record<string, number>; // price per flower kind
  flowerImages?: Record<string, string>; // image per flower kind
  coupleSofa?: boolean; // couple sofa / seating included
  mandapType?: string; // free text, e.g. "Traditional wooden mandap"
  mandapPrice?: number; // price for the mandap
  mandapImage?: string; // uploaded mandap image
  lighting?: boolean; // lighting included
  functionsCovered?: number; // number of functions covered
}

// Option sets for the Decoration package form.
export const DECORATION_TIERS = ['Basic', 'Premium', 'Luxury'] as const;
export const DECORATION_THEMES = ['Floral', 'Royal', 'Minimal', 'Traditional', 'Destination'] as const;
export const DECORATION_AREAS = ['Stage', 'Entrance', 'Mandap', 'Walkway', 'Reception backdrop'] as const;
export const DECORATION_FLOWER_TYPES = ['Fresh', 'Artificial'] as const;

// Structured hall details for a Venue vendor's package (priced per session).
// Hall name = packageName, seating capacity = capacityPersons (reused).
export interface VenuePackageDetails {
  sessions?: string[]; // Morning / Evening / Full Day (priced per session)
  hallType?: string; // AC / Non-AC
  hallTypePrice?: number; // price for the chosen hall type
  hallClass?: string; // Premium / Normal
  hallClassPrice?: number; // price for the chosen hall class
  parking?: boolean;
  powerBackup?: boolean; // power backup / generator
  bridalRoom?: boolean; // bridal / green room
  accommodationRooms?: number;
  cateringPolicy?: string; // In-house only / External allowed
  cateringPrice?: number; // price for the catering option
  cateringImage?: string; // In-house only → menu photo; External allowed → sample image
  stageIncluded?: boolean;
  valetService?: boolean; // valet / parking service
  // For each "Yes" feature (parking, powerBackup, bridalRoom, stageIncluded,
  // valetService): an optional price and an optional uploaded image, keyed by
  // the feature field name.
  featurePrices?: Record<string, number>;
  featureImages?: Record<string, string>;
}

// The Yes/No hall features that carry an optional price + image when offered.
export const VENUE_FEATURES = [
  ['parking', 'Parking available'],
  ['powerBackup', 'Power backup / generator'],
  ['bridalRoom', 'Bridal / green room'],
  ['stageIncluded', 'Stage included'],
  ['valetService', 'Valet / parking service'],
] as const;

// Option sets for the Venue package form.
export const VENUE_SESSIONS = ['Morning', 'Evening', 'Full Day'] as const;
export const VENUE_HALL_TYPES = ['AC', 'Non-AC'] as const;
export const VENUE_HALL_CLASSES = ['Premium', 'Normal'] as const;
export const VENUE_CATERING_POLICIES = ['In-house only', 'External allowed'] as const;

export interface CateringFoodItem {
  name: string;
  price?: number;
  photo?: string;
}

export type CateringCourseItem = CateringFoodItem;

// Structured menu details for a Catering vendor's package (per-plate menu).
export interface CateringPackageDetails {
  menuTier?: string; // Silver / Gold / Platinum
  pricePerPlate?: number; // Per plate cost (₹)
  foodTypes?: string[]; // Veg / Non-Veg / Jain
  foodTypeItems?: Record<string, CateringFoodItem[]>; // item names and rates per food type (Veg, Non-Veg, Jain)
  cuisines?: string[]; // South Indian, Chettinad, North Indian, Continental
  cuisineItems?: Record<string, CateringFoodItem[]>; // item names and rates per cuisine (South Indian, Chettinad, North Indian, Continental)
  courses?: string[]; // Starters, Mains, Desserts
  courseItems?: Record<string, CateringCourseItem[]>; // dishes per course with photo, name, and price
  starters?: number; // number of starter dishes included
  mains?: number; // number of main-course dishes included
  desserts?: number; // number of desserts included
  minGuests?: number; // minimum guest count
  liveCounters?: string[]; // Chaat, Ice Cream, …
  liveCounterItems?: Record<string, CateringFoodItem[]>; // item names and rates per live counter (Chaat, Ice Cream)
  serviceStyle?: string; // Buffet / Seated / Banana-leaf
  plateTypes?: string[]; // Paper Plate, Thermocol Plate, Steel Plates, Ceramic Plates
  leafType?: string; // Natural Banana Leaf / Artificial Leaf
  welcomeDrinks?: boolean;
  welcomeDrinkItems?: CateringFoodItem[]; // Drink name and price
  servingStaff?: boolean; // serving staff included
  freeTasting?: boolean; // free tasting/trial offered
  freeTastingItems?: string[]; // Items available for tasting
}

// Option sets for the Catering package form (single source of truth for the
// vendor editor and the customer listing).
export const CATERING_MENU_TIERS = ['Silver', 'Gold', 'Platinum'] as const;
export const CATERING_FOOD_TYPES = ['Veg', 'Non-Veg', 'Jain'] as const;
export const CATERING_CUISINES = ['South Indian', 'Chettinad', 'North Indian', 'Continental'] as const;
export const CATERING_COURSES = ['Starters', 'Mains', 'Desserts'] as const;
export const CATERING_LIVE_COUNTERS = ['Chaat', 'Ice Cream'] as const;
export const CATERING_SERVICE_STYLES = ['Buffet', 'Seated', 'Banana-leaf'] as const;
export const BUFFET_PLATE_TYPES = ['Paper Plate', 'Thermocol Plate', 'Steel Plates', 'Ceramic Plates'] as const;
export const BANANA_LEAF_TYPES = ['Natural Banana Leaf', 'Artificial Leaf'] as const;

// A named price tier within a package.
export interface PackageTier {
  name: string;
  price: number;
}

export type FacilityTier = 'included' | 'extra_cost' | 'not_offered';

export type CateringMenuCategoryType =
  | 'veg'
  | 'non-veg'
  | 'starters-veg'
  | 'starters-non-veg'
  | 'cool-drinks'
  | 'desserts'
  | 'mocktails'
  | 'snacks';

// A single dish/drink on a menu card — the vendor sets a real photo, price,
// and availability for each one individually.
export interface CateringMenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  available: boolean;
}

// A single page of a caterer's menu (Veg, Non-Veg, Starters (Veg/Non-Veg),
// Cool Drinks, Desserts, Mocktails, Snacks) — a card title plus the list of
// individually-priced, individually-photographed items on that page.
export interface CateringMenuCategory {
  id: string;
  title: string;
  type: CateringMenuCategoryType;
  image: string;
  items: CateringMenuItem[];
  pricePerPerson?: number; // optional per-plate summary price, shown alongside individual item prices
}

export interface VendorFacilities {
  acRoom: boolean;
  fansOnly: boolean;
  vipRoom: boolean;
  vipFrontChairs: boolean;
  garlands: boolean;
  brideGroomRoom: boolean;
  guestRoomAttachedWashroom: boolean;
  dormitoryHall: boolean;
  separateGuestWashroom: boolean;
  cookingUtensils: boolean;
  waterFilter: boolean;
  catering: FacilityTier;
  decoration: FacilityTier;
  djService: FacilityTier;
  transport: FacilityTier;
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
  isSuspended: boolean;
  featured: boolean;
  galleryImages: string[];
  galleryVideos?: string[];
  contactEmail: string;
  contactPhone: string;
  // Real UPI payment details the vendor supplies so a customer can pay the
  // advance directly, plus a scanner (QR code) image for the same purpose.
  upiId?: string;
  qrCodeImage?: string;
  packages: VendorPackage[];
  availableDates: string[]; // ISO date strings the vendor opened for booking
  // Which time-of-day slots the vendor offers per date (map date -> slot ids).
  // A date missing here (or empty) means all slots are offered — back-compat.
  availableSlots?: Record<string, string[]>;
  // Dates that have been booked — moved here from availableDates when a
  // customer confirms a booking, so the customer listing can show them as
  // "Booked" (visible but not selectable) rather than silently disappearing.
  // A date lands here only when the WHOLE day is taken (all slots booked, or a
  // full-day booking with no slot).
  bookedDates?: string[];
  // Time-of-day slots already booked, per date. Lets a single date be partly
  // booked — e.g. Morning taken while Afternoon/Evening stay open.
  bookedSlots?: BookedSlot[];
  policies: {
    cancellation: string;
    refund: string;
    advancePercentage: number;
    // Flat rupee advance that overrides the percentage-based calculation
    // when set — lets a vendor quote a fixed advance instead of a %.
    advanceAmount?: number;
  };
  facilities?: VendorFacilities;
  offeredOptions?: string[];
  // Price the vendor set for each of their own offeredOptions (keyed by the
  // exact option label) — lets customers see what a specific service costs
  // at this vendor, not just that they offer it.
  offeredOptionPrices?: Record<string, number>;
  // Line-items the vendor lists under each offered option (keyed by the exact
  // option label). E.g. under "Veg" a caterer lists individual dishes with a
  // rate each; under "Candid" a photographer lists specific shoot add-ons.
  // Applies to every category — whatever the option, the vendor can break it
  // down into named priced items customers see before booking.
  offeredOptionItems?: Record<string, OfferedOptionItem[]>;
  // Option-level quality tier (keyed by option label), for options that have
  // no per-item breakdown — e.g. a Media vendor's "Live Streaming" or "LED
  // Screens" is offered at a single quality (4K, Full HD, …) rather than as a
  // list of priced items.
  offeredOptionQuality?: Record<string, string>;
  // Photos the vendor uploaded for each offered option (keyed by option label),
  // shown to customers alongside that option/service.
  offeredOptionImages?: Record<string, string[]>;
  // Return Gifts vendors only: how many gift pieces they supply and any
  // quantity-based discount, shown to customers on the listing.
  giftCount?: number;
  giftDiscount?: string;
  // Verification request the vendor submits to earn the Verified badge. `status`
  // drives the admin review queue; `isVerified` above stays in sync (true only
  // when status === 'verified') for backward compatibility.
  verification?: VendorVerification;
  // Promotional deals/offers the vendor publishes on their own listing.
  deals?: VendorDeal[];
  createdAt: string;
}

// A discount/offer a vendor publishes on their listing. Percentage or flat rupee
// off, optionally gated by a minimum order value and a validity window.
export interface VendorDeal {
  id: string;
  title: string;
  description?: string;
  discountType: 'percent' | 'flat';
  discountValue: number; // percent (1–100) or flat rupees off
  minOrderAmount?: number; // only applies when the subtotal reaches this
  startsAt?: string; // ISO date; empty = live immediately
  expiresAt?: string; // ISO date; empty = no expiry
  isActive: boolean;
  createdAt: string;
}

// Whether a deal is currently live: active, started, and not expired.
export function isDealLive(deal: VendorDeal, now: Date = new Date()): boolean {
  if (!deal.isActive) return false;
  if (deal.startsAt && new Date(deal.startsAt) > now) return false;
  if (deal.expiresAt) {
    // Treat expiry as end-of-day so a deal valid "until the 5th" works all day.
    const end = new Date(deal.expiresAt);
    end.setHours(23, 59, 59, 999);
    if (end < now) return false;
  }
  return true;
}

// The vendor's deals that are live right now.
export function getLiveDeals(vendor: Pick<Vendor, 'deals'>): VendorDeal[] {
  return (vendor.deals || []).filter((d) => isDealLive(d));
}

// Rupees a single deal takes off a given subtotal (0 if the subtotal doesn't
// meet the deal's minimum). Percentage discounts are capped at the subtotal.
export function dealDiscountAmount(deal: VendorDeal, subtotal: number): number {
  if (subtotal <= 0) return 0;
  if (deal.minOrderAmount && subtotal < deal.minOrderAmount) return 0;
  const raw = deal.discountType === 'percent'
    ? (subtotal * Math.min(deal.discountValue, 100)) / 100
    : deal.discountValue;
  return Math.max(0, Math.min(Math.round(raw), subtotal));
}

// The live deal that saves the customer the most on this subtotal, with its
// rupee discount — or null when nothing applies.
export function bestDealForAmount(vendor: Pick<Vendor, 'deals'>, subtotal: number): { deal: VendorDeal; discount: number } | null {
  let best: { deal: VendorDeal; discount: number } | null = null;
  for (const deal of getLiveDeals(vendor)) {
    const discount = dealDiscountAmount(deal, subtotal);
    if (discount > 0 && (!best || discount > best.discount)) best = { deal, discount };
  }
  return best;
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface VendorVerification {
  status: VerificationStatus;
  // Legal / KYC details the vendor supplies to prove the business is real.
  legalName?: string;
  registrationNumber?: string;
  gstNumber?: string;
  contactPerson?: string;
  // URLs of proof documents (business registration, GST certificate, ID) the
  // vendor uploaded via the existing vendor upload endpoint.
  documents?: string[];
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

// A trust signal shown to shoppers. `tone` maps to a colour treatment in the UI.
export interface VendorTrustBadge {
  key: string;
  label: string;
  tone: 'verified' | 'rating' | 'experience' | 'popular' | 'tenure';
}

// Derive the trust badges a vendor has earned from its public stats. Pure and
// deterministic so the customer web, compare modal, and vendor dashboard all
// show the same set without duplicating the rules.
export function getVendorTrustBadges(vendor: Pick<Vendor, 'isVerified' | 'ratingAverage' | 'reviewCount' | 'yearsOfExperience' | 'createdAt'>): VendorTrustBadge[] {
  const badges: VendorTrustBadge[] = [];
  if (vendor.isVerified) {
    badges.push({ key: 'verified', label: 'Verified Business', tone: 'verified' });
  }
  if (vendor.ratingAverage >= 4.5 && vendor.reviewCount >= 5) {
    badges.push({ key: 'top-rated', label: 'Top Rated', tone: 'rating' });
  }
  if (vendor.reviewCount >= 20) {
    badges.push({ key: 'popular', label: 'Highly Booked', tone: 'popular' });
  }
  if (vendor.yearsOfExperience >= 5) {
    badges.push({ key: 'experienced', label: `${vendor.yearsOfExperience}+ Yrs Experience`, tone: 'experience' });
  }
  const joinedYear = vendor.createdAt ? new Date(vendor.createdAt).getFullYear() : NaN;
  if (!Number.isNaN(joinedYear)) {
    badges.push({ key: 'since', label: `On Magizhnaazh since ${joinedYear}`, tone: 'tenure' });
  }
  return badges;
}

// One booked time-of-day slot on a specific date.
export interface BookedSlot {
  date: string; // ISO date (YYYY-MM-DD)
  slot: string; // AvailabilitySlot id: 'morning' | 'afternoon' | 'evening'
}

// The time-of-day slots a date can be booked in. Booking one leaves the others
// The time-of-day slots a date can be booked in. Booking one leaves the others
// on that day open. Single source of truth for the customer picker, the vendor
// availability view, and the booking service's blocking logic.
export const AVAILABILITY_SLOTS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'fullday', label: 'Full Day' },
] as const;

export type AvailabilitySlotId = (typeof AVAILABILITY_SLOTS)[number]['id'];

// Whether a given (date, slot) is unavailable — either the whole day is booked
// (legacy full-day block) or that specific slot is taken.
export function isSlotBooked(
  vendor: Pick<Vendor, 'bookedDates' | 'bookedSlots'>,
  date: string,
  slot: string,
): boolean {
  if ((vendor.bookedDates || []).includes(date)) return true;
  const booked = (vendor.bookedSlots || []).filter((b) => b.date === date).map((b) => b.slot);
  if (booked.includes('fullday')) return true;
  if (slot === 'fullday' && booked.length > 0) return true;
  return booked.includes(slot);
}

// The slot ids the vendor OFFERS on a date (defaults to all slots when the
// vendor hasn't restricted the date to specific slots).
export function offeredSlotIds(vendor: Pick<Vendor, 'availableSlots'>, date: string): string[] {
  const chosen = vendor.availableSlots?.[date];
  return chosen && chosen.length ? chosen : AVAILABILITY_SLOTS.map((s) => s.id);
}

// The slots still open on a date: offered by the vendor AND not already booked.
export function openSlots(vendor: Pick<Vendor, 'bookedDates' | 'bookedSlots' | 'availableSlots'>, date: string) {
  const offered = offeredSlotIds(vendor, date);
  return AVAILABILITY_SLOTS.filter((s) => offered.includes(s.id) && !isSlotBooked(vendor, date, s.id));
}

// Human label for a slot id (e.g. 'morning' -> 'Morning'); '' if none/unknown.
export function slotLabel(id?: string): string {
  return AVAILABILITY_SLOTS.find((s) => s.id === id)?.label || '';
}

// Label for a slot id (e.g. 'Morning', 'Full Day'); '' if unknown.
export function slotLabelWithTime(id?: string): string {
  const s = AVAILABILITY_SLOTS.find((x) => x.id === id);
  return s ? s.label : '';
}

// A single priced item a vendor lists under one of their offered options —
// a dish, a package add-on, a specific service line. `note` is optional free
// text (portion size, description, terms) the vendor can write for each item.
export interface OfferedOptionItem {
  name: string;
  price: number;
  note?: string;
  // Media-only (Photography/Videography) extras. Depending on the option, a
  // Media item carries either an equipments note (photo shoots) or a delivery
  // quality tier (video/other), plus an optional extra charge for outstation /
  // other-area coverage. All left undefined for every other category.
  equipments?: string;
  quality?: string;
  areaCharge?: number;
  photo?: string;
}

// Quality tiers a Media vendor can tag an item with (dropdown in the vendor
// portal, badge on the customer listing).
export const MEDIA_QUALITY_OPTIONS = ['4K Ultra HD', '2K', 'Full HD (1080p)', 'HD (720p)'];

// Equipment presets a Media vendor can tag a shoot item with (dropdown in the
// vendor portal, badge on the customer listing).
export const MEDIA_EQUIPMENT_OPTIONS = [
  'DSLR Camera',
  'Mirrorless Camera',
  'Cinema Camera',
  'Drone',
  'Gimbal / Stabilizer',
  'Tripod',
  'Lighting Kit',
  'External Mic',
  'Slider / Crane',
];

// Which extra field a given Media option collects: capture work (shoots,
// photography, videography, cinematic) lists the equipment used; delivery work
// (drone, live streaming, edits, highlight reel, LED screens) picks a quality
// tier instead.
export function mediaExtraField(optionLabel: string): 'equipments' | 'quality' {
  return /shoot|photography|videography|cinematic/i.test(optionLabel) ? 'equipments' : 'quality';
}

export type VendorCategory =
  | 'Catering'
  | 'Venue'
  | 'Decoration'
  | 'Makeup & Beauty'
  | 'Media'
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
  | 'Utensils for Rent'
  | 'Wedding Planner'
  | 'Corporate Event Services'
  | 'Other';

// Category-specific service options a vendor can offer, and that customers can
// browse/select on the marketplace. Every entry in VENDOR_CATEGORIES (except
// 'Venue', which uses VendorFacilities' amenities/event-service tiers instead)
// should have a list here so no vendor or customer sees a blank panel. Shared
// between vendor-web (Facilities & Options tab) and customer-web (marketplace
// category chips) so both stay in sync.
export const CATEGORY_OPTIONS: Record<string, string[]> = {
  Catering: ['Veg', 'Non-Veg', 'Starters (Veg)', 'Starters (Non-Veg)', 'Cool Drinks', 'Desserts', 'Mocktails', 'Snacks'],
  Decoration: ['South Indian Traditional', 'Royal Mandap', 'Reception Stage', 'Haldi & Mehndi', 'Christian Wedding', 'Birthday & Baby Shower', 'Garlands & Floral Strings'],
  'Makeup & Beauty': ['Bridal Makeup', 'Reception & Engagement', 'Party & Guest', 'Haldi & Mehndi', 'Hair & Saree Draping', 'Ornaments & Jewellery', 'Pre-Bridal Skin & Hair'],
  // Photography + Videography merged into one "Media" category.
  Media: ['Candid Photography', 'Traditional Photography', 'Pre-Wedding Shoot', 'Post-Wedding Shoot', 'Cinematic Films', 'Candid Videography', 'Traditional Videography', 'Drone Coverage', 'Live Streaming', 'Same-Day Edit', 'Highlight Reel', 'Full-Length Edit', 'LED Screens'],
  Transport: ['Airport Pickup', 'Railway Station Pickup', 'Bride & Groom Vehicle', 'Guest Vehicle', 'Bus Stop Pickup'],
  'Pujari/Priest': ['Wedding (Vivaham)', 'Engagement (Nichayam)', 'Griha Pravesh', 'Naming & Cradle', 'Seemantham (Baby Shower)', 'Satyanarayan & Homam', 'Upanayanam'],
  Invitation: ['Digital E-Invites', 'Printed Cards', 'Video Invitations', 'WhatsApp Invites', 'Custom Illustrations', 'Multi-language Invites'],
  Printing: ['Wedding Cards', 'Banners & Flex', 'Photo Albums', 'Standees', 'Stickers & Tags', 'Menu Cards', 'Discount for Bulk'],
  'Return Gifts': ['Traditional (Silver & Brass)', 'Sweets & Dry Fruits', 'Eco-Friendly Plants', 'Personalized Gifts', 'Hampers & Favors', 'Kids Gifts'],
  Entertainment: ['Live Band', 'Dance Troupe', 'Magic Show', 'Stand-up Comedy', 'Fireworks & Pyrotechnics', 'Games & Activities'],
  'Music/DJ': ['DJ Package', 'Live Band', 'Anchor / MC', 'Sound & Lighting Setup', 'Nadaswaram & Thavil', 'Dhol & Band Baaja', 'Carnatic / Classical', 'Bhajan / Devotional'],
  Lighting: ['Stage Lighting', 'Fairy Lights', 'Laser Show', 'LED Wall', 'Chandeliers', 'Outdoor Lighting'],
  Flowers: ['Fresh Flower Decor', 'Garlands', 'Bouquets', 'Floral Backdrop', 'Car Decoration', 'Flower Rangoli'],
  Mehendi: ['Bridal Mehendi', 'Guest Mehendi', 'Arabic Design', 'Rajasthani Design', 'Contemporary Design', 'Mehendi Party Setup'],
  'Event Host/Anchor': ['Wedding Anchor', 'Corporate Emcee', 'Bilingual Hosting', 'Game Coordination', 'Stage Management'],
  Security: ['Event Security Guards', 'Bouncers', 'Parking Management', 'Crowd Control', 'VIP Escort'],
  Cleaning: ['Pre-Event Cleaning', 'Post-Event Cleanup', 'Waste Disposal', 'Deep Cleaning', 'Sanitization Services'],
  'Rental Equipment': ['Chairs & Tables', 'Tents & Canopies', 'Sound Systems', 'Generators', 'AC Units', 'Crockery & Cutlery'],
  'Utensils for Rent': ['Cooking Vessels (Anda)', 'Serving Utensils', 'Steel Plates & Tumblers', 'Buffet Counters', 'Gas Stoves & Burners', 'Water Dispensers', 'Steel Dining Sets', 'Traditional Brass & Copper'],
  'Wedding Planner': ['Full Wedding Planning', 'Day-of Coordination', 'Destination Wedding', 'Budget Planning', 'Vendor Management', 'Guest Management'],
  'Corporate Event Services': ['Conference Setup', 'Product Launch', 'Team Building', 'Award Ceremony', 'AV & Tech Support', 'Corporate Catering Coordination'],
  Other: [],
};

// Colour-coded dot + badge styling for Catering's options specifically (the
// only category with a fixed, universally-recognised colour convention —
// green for veg, red for non-veg, etc.). Keyed by the exact label strings in
// CATEGORY_OPTIONS.Catering above; every other category renders its options
// as plain chips with no colour coding.
export const CATERING_OPTION_STYLE: Record<string, { dot: string; badge: string }> = {
  Veg: { dot: 'bg-emerald-400', badge: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' },
  'Non-Veg': { dot: 'bg-rose-500', badge: 'bg-rose-950/80 text-rose-300 border border-rose-500/40' },
  'Starters (Veg)': { dot: 'bg-amber-400', badge: 'bg-amber-950/80 text-amber-300 border border-amber-500/40' },
  'Starters (Non-Veg)': { dot: 'bg-orange-500', badge: 'bg-orange-950/80 text-orange-300 border border-orange-500/40' },
  'Cool Drinks': { dot: 'bg-cyan-400', badge: 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40' },
  Desserts: { dot: 'bg-pink-400', badge: 'bg-pink-950/80 text-pink-300 border border-pink-500/40' },
  Mocktails: { dot: 'bg-fuchsia-400', badge: 'bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-500/40' },
  Snacks: { dot: 'bg-lime-400', badge: 'bg-lime-950/80 text-lime-300 border border-lime-500/40' },
};

export const VENDOR_CATEGORIES: VendorCategory[] = [
  'Catering',
  'Venue',
  'Decoration',
  'Makeup & Beauty',
  'Media',
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
  'Utensils for Rent',
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
  | 'quote_sent'
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
  // Customer's display name, captured for invoices (bookings predate this field,
  // so it may be absent on older records).
  customerName?: string;
  packageId?: string;
  packageName?: string;
  agreedPrice: number;
  advanceAmountPaid: number;
  remainingAmount: number;
  status: BookingStatus;
  eventDate: string;
  // Time-of-day slot booked on that date (AvailabilitySlot id), when the vendor
  // uses slot-based availability. Empty for legacy full-day bookings.
  timeSlot?: string;
  specialInstructions?: string;
  quotesHistory?: {
    sender: 'customer' | 'vendor';
    amount: number;
    notes?: string;
    timestamp: string;
  }[];
  // Service-type options the customer picked on the vendor detail page before
  // booking (e.g. a photographer's "Candid" + "Drone", a decorator's "Royal
  // Mandap") — plain labels, works the same way for every vendor category.
  selectedOptions?: string[];
  // Reference images the customer uploaded for this booking (e.g. a decoration
  // style they want) — shown to the vendor so they know exactly what's expected.
  referenceImages?: string[];
  // Vendor-entered itemisation of what the agreed money was spent on — e.g. a
  // decorator's "Mandap flowers ₹40,000", "Stage lighting ₹20,000". Purely a
  // breakdown of the total; the customer sees it under this vendor in the Smart
  // Budget "Where Your Money Went" drill-down. Works for every vendor category.
  spendItems?: { label: string; amount: number }[];
  // Ledger of payments made against this booking (advance + balance). Each entry
  // is a customer claim the vendor confirms, mirroring the manual-UPI flow.
  payments?: BookingPayment[];
  // True once confirmed payments cover the full agreed price.
  paidInFull?: boolean;
  // Sequential GST invoice number, assigned the first time an invoice is issued.
  invoiceNumber?: string;
  invoiceIssuedAt?: string;
  // Vendor payout settlement (platform pays the vendor their share minus commission).
  settlementStatus?: 'pending' | 'settled';
  settledAt?: string;
  createdAt: string;
}

// One payment against a booking. Customers record a claim (status 'claimed');
// the vendor confirms it (status 'confirmed'), which updates the paid/remaining
// amounts. Method is 'upi' | 'cash' | 'card' | 'bank' etc.
export interface BookingPayment {
  id: string;
  type: 'advance' | 'balance';
  amount: number;
  method: string;
  reference?: string;
  status: 'claimed' | 'confirmed';
  claimedAt: string;
  confirmedAt?: string;
}

// Structured GST invoice for a booking, computed server-side and rendered as a
// printable document in the web apps. Prices are treated as GST-inclusive.
export interface BookingInvoice {
  invoiceNumber: string;
  issuedAt: string;
  eventDate: string;
  seller: { name: string; gstin?: string; address?: string; email?: string; phone?: string };
  buyer: { name: string; email?: string };
  lineItems: { label: string; amount: number }[];
  gstRate: number; // fraction, e.g. 0.18
  taxableValue: number;
  cgst: number;
  sgst: number;
  totalGst: number;
  grandTotal: number;
  advancePaid: number;
  balanceDue: number;
  paidInFull: boolean;
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
  // Vendor's public response to this review — vendors can reply once, and edit it.
  vendorReply?: string;
  vendorReplyAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  code?: string;
  data: T;
}

// --- Admin console entities ---

export interface Category {
  id: string;
  name: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
}

export interface City {
  id: string;
  name: string;
  state: string;
  isActive: boolean;
  createdAt: string;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export type ComplaintStatus = 'open' | 'in_review' | 'resolved';

export interface Complaint {
  id: string;
  eventId?: string;
  bookingId?: string;
  submittedBy: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
}

export interface InvitationTemplateDoc {
  id: string;
  name: string;
  category: string;
  previewUrl: string;
  backgroundColor: string;
  elements: CanvasElement[];
  isActive: boolean;
  createdAt: string;
}

export type ThemePreference = 'light' | 'dark';

export interface PlatformSettings {
  commissionRate: number; // e.g. 0.1 = 10%
  advanceDepositRate: number; // e.g. 0.3 = 30%
  gstRate?: number; // e.g. 0.18 = 18%, used for GST invoices
  // Site-wide theme chosen in the admin console. Applied across the admin and
  // customer apps so the light/dark choice stays in sync everywhere.
  theme?: ThemePreference;
  updatedAt: string;
}