// packages/rate-cards/src/estimate-lead.ts
import { calculateBoq } from "@tmcc/boq-engine";
import type { BOQResult, Category, EngagementModel } from "@tmcc/shared-types";
import { getRateCard } from "./rate-cards";
import { REFERENCE_GEOMETRY } from "./reference-geometry";

export interface EstimateInput {
  city: string;
  category: Category;
  model: EngagementModel;
}

// Returns null when no rate card exists yet for that city/category —
// caller decides how to degrade (e.g. "estimate coming soon for Multan").
export function estimateLead(input: EstimateInput): BOQResult | null {
  const rateCard = getRateCard(input.city, input.category);
  if (!rateCard) return null;

  const geometry = REFERENCE_GEOMETRY[input.model];
  return calculateBoq(geometry, rateCard);
}
