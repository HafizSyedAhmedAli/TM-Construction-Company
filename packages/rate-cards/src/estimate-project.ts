// packages/rate-cards/src/estimate-project.ts
import { calculateBoq } from "@tmcc/boq-engine";
import type { BOQResult, Category, Geometry } from "@tmcc/shared-types";
import { getRateCard } from "./rate-cards";

export interface EstimateProjectInput {
  geometry: Geometry;
  city: string;
  category: Category;
}

// This is the FR-8/9 counterpart to estimateLead: same calculateBoq call,
// but priced against a project's real parsed-and-corrected geometry
// instead of the REFERENCE_GEOMETRY archetype. Deliberately a separate
// function rather than a change inside estimateLead — estimateLead still
// runs at intake time (FR-3/4), before any Project or CAD file exists, so
// it has no real geometry to price yet and still needs the archetype.
// This is what a project's "Generate BOQ" step (FR-11/12/13) calls once
// office has reviewed/corrected the extracted geometry (FR-10/14).
//
// Returns null when no rate card exists yet for that city/category, same
// convention as estimateLead — caller decides how to degrade.
export function estimateFromGeometry(
  input: EstimateProjectInput,
): BOQResult | null {
  const rateCard = getRateCard(input.city, input.category);
  if (!rateCard) return null;

  return calculateBoq(input.geometry, rateCard);
}