// packages/rate-cards/src/rate-cards.ts
import type { RateCard, Category } from "@tmcc/shared-types";

// FR-15: city/category → rates. Placeholder figures — swap for TM CC's
// actual published rate list before this touches a real client quote.
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

// Base per-unit rates at Category B / Karachi, scaled by a city+category
// multiplier. Keeps 9 rate cards from being 9 copy-pasted item lists.
function ratesFor(city: string, category: Category, mult: number): RateCard[] {
  return [
    {
      city,
      category,
      taxPercent: 17, // Pakistan sales tax on services, per SRS §4.2
      items: [
        { itemType: "masonry", unit: "sqft", unitRate: round(180 * mult) },
        { itemType: "plaster", unit: "sqft", unitRate: round(65 * mult) },
        { itemType: "shuttering", unit: "sqft", unitRate: round(90 * mult) },
        {
          itemType: "steelFixing",
          unit: "ton",
          unitRate: round(285000 * mult),
        },
        { itemType: "sanitary", unit: "bath", unitRate: round(145000 * mult) },
        { itemType: "tileFixing", unit: "sqft", unitRate: round(220 * mult) },
        { itemType: "marbleFixing", unit: "sqft", unitRate: round(450 * mult) },
        { itemType: "woodwork", unit: "sqft", unitRate: round(950 * mult) },
        { itemType: "falseCeiling", unit: "sqft", unitRate: round(160 * mult) },
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
