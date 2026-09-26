// packages/lead-intake/src/validate-lead.ts
import type { Category, EngagementModel } from "@tmcc/shared-types";

// SRS §2.1: HQ in Karachi, regional office in Nawabshah; Hyderabad used as
// the worked example on the intake form. Extend as TM CC opens new service
// areas — this list is intentionally separate from RateCard.city (NFR-4),
// since a city can be servable for intake before a rate card exists for it.
export const CITIES = ["Karachi", "Hyderabad", "Nawabshah"] as const;
export type City = (typeof CITIES)[number];

const MODELS: EngagementModel[] = [1, 2, 3];
const CATEGORIES: Category[] = ["A", "B", "C"];

export interface LeadIntakeInput {
  name: string;
  contact: string;
  city: string;
  model: EngagementModel;
  category: Category;
}

export interface LeadIntakeResult {
  valid: boolean;
  errors: Partial<Record<keyof LeadIntakeInput, string>>;
}

export function validateLeadIntake(
  input: Partial<LeadIntakeInput>,
): LeadIntakeResult {
  const errors: LeadIntakeResult["errors"] = {};

  if (!input.name?.trim()) errors.name = "Name is required.";
  if (!input.contact?.trim()) errors.contact = "Contact info is required.";

  if (!input.city?.trim()) {
    errors.city = "City is required.";
  } else if (!CITIES.includes(input.city as City)) {
    errors.city = `"${input.city}" is not a supported city.`;
  }

  if (input.model === undefined) {
    errors.model = "Engagement model is required.";
  } else if (!MODELS.includes(input.model)) {
    errors.model = "Model must be 1, 2, or 3.";
  }

  if (!input.category) {
    errors.category = "Material category is required.";
  } else if (!CATEGORIES.includes(input.category)) {
    errors.category = "Category must be A, B, or C.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
