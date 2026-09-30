import { prisma } from "@tmcc/db";
import {
  DEFAULT_TAX_PERCENT,
  isCompleteRateCard,
  mergeRateCards,
  missingItemTypes,
  withFixedLabour,
} from "@tmcc/rate-cards";
import { researchCompleteRates } from "@tmcc/rate-research";
import { canonicalCityName, type Category, type RateCard, type RateCardItem } from "@tmcc/shared-types";

export class RateSetError extends Error {
  constructor(public code: "NOT_FOUND" | "NOT_DRAFT") {
    super(code);
  }
}

// Thrown when live rates cannot be found. Callers must surface this — there
// is deliberately no placeholder rate to fall back on.
export class RateUnavailableError extends Error {
  constructor(
    public city: string,
    public category: Category,
    public reason: string,
  ) {
    super(
      `Could not get live market rates for ${city} (Category ${category}): ${reason}`,
    );
    this.name = "RateUnavailableError";
  }
}

const DAY_MS = 86_400_000;
const maxAgeDays = () => Number(process.env.RATE_MAX_AGE_DAYS) || 30;
const taxPercent = () =>
  Number(process.env.BOQ_TAX_PERCENT) || DEFAULT_TAX_PERCENT;

// One search per city/category at a time: concurrent requests share it.
const inflight = new Map<string, Promise<RateCard>>();

/**
 * The card every BOQ is priced with. All 17 rates come from a city-specific
 * AI web search:
 *  - a complete APPROVED set younger than RATE_MAX_AGE_DAYS is reused;
 *  - otherwise (first BOQ for the city, stale, or incomplete) Gemini searches
 *    now, and the result is saved as an APPROVED "gemini-auto" set with its
 *    sources so office can audit or replace it later;
 *  - office-approved rates that are still fresh are kept, and only the items
 *    they lack are searched;
 *  - if the search fails, a previously saved complete set is used (still real
 *    AI-found rates); if there is none, this throws RateUnavailableError.
 */
export function getLiveRateCard(
  city: string,
  category: Category,
): Promise<RateCard> {
  const cleanCity = canonicalCityName(city) ?? city.trim();
  const key = `${cleanCity.toLowerCase()}|${category}`;
  const running = inflight.get(key);
  if (running) return running;
  const p = resolveLiveRateCard(cleanCity, category).finally(() =>
    inflight.delete(key),
  );
  inflight.set(key, p);
  return p;
}

async function resolveLiveRateCard(
  city: string,
  category: Category,
): Promise<RateCard> {
  const row = await prisma.rateSet.findFirst({
    where: {
      city: { equals: city, mode: "insensitive" },
      category,
      status: "APPROVED",
    },
    orderBy: { approvedAt: "desc" },
  });

  // TMCC's fixed labour rates always overlay whatever was saved earlier.
  const existing: RateCard | undefined = row
    ? withFixedLabour({
        city,
        category,
        taxPercent: row.taxPercent,
        items: row.items as unknown as RateCardItem[],
      })
    : undefined;

  const ageMs = row?.approvedAt
    ? Date.now() - row.approvedAt.getTime()
    : Infinity;
  const fresh = ageMs <= maxAgeDays() * DAY_MS;
  const missing = missingItemTypes(existing);

  if (existing && fresh && missing.length === 0) return existing;

  // Fresh but incomplete: keep what office approved, search only the gaps.
  const onlyGaps = !!existing && fresh;

  let researched;
  try {
    researched = await researchCompleteRates({
      city,
      category,
      ...(onlyGaps ? { itemTypes: missing } : {}),
    });
  } catch (err) {
    if (existing && isCompleteRateCard(existing)) return existing; // stale, but real
    throw new RateUnavailableError(
      city,
      category,
      err instanceof Error ? err.message : "unknown error",
    );
  }

  const fromSearch: RateCard = {
    city,
    category,
    taxPercent: taxPercent(),
    items: researched.items,
  };

  const card = withFixedLabour(
    onlyGaps ? (mergeRateCards(fromSearch, existing) as RateCard) : fromSearch,
  );

  try {
    await saveAutoRateSet(city, category, card, researched.sources);
  } catch (err) {
    // The BOQ can still be priced; it just will not be cached this time.
    console.error("Could not save auto rate set", err);
  }
  return card;
}

async function saveAutoRateSet(
  city: string,
  category: Category,
  card: RateCard,
  sources: unknown,
) {
  return prisma.$transaction(async (tx) => {
    await tx.rateSet.updateMany({
      where: { city, category, status: "APPROVED" },
      data: { status: "SUPERSEDED" },
    });
    return tx.rateSet.create({
      data: {
        city,
        category,
        status: "APPROVED",
        origin: "gemini-auto",
        taxPercent: card.taxPercent,
        items: card.items as unknown as object,
        sources: sources as object,
        approvedAt: new Date(),
        approvedBy: "auto (AI search)",
      },
    });
  });
}

export async function approveRateSet(
  id: string,
  approvedBy: string,
  items?: RateCardItem[],
) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.rateSet.findUnique({ where: { id } });
    if (!target) throw new RateSetError("NOT_FOUND");
    if (target.status !== "DRAFT") throw new RateSetError("NOT_DRAFT");

    await tx.rateSet.updateMany({
      where: {
        city: target.city,
        category: target.category,
        status: "APPROVED",
      },
      data: { status: "SUPERSEDED" },
    });
    return tx.rateSet.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy,
        ...(items ? { items: items as unknown as object } : {}),
      },
    });
  });
}

export async function rejectRateSet(id: string) {
  return prisma.rateSet.update({ where: { id }, data: { status: "REJECTED" } });
}
