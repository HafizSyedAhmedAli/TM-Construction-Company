// packages/lead-intake/src/options.ts

// SRS §2.1: HQ in Karachi, regional office in Nawabshah; Hyderabad used as
// the worked example on the intake form. Extend as TM CC opens new service
// areas — this list is intentionally separate from RateCard.city (NFR-4),
// since a city can be servable for intake before a rate card exists for it.
export const CITIES = ["Karachi", "Hyderabad", "Nawabshah"] as const;
export type City = (typeof CITIES)[number];

export const HOUSE_TYPES = ["House", "Villa", "Farmhouse"] as const;
export type HouseType = (typeof HOUSE_TYPES)[number];

export const FLOOR_OPTIONS = [1, 2, 3, 4] as const;
export const BEDROOM_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

// Assumption, not confirmed with TM CC: these bands and timelines are
// placeholders. Confirm the real ranges with the sales team.
export const BUDGET_RANGES = [
  "Under Rs 50 lakh",
  "Rs 50 lakh – 1 crore",
  "Rs 1 – 2 crore",
  "Rs 2 – 5 crore",
  "Above Rs 5 crore",
] as const;
export type BudgetRange = (typeof BUDGET_RANGES)[number];

export const TIMELINES = [
  "As soon as possible",
  "Within 3 months",
  "3 – 6 months",
  "6 – 12 months",
  "Just exploring",
] as const;
export type Timeline = (typeof TIMELINES)[number];

export const MAX_NOTES_LENGTH = 500;