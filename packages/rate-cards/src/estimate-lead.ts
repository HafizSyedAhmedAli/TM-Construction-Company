// packages/rate-cards/src/estimate-lead.ts
import { calculateBoq } from "@tmcc/boq-engine";
import type { BOQResult, EngagementModel, RateCard } from "@tmcc/shared-types";
import { REFERENCE_GEOMETRY } from "./reference-geometry";

export interface EstimateInput {
  model: EngagementModel;
  /** Live city/category rate card. There is no built-in fallback. */
  rateCard?: RateCard;
}

// Returns null when no live rate card is available.
export function estimateLead(input: EstimateInput): BOQResult | null {
  if (!input.rateCard) return null;
  return calculateBoq(REFERENCE_GEOMETRY[input.model], input.rateCard);
}
