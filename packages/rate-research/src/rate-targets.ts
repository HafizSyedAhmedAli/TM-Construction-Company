import type { RateCardItem, RateItemType } from "@tmcc/shared-types";
import { CORE_MATERIAL_TYPES, isFixedLabourType } from "@tmcc/shared-types";

export interface RateTarget {
  itemType: RateItemType;
  label: string;
  unit: RateCardItem["unit"];
  ask: string;
  // Wide PKR sanity bounds. They only catch obvious hallucinations
  // (a 50 rupee cement bag), not wrong-but-plausible prices. Review by
  // office is what catches those. TM CC should adjust the bounds.
  min: number;
  max: number;
}

// One target per BOQ line. Every rate the BOQ uses is researched — there are
// no built-in figures. `ask` matches what the BOQ quantity is measured in
// (see QUANTITY_BASIS in boq-engine), so labour-only lines stay labour-only.
export const RATE_TARGETS: RateTarget[] = [
  // --- materials ---
  {
    itemType: "brick",
    label: "Bricks",
    unit: "1000nos",
    ask: "price of 1,000 bricks of the target grade (A = first-class, B = second-class/doam, C = third-class)",
    min: 8_000,
    max: 40_000,
  },
  {
    itemType: "cement",
    label: "Cement (50 kg bag)",
    unit: "bag",
    ask: "price of one 50 kg cement bag",
    min: 800,
    max: 3_000,
  },
  {
    itemType: "sand",
    label: "Sand",
    unit: "cft",
    ask: "price of sand per cubic foot (cft)",
    min: 20,
    max: 250,
  },
  {
    itemType: "steelMaterial",
    label: "Steel bars (Grade 60)",
    unit: "ton",
    ask: "price of Grade 60 steel bars per ton",
    min: 200_000,
    max: 450_000,
  },
  // --- labour-only ---
  {
    itemType: "masonry",
    label: "Brick masonry labour",
    unit: "sqft",
    ask: "labour-only (mason) rate for brick masonry per square foot of wall face, excluding bricks and cement",
    min: 30,
    max: 400,
  },
  {
    itemType: "plaster",
    label: "Plaster labour",
    unit: "sqft",
    ask: "labour-only rate for cement plaster per square foot, excluding materials",
    min: 15,
    max: 200,
  },
  {
    itemType: "shuttering",
    label: "Roof shuttering labour",
    unit: "sqft",
    ask: "labour-only rate for roof slab shuttering / centering per square foot",
    min: 30,
    max: 400,
  },
  {
    itemType: "steelFixing",
    label: "Steel fixing labour",
    unit: "ton",
    ask: "labour-only rate for cutting, bending and fixing reinforcement steel per ton (bar-bending labour)",
    min: 10_000,
    max: 100_000,
  },
  // --- composite (supply + labour) ---
  {
    itemType: "sanitary",
    label: "Sanitary fixtures per bathroom",
    unit: "bath",
    ask: "complete cost per bathroom for sanitary fixtures, plumbing and sewerage, supply and fixing (one standard bathroom)",
    min: 30_000,
    max: 600_000,
  },
  {
    itemType: "tileFixing",
    label: "Tile flooring",
    unit: "sqft",
    ask: "rate for floor tiles supplied and fixed, per square foot, including tile, adhesive and labour",
    min: 80,
    max: 1_200,
  },
  {
    itemType: "marbleFixing",
    label: "Marble flooring",
    unit: "sqft",
    ask: "rate for marble flooring supplied and fixed, per square foot, including marble and labour",
    min: 200,
    max: 2_500,
  },
  {
    itemType: "woodwork",
    label: "Doors & windows",
    unit: "sqft",
    ask: "rate for wooden doors and windows supplied and fixed, per square foot of opening",
    min: 300,
    max: 3_500,
  },
  {
    itemType: "falseCeiling",
    label: "False ceiling",
    unit: "sqft",
    ask: "rate for false ceiling (gypsum / POP) supplied and fixed, per square foot",
    min: 80,
    max: 700,
  },
  {
    itemType: "foundation",
    label: "Foundation, excavation & plinth",
    unit: "sqft",
    ask: "all-in construction rate per square foot of covered area for excavation, foundation and plinth (grey structure portion), material and labour",
    min: 150,
    max: 1_200,
  },
  {
    itemType: "rccRoof",
    label: "RCC roof slab & beams",
    unit: "sqft",
    ask: "rate per square foot of covered area for RCC roof slab and beams (concrete work), material and labour, excluding steel bars and shuttering",
    min: 300,
    max: 1_800,
  },
  {
    itemType: "electrical",
    label: "Electrical wiring & points",
    unit: "sqft",
    ask: "electrical wiring and points rate per square foot of covered area, material and labour",
    min: 100,
    max: 800,
  },
  {
    itemType: "paint",
    label: "Paint",
    unit: "sqft",
    ask: "interior emulsion paint rate per square foot of surface, material and labour",
    min: 15,
    max: 200,
  },
];

// Fixed TMCC labour rates (masonry, plaster, ...) are never searched.
export const SEARCHED_TARGETS: RateTarget[] = RATE_TARGETS.filter(
  (t) => !isFixedLabourType(t.itemType),
);

export const ALL_RATE_ITEM_TYPES: RateItemType[] = SEARCHED_TARGETS.map(
  (t) => t.itemType,
);

export const MATERIAL_TYPES: RateItemType[] = [...CORE_MATERIAL_TYPES];

export const targetsFor = (types?: readonly RateItemType[]): RateTarget[] =>
  types
    ? RATE_TARGETS.filter((t) => types.includes(t.itemType))
    : SEARCHED_TARGETS;
