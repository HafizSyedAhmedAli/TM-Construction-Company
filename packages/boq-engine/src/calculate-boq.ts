import type {
  Geometry,
  RateCard,
  BOQResult,
  BOQLineItem,
  RateItemType,
} from "@tmcc/shared-types";

function totalWallFaceArea(geometry: Geometry): number {
  return geometry.walls.reduce(
    (sum, wall) => sum + wall.length * wall.height,
    0,
  );
}

function totalFloorArea(geometry: Geometry): number {
  return geometry.rooms.reduce((sum, room) => sum + room.area, 0);
}

// Assumption, not a physical constant — a commonly used residential RCC
// rule-of-thumb (kg of reinforcement steel per sqft of built-up floor area).
// Confirm against TM CC's own engineering standard before relying on this
// for a real client-facing quote.
const STEEL_KG_PER_SQFT = 4;

function steelTonnage(geometry: Geometry): number {
  return (totalFloorArea(geometry) * STEEL_KG_PER_SQFT) / 1000;
}

function bathroomCount(geometry: Geometry): number {
  return geometry.rooms.filter((room) => room.type === "bathroom").length;
}

function totalOpeningArea(geometry: Geometry): number {
  return geometry.openings.reduce(
    (sum, opening) => sum + opening.width * opening.height,
    0,
  );
}

const QUANTITY_BASIS: Record<RateItemType, (g: Geometry) => number> = {
  masonry: totalWallFaceArea,
  plaster: (g) => totalWallFaceArea(g) * 2,
  shuttering: totalWallFaceArea,
  steelFixing: steelTonnage,
  sanitary: bathroomCount,
  tileFixing: totalFloorArea,
  marbleFixing: totalFloorArea,
  woodwork: totalOpeningArea,
  falseCeiling: totalFloorArea,
};

export function calculateBoq(
  geometry: Geometry,
  rateCard: RateCard,
): BOQResult {
  const lineItems: BOQLineItem[] = rateCard.items
    .map((rateItem) => {
      const quantity = QUANTITY_BASIS[rateItem.itemType](geometry);
      return {
        itemType: rateItem.itemType,
        quantity,
        unit: rateItem.unit,
        unitRate: rateItem.unitRate,
        subtotal: quantity * rateItem.unitRate,
      };
    })
    .filter((item) => item.quantity > 0);

  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * (rateCard.taxPercent / 100);

  return { lineItems, subtotal, tax, total: subtotal + tax };
}
