// Type-ahead suggestions for the per-option line-item "Item name" field in the
// vendor listing editor. Keyed by vendor category, then by the EXACT option
// label from CATEGORY_OPTIONS (packages/shared-types). When a vendor types an
// item name, the browser shows these as a native autocomplete datalist filtered
// to what's typed — e.g. Catering "Veg" suggests paneer/aloo dishes, "Non-Veg"
// suggests chicken/mutton, Decoration "Royal Mandap" suggests mandap items, etc.
// These are only hints — the vendor can still type anything.
export const ITEM_SUGGESTIONS: Record<string, Record<string, string[]>> = {
  Catering: {
    Veg: ['Paneer Butter Masala', 'Palak Paneer', 'Kadai Paneer', 'Aloo Gobi', 'Chana Masala', 'Dal Tadka', 'Dal Makhani', 'Veg Biryani', 'Jeera Rice', 'Mixed Veg Curry', 'Bhindi Fry', 'Malai Kofta', 'Mushroom Masala', 'Veg Kurma', 'Sambar', 'Rasam', 'Curd Rice', 'Poori Masala', 'Chapati', 'Naan'],
    'Non-Veg': ['Chicken Biryani', 'Mutton Biryani', 'Butter Chicken', 'Chicken Curry', 'Chicken Chettinad', 'Mutton Curry', 'Mutton Rogan Josh', 'Fish Curry', 'Fish Fry', 'Prawn Masala', 'Egg Curry', 'Egg Biryani', 'Chicken Tikka Masala', 'Pepper Chicken', 'Nattu Kozhi Kuzhambu', 'Chicken Kurma'],
    'Starters (Veg)': ['Paneer Tikka', 'Gobi Manchurian', 'Veg Spring Roll', 'Hara Bhara Kabab', 'Crispy Corn', 'Baby Corn Manchurian', 'Veg Cutlet', 'Aloo Tikki', 'Mushroom 65', 'Onion Pakora', 'Veg Seekh Kabab'],
    'Starters (Non-Veg)': ['Chicken Tikka', 'Chicken 65', 'Chicken Lollipop', 'Tandoori Chicken', 'Chicken Seekh Kabab', 'Fish Tikka', 'Prawn Fry', 'Mutton Seekh Kabab', 'Chicken Wings', 'Apollo Fish', 'Egg 65'],
    'Cool Drinks': ['Coca-Cola', 'Pepsi', 'Sprite', 'Fanta', 'Fresh Lime Soda', 'Buttermilk', 'Tender Coconut', 'Fruit Punch', 'Mango Juice', 'Mineral Water'],
    Desserts: ['Gulab Jamun', 'Rasmalai', 'Gajar Ka Halwa', 'Ice Cream', 'Jangiri', 'Mysore Pak', 'Kaju Katli', 'Payasam', 'Semiya Payasam', 'Fruit Custard', 'Jalebi', 'Kesari'],
    Mocktails: ['Virgin Mojito', 'Blue Lagoon', 'Fruit Punch', 'Watermelon Cooler', 'Pina Colada', 'Mango Mastani', 'Strawberry Mocktail', 'Cucumber Mint Cooler'],
    Snacks: ['Samosa', 'Onion Pakora', 'Masala Vada', 'Mini Idli', 'Pani Puri', 'Bhel Puri', 'Sundal', 'Bonda', 'Cutlet', 'Spring Roll', 'Veg Sandwich'],
  },
  Decoration: {
    'South Indian Traditional': ['Banana Leaf Backdrop', 'Kolam / Rangoli', 'Brass Lamp Setup', 'Mango Leaf Toran', 'Traditional Kalash Decor'],
    'Royal Mandap': ['Floral Mandap', 'Pillar Draping', 'Crystal Chandelier', 'Fabric Ceiling Drape', 'Grand Entrance Arch'],
    'Reception Stage': ['Floral Backdrop', 'LED Panel Backdrop', 'Sofa Setup', 'Stage Lighting', 'Walkway Decor'],
    'Haldi & Mehndi': ['Marigold Decor', 'Umbrella Props', 'Floral Swing (Oonjal)', 'Cushion Seating', 'Backdrop Frames'],
    'Christian Wedding': ['Church Aisle Decor', 'Floral Arch', 'Pew Flowers', 'Candle Stands', 'White Rose Backdrop'],
    'Birthday & Baby Shower': ['Balloon Arch', 'Theme Backdrop', 'Cake Table Decor', 'Photo Booth', 'Ceiling Balloons'],
    'Garlands & Floral Strings': ['Jasmine Garland', 'Rose Garland', 'Mango Leaf String', 'Marigold String', 'Orchid Garland'],
  },
  'Makeup & Beauty': {
    'Bridal Makeup': ['HD Bridal Makeup', 'Airbrush Makeup', 'Traditional Bridal Look', 'Engagement Look', 'Muhurtham Look'],
    'Reception & Engagement': ['Reception Makeup', 'Engagement Makeup', 'Cocktail Look', 'Glam Look'],
    'Party & Guest': ['Party Makeup', 'Guest Makeup', 'Sister-of-Bride Makeup', 'Family Makeup'],
    'Haldi & Mehndi': ['Haldi Look', 'Mehndi Look', 'Floral Hairstyle', 'Dewy Makeup'],
    'Hair & Saree Draping': ['Bridal Hairstyle', 'Saree Draping', 'Braid Styling', 'Bun with Flowers'],
    'Ornaments & Jewellery': ['Temple Jewellery Set', 'Kundan Set', 'Nose Ring (Nath)', 'Maang Tikka', 'Hair Accessories'],
    'Pre-Bridal Skin & Hair': ['Facial Package', 'Clean-up', 'Hair Spa', 'Body Polishing', 'Bridal Glow Package'],
  },
  Media: {
    'Candid Photography': ['Candid Wedding Coverage', 'Full-Day Candid', 'Reception Candids', 'Getting-Ready Shots'],
    'Traditional Photography': ['Muhurtham Coverage', 'Family Portraits', 'Ritual Coverage', 'Group Photos'],
    'Pre-Wedding Shoot': ['Outdoor Pre-Wedding', 'Studio Pre-Wedding', 'Themed Concept Shoot'],
    'Post-Wedding Shoot': ['Outdoor Post-Wedding', 'Couple Portraits', 'Themed Post-Wedding'],
    'Cinematic Films': ['Wedding Cinematic Film', 'Teaser Film', 'Full Wedding Film'],
    'Candid Videography': ['Candid Video Coverage', 'Multi-Cam Coverage', 'Reception Video'],
    'Traditional Videography': ['Ritual Video Coverage', 'Full Ceremony Video'],
    'Drone Coverage': ['Aerial Drone Shots', 'Venue Aerial View', 'Drone Cinematic Clip'],
    'Full-Length Edit': ['Full Ceremony Edit', 'Reception Edit', 'Complete Wedding Edit'],
  },
  Transport: {
    'Airport Pickup': ['Sedan (Airport)', 'SUV (Airport)', 'Tempo Traveller (Airport)', 'Luxury Car (Airport)'],
    'Railway Station Pickup': ['Sedan (Station)', 'SUV (Station)', 'Tempo Traveller (Station)'],
    'Bride & Groom Vehicle': ['Decorated Car', 'Vintage Car', 'Luxury Sedan', 'Convertible'],
    'Guest Vehicle': ['Tempo Traveller', 'Mini Bus (20-seater)', 'Bus (35-seater)', 'Innova / SUV'],
    'Bus Stop Pickup': ['Mini Bus', 'Van', 'Tempo Traveller'],
  },
  'Pujari/Priest': {
    'Wedding (Vivaham)': ['Full Wedding Rituals', 'Kashi Yatra', 'Mangalya Dharanam', 'Saptapadi'],
    'Engagement (Nichayam)': ['Nichayathartham', 'Ring Ceremony Rituals'],
    'Griha Pravesh': ['House Warming Pooja', 'Vastu Pooja', 'Ganapathi Homam'],
    'Naming & Cradle': ['Namakaranam', 'Cradle Ceremony', 'Annaprasanam'],
    'Seemantham (Baby Shower)': ['Seemantham Rituals', 'Valaikappu'],
    'Satyanarayan & Homam': ['Satyanarayan Pooja', 'Ganapathi Homam', 'Navagraha Homam', 'Sudarshana Homam'],
    Upanayanam: ['Thread Ceremony', 'Brahmopadesam'],
  },
  Invitation: {
    'Digital E-Invites': ['Static E-Invite', 'Animated E-Invite', 'Caricature E-Invite'],
    'Printed Cards': ['Traditional Card', 'Premium Box Card', 'Scroll Invitation', 'Laser-Cut Card'],
    'Video Invitations': ['2D Animated Video', '3D Animated Video', 'Save-the-Date Video'],
    'WhatsApp Invites': ['WhatsApp Card', 'WhatsApp Video Invite'],
    'Custom Illustrations': ['Couple Caricature', 'Family Illustration', 'Venue Illustration'],
    'Multi-language Invites': ['Tamil Invite', 'Hindi Invite', 'Telugu Invite', 'Bilingual Invite'],
  },
  Printing: {
    'Wedding Cards': ['Traditional Cards', 'Premium Cards', 'Box Cards'],
    'Banners & Flex': ['Welcome Banner', 'Stage Flex', 'Entrance Banner'],
    'Photo Albums': ['Hardbound Album', 'Layflat Album', 'Mini Album'],
    Standees: ['Welcome Standee', 'Photo Standee'],
    'Stickers & Tags': ['Return Gift Tags', 'Bottle Stickers', 'Name Tags'],
    'Menu Cards': ['Table Menu Card', 'Buffet Menu Board'],
  },
  'Return Gifts': {
    'Traditional (Silver & Brass)': ['Silver Coin', 'Brass Diya', 'Kumkum Box', 'Brass Kalash'],
    'Sweets & Dry Fruits': ['Sweet Box', 'Dry Fruit Box', 'Assorted Mithai'],
    'Eco-Friendly Plants': ['Succulent Pot', 'Seed Ball', 'Mini Plant Sapling'],
    'Personalized Gifts': ['Name Keychain', 'Photo Frame', 'Customized Mug'],
    'Hampers & Favors': ['Gift Hamper', 'Favor Box', 'Mini Basket'],
    'Kids Gifts': ['Toy Set', 'Colouring Kit', 'Chocolate Box'],
  },
  Entertainment: {
    'Live Band': ['Cover Band', 'Classical Band', 'Rock Band'],
    'Dance Troupe': ['Folk Dance', 'Bollywood Dance', 'Classical Dance', 'Fusion Dance'],
    'Magic Show': ['Stage Magic', 'Close-Up Magic'],
    'Stand-up Comedy': ['Solo Comedian', 'Comedy Act'],
    'Fireworks & Pyrotechnics': ['Sparklers Show', 'Cold Pyro', 'Fireworks Display'],
    'Games & Activities': ['Photo Booth Games', 'Kids Activities', 'Couple Games'],
  },
  'Music/DJ': {
    'DJ Package': ['DJ with Console', 'DJ + Dance Floor', 'DJ + Smoke Effects'],
    'Live Band': ['Cover Band', 'Classical Band'],
    'Anchor / MC': ['Wedding Anchor', 'Reception MC'],
    'Sound & Lighting Setup': ['Line Array Speakers', 'Stage Lighting', 'Wireless Mics'],
    'Nadaswaram & Thavil': ['Nadaswaram Duo', 'Nadaswaram + Thavil Set'],
    'Dhol & Band Baaja': ['Dhol Players', 'Baraat Band'],
    'Carnatic / Classical': ['Vocal Concert', 'Instrumental Ensemble'],
    'Bhajan / Devotional': ['Bhajan Group', 'Devotional Singers'],
  },
  Lighting: {
    'Stage Lighting': ['Par Lights', 'Moving Head Lights', 'Spotlights'],
    'Fairy Lights': ['Warm Fairy Lights', 'Curtain Lights', 'Canopy Lights'],
    'Laser Show': ['Laser Beam Show', 'Sky Laser'],
    'LED Wall': ['Indoor LED Wall', 'Outdoor LED Wall'],
    Chandeliers: ['Crystal Chandelier', 'Ceiling Chandelier'],
    'Outdoor Lighting': ['Garden Lights', 'Pathway Lights', 'Facade Lighting'],
  },
  Flowers: {
    'Fresh Flower Decor': ['Rose Decor', 'Orchid Decor', 'Mixed Flower Setup'],
    Garlands: ['Jasmine Garland', 'Rose Garland', 'Marigold Garland'],
    Bouquets: ['Bridal Bouquet', 'Rose Bouquet', 'Mixed Bouquet'],
    'Floral Backdrop': ['Rose Wall', 'Marigold Backdrop', 'Orchid Backdrop'],
    'Car Decoration': ['Rose Car Decor', 'Orchid Car Decor'],
    'Flower Rangoli': ['Marigold Rangoli', 'Rose Petal Rangoli'],
  },
  Mehendi: {
    'Bridal Mehendi': ['Full Hands & Feet', 'Bridal Intricate Design', 'Portrait Mehendi'],
    'Guest Mehendi': ['Simple Guest Design', 'Arabic Guest Design'],
    'Arabic Design': ['Arabic Floral', 'Arabic Trail'],
    'Rajasthani Design': ['Rajasthani Full Hand', 'Traditional Motifs'],
    'Contemporary Design': ['Minimal Mehendi', 'Mandala Design'],
    'Mehendi Party Setup': ['Mehendi Stall', 'Decorated Mehendi Corner'],
  },
  Security: {
    'Event Security Guards': ['Uniformed Guard', 'Armed Guard', 'Female Guard'],
    Bouncers: ['Standard Bouncer', 'VIP Bouncer'],
    'Parking Management': ['Valet Service', 'Parking Attendant'],
    'Crowd Control': ['Queue Management', 'Barricade Setup'],
    'VIP Escort': ['Personal Escort', 'VIP Protection'],
  },
  Cleaning: {
    'Pre-Event Cleaning': ['Venue Cleaning', 'Floor Mopping', 'Restroom Cleaning'],
    'Post-Event Cleanup': ['Full Venue Cleanup', 'Waste Clearing'],
    'Waste Disposal': ['Garbage Removal', 'Segregated Disposal'],
    'Deep Cleaning': ['Deep Floor Clean', 'Kitchen Deep Clean'],
    'Sanitization Services': ['Fogging Sanitization', 'Surface Disinfection'],
  },
  'Rental Equipment': {
    'Chairs & Tables': ['Banquet Chair', 'Round Table', 'Cocktail Table', 'Chiavari Chair'],
    'Tents & Canopies': ['Pagoda Tent', 'Canopy Tent', 'German Hangar'],
    'Sound Systems': ['PA System', 'Line Array', 'Wireless Mic Set'],
    Generators: ['15 KVA Generator', '30 KVA Generator', '62 KVA Generator'],
    'AC Units': ['Tower AC', 'Cassette AC', 'Duct Cooling'],
    'Crockery & Cutlery': ['Dinner Plate Set', 'Cutlery Set', 'Serving Bowls'],
  },
  'Utensils for Rent': {
    'Cooking Vessels (Anda)': ['Large Anda (Biryani)', 'Medium Anda', 'Small Anda'],
    'Serving Utensils': ['Serving Spoons', 'Serving Bowls', 'Ladles'],
    'Steel Plates & Tumblers': ['Steel Plate', 'Steel Tumbler', 'Steel Dabara'],
    'Buffet Counters': ['Chafing Dish', 'Buffet Counter', 'Soup Station'],
    'Gas Stoves & Burners': ['Single Burner', 'Double Burner', 'High-Pressure Burner'],
    'Water Dispensers': ['Water Dispenser', 'Water Can Stand'],
  },
  'Wedding Planner': {
    'Full Wedding Planning': ['End-to-End Planning', 'Vendor Coordination', 'Theme Design'],
    'Day-of Coordination': ['On-Site Coordinator', 'Timeline Management'],
    'Destination Wedding': ['Venue Scouting', 'Guest Logistics', 'Travel Coordination'],
    'Budget Planning': ['Budget Breakdown', 'Cost Optimization'],
    'Vendor Management': ['Vendor Sourcing', 'Contract Handling'],
    'Guest Management': ['RSVP Management', 'Guest Hospitality'],
  },
  'Corporate Event Services': {
    'Conference Setup': ['Stage & AV Setup', 'Seating Arrangement', 'Registration Desk'],
    'Product Launch': ['Launch Stage', 'Branding Setup', 'Press Setup'],
    'Team Building': ['Indoor Activities', 'Outdoor Activities'],
    'Award Ceremony': ['Stage Setup', 'Trophy & Certificates', 'Anchor'],
    'AV & Tech Support': ['Projector & Screen', 'Sound System', 'Live Streaming Setup'],
  },
};

// Return the suggestion list for a given vendor category + option label, or an
// empty array when there are no curated hints (the field still works as a plain
// free-text input in that case).
export function getItemSuggestions(category: string | undefined, option: string): string[] {
  if (!category) return [];
  return ITEM_SUGGESTIONS[category]?.[option] ?? [];
}

// A DOM-id-safe slug for a category+option pair, used to link an <input>'s
// `list` attribute to its <datalist>.
export function suggestionListId(category: string | undefined, option: string): string {
  return `sugg-${`${category ?? 'x'}-${option}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
}
