// packages/render-engine/src/build-render-prompt.ts
import type { Category, Geometry } from "@tmcc/shared-types";

// Assumption, not confirmed with TM CC: mapping Category A/B/C (a pricing
// tier per the rate card, per RateCard.category) onto finish language for
// the render prompt. The company profile's Design & Concept Gallery shows
// the *range* of finishes TM CC offers (marble vs. terrazzo baths, designer
// vs. standard switch plates) but never ties a specific finish to a
// specific category letter — confirm this mapping with TM CC before a
// client-facing render is generated from it.
const CATEGORY_FINISH: Record<Category, string> = {
  A: "premium finish: imported marble flooring, full-height glazed doors and windows, designer switch/socket panels, feature lighting",
  B: "mid-range finish: ceramic tile flooring, timber/aluminium doors and windows, standard switch plates",
  C: "economy finish: standard tile flooring, plain doors and windows, basic fittings",
};

function describeRooms(geometry: Geometry): string {
  if (geometry.rooms.length === 0) return "an open floor plan";
  return geometry.rooms
    .map((room) => `${room.name} (${Math.round(room.area)} sq ft)`)
    .join(", ");
}

// FR-16: builds the text half of the image-edit call — the schematic plan
// (see schematic-svg.ts / schematic-png.ts) is the other half. Kept as a
// pure function of (geometry, category) so it's unit-testable without
// touching the network, and so a client's exact wording can be tuned here
// without going near generate-render.ts's provider-calling code.
export function buildRenderPrompt(
  geometry: Geometry,
  category: Category,
): string {
  const rooms = describeRooms(geometry);
  const finish = CATEGORY_FINISH[category];

  return [
    "You are given a top-down architectural schematic of a house floor plan, with room names and areas labeled.",
    `Rooms in this plan: ${rooms}.`,
    "Generate a photorealistic isometric 'dollhouse' render of this house: as if the roof and one exterior wall have been removed, looking down and in at a 3/4 angle, so every room's interior is visible at once, matching the room layout and proportions of the schematic exactly.",
    `Render the interior in a ${finish}.`,
    "Keep the render architecturally consistent with the schematic's wall positions — this is a presentation visual, not a floor plan replacement.",
  ].join(" ");
}
