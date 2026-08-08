import { VendorCategory, Vendor } from '../shared-types';

export * from './auth';
export * from './logging';
export * from './db';

export const DEFAULT_BUDGET_PERCENTAGES: Record<string, Record<string, number>> = {
  Wedding: {
    'Venue': 25,
    'Catering': 25,
    'Decoration': 12,
    'Photography': 10,
    'Makeup & Beauty': 5,
    'Transport': 5,
    'Invitation': 3,
    'Return Gifts': 5,
    'Music/DJ': 4,
    'Pujari/Priest': 3,
    'Other': 3,
  },
  Birthday: {
    'Venue': 30,
    'Catering': 30,
    'Decoration': 15,
    'Entertainment': 10,
    'Photography': 8,
    'Invitation': 4,
    'Other': 3,
  },
  'Corporate Event': {
    'Venue': 35,
    'Catering': 30,
    'Corporate Event Services': 15,
    'Videography': 10,
    'Printing': 5,
    'Other': 5,
  },
  Default: {
    'Venue': 30,
    'Catering': 30,
    'Decoration': 15,
    'Photography': 10,
    'Invitation': 5,
    'Other': 10,
  },
};

/**
 * Calculates budget breakdown amounts based on event type and total budget.
 */
export function calculateBudgetBreakdown(eventType: string, totalBudget: number) {
  const percentages = DEFAULT_BUDGET_PERCENTAGES[eventType] || DEFAULT_BUDGET_PERCENTAGES.Default;
  return Object.entries(percentages).map(([category, percentage], idx) => {
    const allocatedAmount = Math.round((totalBudget * percentage) / 100);
    return {
      id: `bgt-${idx}-${Date.now()}`,
      category: category as VendorCategory,
      allocatedPercentage: percentage,
      allocatedAmount,
      actualSpent: 0,
    };
  });
}

/**
 * Haversine formula to calculate distance between two Geo points in kilometers.
 */
export function calculateGeoDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Smart recommendation engine score (0 - 100)
 */
export function calculateVendorScore(
  vendor: Vendor,
  allocatedBudgetForCategory: number,
  userCity: string
): number {
  let score = 50;

  // Rating score (up to 25 points)
  score += (vendor.ratingAverage / 5) * 25;

  // Location match (up to 15 points)
  if (vendor.location.city.toLowerCase() === userCity.toLowerCase()) {
    score += 15;
  }

  // Budget match score (up to 20 points)
  if (allocatedBudgetForCategory > 0) {
    if (vendor.startingPrice <= allocatedBudgetForCategory) {
      score += 20;
    } else if (vendor.startingPrice <= allocatedBudgetForCategory * 1.2) {
      score += 10;
    }
  }

  // Experience bonus
  if (vendor.yearsOfExperience >= 5) score += 5;
  if (vendor.isVerified) score += 5;

  return Math.min(100, Math.round(score));
}
