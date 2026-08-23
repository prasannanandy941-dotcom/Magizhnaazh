import { Vendor } from '../../../../packages/shared-types';

export function getVendorCoverImage(vendor: Vendor): string {
  const images = vendor.galleryImages || [];
  const defaultVenueImage = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800';
  
  const hasOnlyDefaultImage = images.length === 0 || 
    (images.length === 1 && (images[0] === defaultVenueImage || images[0].includes('photo-1519167758481-83f550bb49b3')));
    
  if (hasOnlyDefaultImage && vendor.category !== 'Venue') {
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
    return fallbacks[vendor.category] || defaultVenueImage;
  }
  
  return images[0] || defaultVenueImage;
}
