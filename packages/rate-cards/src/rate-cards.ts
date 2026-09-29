// packages/rate-cards/src/rate-cards.ts
import type { RateCard, Category } from "@tmcc/shared-types";

// !! PLACEHOLDER FIGURES !! Indicative only — TM CC must replace these with
// its own rate list before a final client quote. Labour items are
// labour-only where a material line exists (masonry/plaster/steel fixing);
// tile, marble, woodwork, foundation, rccRoof, electrical and paint are
// composite (supply + labour) per-sqft rates.
export const RATE_CARDS: RateCard[] = [
  ...ratesFor("Karachi", "A", 1.15),
  ...ratesFor("Karachi", "B", 1.0),
  ...ratesFor("Karachi", "C", 0.85),
  ...ratesFor("Hyderabad", "A", 1.05),
  ...ratesFor("Hyderabad", "B", 0.92),
  ...ratesFor("Hyderabad", "C", 0.8),
  ...ratesFor("Nawabshah", "A", 0.95),
  ...ratesFor("Nawabshah", "B", 0.85),
  ...ratesFor("Nawabshah", "C", 0.72),
];

function ratesFor(city: string, category: Category, mult: number): RateCard[] {
  return [
    {
      city,
      category,
      taxPercent: 17,
      items: [
        // labour
        { itemType: "masonry", unit: "sqft", unitRate: round(95 * mult) },
        { itemType: "plaster", unit: "sqft", unitRate: round(40 * mult) },
        { itemType: "shuttering", unit: "sqft", unitRate: round(90 * mult) },
        { itemType: "steelFixing", unit: "ton", unitRate: round(28000 * mult) },
        { itemType: "sanitary", unit: "bath", unitRate: round(145000 * mult) },
        // composite (supply + fix)
        { itemType: "tileFixing", unit: "sqft", unitRate: round(220 * mult) },
        { itemType: "marbleFixing", unit: "sqft", unitRate: round(450 * mult) },
        { itemType: "woodwork", unit: "sqft", unitRate: round(950 * mult) },
        { itemType: "falseCeiling", unit: "sqft", unitRate: round(160 * mult) },
        { itemType: "foundation", unit: "sqft", unitRate: round(380 * mult) },
        { itemType: "rccRoof", unit: "sqft", unitRate: round(750 * mult) },
        { itemType: "electrical", unit: "sqft", unitRate: round(250 * mult) },
        { itemType: "paint", unit: "sqft", unitRate: round(45 * mult) },
        // materials (overridden by approved market-research rates)
        { itemType: "brick", unit: "1000nos", unitRate: round(16500 * mult) },
        {
          itemType: "cement",
          unit: "bag",
          unitRate: round(1400 * (0.9 + mult / 10)),
        },
        {
          itemType: "sand",
          unit: "cft",
          unitRate: round(70 * (0.9 + mult / 10)),
        },
        {
          itemType: "steelMaterial",
          unit: "ton",
          unitRate: round(270000 * (0.95 + mult / 20)),
        },
      ],
    },
  ];
}

function round(n: number): number {
  return Math.round(n / 5) * 5;
}

export function getRateCard(
  city: string,
  category: Category,
): RateCard | undefined {
  return RATE_CARDS.find((rc) => rc.city === city && rc.category === category);
}
