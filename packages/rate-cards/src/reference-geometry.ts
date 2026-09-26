// packages/rate-cards/src/reference-geometry.ts
import type { Geometry } from "@tmcc/shared-types";
import type { EngagementModel } from "@tmcc/shared-types";

// Stand-in for real CAD output (FR-8/FR-9, not built yet). A rough
// small/medium/large house archetype per engagement model, ONLY for
// giving the lead an instant ballpark on the intake form — never present
// this as a final BOQ. Replace the lookup with actual parsed geometry
// once CAD upload lands; the calculateBoq call itself doesn't change.
export const REFERENCE_GEOMETRY: Record<EngagementModel, Geometry> = {
  1: houseArchetype(1200), // Model 1: TM CC builds to sell — smaller unit
  2: houseArchetype(1800), // Model 2: client's plot, standard build
  3: houseArchetype(2400), // Model 3: client's plot + budget, larger build
};

function houseArchetype(builtUpSqft: number): Geometry {
  const perimeter = Math.sqrt(builtUpSqft) * 4;
  return {
    walls: [
      {
        id: "w1",
        startX: 0,
        startY: 0,
        endX: perimeter / 4,
        endY: 0,
        length: perimeter / 4,
        height: 10,
        thickness: 0.75,
      },
    ],
    rooms: [
      {
        id: "r1",
        name: "Living/General",
        area: builtUpSqft * 0.7,
        type: "general",
      },
      { id: "r2", name: "Kitchen", area: builtUpSqft * 0.1, type: "kitchen" },
      {
        id: "r3",
        name: "Bathroom 1",
        area: builtUpSqft * 0.05,
        type: "bathroom",
      },
      {
        id: "r4",
        name: "Bathroom 2",
        area: builtUpSqft * 0.05,
        type: "bathroom",
      },
    ],
    openings: [
      { id: "o1", type: "door", width: 3, height: 7 },
      { id: "o2", type: "window", width: 4, height: 4 },
    ],
  };
}
