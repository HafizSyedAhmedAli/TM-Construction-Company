import type { RateCardItem, RateItemType } from "@tmcc/shared-types";
import { CORE_MATERIAL_TYPES, isFixedLabourType, isUnsearchedType } from "@tmcc/shared-types";

export interface RateTarget {
  itemType: RateItemType;
  label: string;
  unit: RateCardItem["unit"];
  ask: string;
  derive?: string;
  search?: string;
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
    search: "bricks eent rate per 1000 {where} today",
    ask: "price of 1,000 bricks of the target grade (A = first-class, B = second-class/doam, C = third-class)",
    min: 8_000,
    max: 40_000,
  },
  {
    itemType: "cement",
    label: "Cement (50 kg bag)",
    unit: "bag",
    search: "cement price per 50 kg bag {where} today",
    ask: "price of one 50 kg cement bag",
    min: 800,
    max: 3_000,
  },
  {
    itemType: "sand",
    label: "Sand",
    unit: "cft",
    search: "sand ret rate per cft {where} today",
    ask: "price of sand per cubic foot (cft)",
    min: 20,
    max: 250,
  },
  {
    itemType: "steelMaterial",
    label: "Steel bars (Grade 60)",
    unit: "ton",
    search: "saria steel Grade 60 rate per ton {where} today",
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
    search: "bathroom sanitary fittings plumbing cost per bathroom {where}",
    ask: "complete cost per bathroom for sanitary fixtures, plumbing and sewerage, supply and fixing (one standard bathroom)",
    min: 30_000,
    max: 600_000,
  },
  {
    itemType: "tileFixing",
    label: "Tile flooring",
    unit: "sqft",
    search: "floor tiles fixing rate per sq ft supply and labour {where}",
    ask: "rate for floor tiles supplied and fixed, per square foot, including tile, adhesive and labour",
    min: 80,
    max: 1_200,
  },
  {
    itemType: "marbleFixing",
    label: "Marble flooring",
    unit: "sqft",
    search: "marble flooring rate per sq ft supply and fixing {where}",
    ask: "rate for marble flooring supplied and fixed, per square foot, including marble and labour",
    min: 200,
    max: 2_500,
  },
  {
    itemType: "woodwork",
    label: "Doors & windows",
    unit: "sqft",
    search: "wooden door window rate per sq ft {where}",
    ask: "rate for wooden doors and windows supplied and fixed, per square foot of opening",
    min: 300,
    max: 3_500,
  },
  {
    itemType: "falseCeiling",
    label: "False ceiling",
    unit: "sqft",
    search: "false ceiling gypsum POP rate per sq ft {where}",
    ask: "rate for false ceiling (gypsum / POP) supplied and fixed, per square foot",
    min: 80,
    max: 700,
  },
  {
    itemType: "foundation",
    label: "Foundation, excavation & plinth",
    unit: "sqft",
    search:
      "house construction cost breakdown per sq ft foundation excavation grey structure {where}",
    ask: "all-in construction rate per square foot of covered area for excavation, foundation and plinth (grey structure portion), material and labour",
    derive:
      "If no per-sqft foundation rate is published, derive it from published unit rates (excavation per 1000 cft, PCC/RCC per cft, brick or block masonry in foundation) or from a published grey-structure cost per sqft, and show the arithmetic",
    min: 150,
    max: 1_200,
  },
  {
    itemType: "rccRoof",
    label: "RCC roof slab & beams",
    unit: "sqft",
    search: "RCC roof slab lenter rate per sq ft material and labour {where}",
    ask: "rate per square foot of covered area for RCC roof slab and beams (concrete work), material and labour, excluding steel bars and shuttering",
    derive:
      "If no per-sqft RCC roof rate is published, derive it from a published RCC (concrete) rate per cft with material and labour, using a 5-inch slab plus beams allowance, and show the arithmetic",
    min: 300,
    max: 1_800,
  },
  {
    itemType: "electrical",
    label: "Electrical wiring & points",
    unit: "sqft",
    search:
      "house electrical wiring cost per sq ft material and labour {where}",
    ask: "electrical wiring and points rate per square foot of covered area, material and labour",
    min: 100,
    max: 800,
  },
  {
    itemType: "paint",
    label: "Paint",
    unit: "sqft",
    search: "paint rate per sq ft emulsion material and labour {where}",
    ask: "interior emulsion paint rate per square foot of surface, material and labour",
    min: 15,
    max: 200,
  },
];

// Fixed TMCC labour rates (masonry, plaster, ...) are never searched.
export const SEARCHED_TARGETS: RateTarget[] = RATE_TARGETS.filter(
  (t) => !isFixedLabourType(t.itemType) && !isUnsearchedType(t.itemType),
);

export const ALL_RATE_ITEM_TYPES: RateItemType[] = SEARCHED_TARGETS.map(
  (t) => t.itemType,
);

export const MATERIAL_TYPES: RateItemType[] = [...CORE_MATERIAL_TYPES];

export const targetsFor = (types?: readonly RateItemType[]): RateTarget[] =>
  types
    ? RATE_TARGETS.filter((t) => types.includes(t.itemType))
    : SEARCHED_TARGETS;
