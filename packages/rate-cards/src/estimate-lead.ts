// packages/rate-cards/src/estimate-lead.ts
import { calculateBoq } from "@tmcc/boq-engine";
import type {
  BOQResult,
  Category,
  EngagementModel,
  RateCard,
} from "@tmcc/shared-types";
import { getRateCard } from "./rate-cards";
import { REFERENCE_GEOMETRY } from "./reference-geometry";

export interface EstimateInput {
  city: string;
  category: Category;
  model: EngagementModel;
  /** Approved/merged card from the DB; falls back to the built-in card. */
  rateCard?: RateCard;
}

// Returns null when no rate card exists yet for that city/category.
export function estimateLead(input: EstimateInput): BOQResult | null {
  const rateCard = input.rateCard ?? getRateCard(input.city, input.category);
  if (!rateCard) return null;
  return calculateBoq(REFERENCE_GEOMETRY[input.model], rateCard);
}
