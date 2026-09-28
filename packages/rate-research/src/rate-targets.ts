import type { RateCardItem, RateItemType } from "@tmcc/shared-types";

export interface RateTarget {
  itemType: Extract<
    RateItemType,
    "brick" | "cement" | "sand" | "steelMaterial"
  >;
  label: string;
  unit: RateCardItem["unit"];
  ask: string;
  // Wide PKR sanity bounds. They only catch obvious hallucinations
  // (a 50 rupee cement bag), not wrong-but-plausible prices. Review by
  // office is what catches those. TM CC should adjust the bounds.
  min: number;
  max: number;
}

export const RATE_TARGETS: RateTarget[] = [
  {
    itemType: "brick",
    label: "Bricks",
    unit: "1000nos",
    ask: "price of 1,000 first-class bricks",
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
    ask: "price of sand per cubic foot",
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
];
