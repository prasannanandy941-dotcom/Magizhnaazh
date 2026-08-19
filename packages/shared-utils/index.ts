import { VendorCategory, Vendor } from '../shared-types';

// NOTE: this file must stay browser-safe (it's imported directly by the web
// apps' Vite bundles). Server-only helpers (JWT/auth, Mongo, request logging)
// live in ./auth, ./logging, ./db and must be imported from those files
// directly by services — never re-exported from here, or bundlers will try
// to pull mongoose/jsonwebtoken/express into the browser build.

// --- Password strength rules ---------------------------------------------
// Shared by the web signup forms (live checklist) and the auth service
// (server-side guard) so the two never disagree on what counts as strong.
export interface PasswordRule {
  key: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { key: 'upper', label: 'One uppercase letter (A–Z)', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'lower', label: 'One lowercase letter (a–z)', test: (pw) => /[a-z]/.test(pw) },
  { key: 'number', label: 'One number (0–9)', test: (pw) => /[0-9]/.test(pw) },
  { key: 'special', label: 'One special character (@ # ! $ …)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

// Per-rule pass/fail, for rendering a live requirements checklist.
export function checkPassword(pw: string): { key: string; label: string; met: boolean }[] {
  return PASSWORD_RULES.map((r) => ({ key: r.key, label: r.label, met: r.test(pw) }));
}

export function isPasswordStrong(pw: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pw));
}

// Human-readable message naming the first unmet rule (for a server error or a
// single-line client message). Returns null when the password is strong.
export function firstPasswordError(pw: string): string | null {
  const failing = PASSWORD_RULES.find((r) => !r.test(pw));
  return failing ? `Password needs: ${failing.label.toLowerCase()}.` : null;
}

export const DEFAULT_BUDGET_PERCENTAGES: Record<string, Record<string, number>> = {
  Wedding: {
    'Venue': 25,
    'Catering': 25,
    'Decoration': 12,
    'Media': 10,
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
    'Media': 8,
    'Invitation': 4,
    'Other': 3,
  },
  'Corporate Event': {
    'Venue': 35,
    'Catering': 30,
    'Corporate Event Services': 15,
    'Media': 10,
    'Printing': 5,
    'Other': 5,
  },
  Default: {
    'Venue': 30,
    'Catering': 30,
    'Decoration': 15,
    'Media': 10,
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

export * from './indiaLocations';

