import type { RateCard } from "@tmcc/shared-types";

// Approved rates override the base card item-by-item. A city with no
// placeholder card (e.g. Multan) works once it has an approved set.
export function mergeRateCards(
  base: RateCard | undefined,
  approved: RateCard | undefined,
): RateCard | undefined {
  if (!base) return approved;
  if (!approved) return base;

  const byType = new Map(base.items.map((i) => [i.itemType, i]));
  for (const item of approved.items) byType.set(item.itemType, item);

  return {
    ...base,
    taxPercent: approved.taxPercent,
    items: [...byType.values()],
  };
}
