import { VendorCategory, Vendor } from './shared-types';

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
  Default: {
    'Venue': 30,
    'Catering': 30,
    'Decoration': 15,
    'Photography': 10,
    'Invitation': 5,
    'Other': 10,
  },
};

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

export function calculateVendorScore(
  vendor: Vendor,
  allocatedBudgetForCategory: number,
  userCity: string
): number {
  let score = 50;

  score += (vendor.ratingAverage / 5) * 25;

  if (vendor.location.city.toLowerCase() === userCity.toLowerCase()) {
    score += 15;
  }

  if (allocatedBudgetForCategory > 0) {
    if (vendor.startingPrice <= allocatedBudgetForCategory) {
      score += 20;
    } else if (vendor.startingPrice <= allocatedBudgetForCategory * 1.2) {
      score += 10;
    }
  }

  if (vendor.yearsOfExperience >= 5) score += 5;
  if (vendor.isVerified) score += 5;

  return Math.min(100, Math.round(score));
}
