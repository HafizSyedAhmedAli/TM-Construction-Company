import { calculateBoq } from "@tmcc/boq-engine";
import type {
  BOQResult,
  Category,
  Geometry,
  RateCard,
} from "@tmcc/shared-types";
import { getRateCard } from "./rate-cards";

export interface EstimateProjectInput {
  geometry: Geometry;
  city: string;
  category: Category;
  rateCard?: RateCard; // approved/merged card from the DB; falls back to the placeholder
}

export function estimateFromGeometry(
  input: EstimateProjectInput,
): BOQResult | null {
  const rateCard = input.rateCard ?? getRateCard(input.city, input.category);
  if (!rateCard) return null;
  return calculateBoq(input.geometry, rateCard);
}
