// packages/rate-research/src/research-rates.ts
import type { Category, RateCardItem, RateItemType } from "@tmcc/shared-types";
import { isFixedLabourType, isUnsearchedType, searchPlacesFor } from "@tmcc/shared-types";
import {
  ALL_RATE_ITEM_TYPES,
  MATERIAL_TYPES,
  targetsFor,
} from "./rate-targets";
import { parseRateResearch, type RateSource } from "./parse-research";
import { searchAndExtract } from "./search-provider";

/** Recorded on every saved rate set so office can see where prices came from. */
export const RATE_PROVIDER_LABEL = "tavily+cloudflare";

const shorten = (msg: string, n = 300) =>
  msg.length > n ? `${msg.slice(0, n)}...` : msg;

// Category → grade guidance is our assumption. TM CC should confirm it.
const GRADE_HINT: Record<Category, string> = {
  A: "premium grade (well-known branded cement, A-class / first-class bricks, premium finishes)",
  B: 'standard grade (B-class / second-class "doam" bricks, standard cement brands)',
  C: "economy grade (C-class / third-class bricks, budget cement brands)",
};

export interface ResearchSources {
  items: RateSource[];
  grounding: { url: string; title: string | null }[]; // pages the search returned
  warnings: string[];
  model: string;
  searchedAt: string;
}

export interface ResearchResult {
  items: RateCardItem[];
  sources: ResearchSources;
  promptUsed: string;
}

export async function researchRates(input: {
  city: string;
  category: Category;
  now?: Date;
  /** Research only these items (default: all searched items). */
  itemTypes?: readonly RateItemType[];
  /** Override the place ladder (used for the final Pakistan-wide attempt). */
  places?: string[];
}): Promise<ResearchResult> {
  const now = input.now ?? new Date();
  const targets = targetsFor(input.itemTypes);
  const places = input.places ?? searchPlacesFor(input.city);

  try {
    const r = await searchAndExtract({
      city: input.city,
      place: places[0],
      gradeHint: GRADE_HINT[input.category],
      today: now.toISOString().slice(0, 10),
      targets,
    });
    const parsed = parseRateResearch(r.text, now, targets);

    if (parsed.items.length === 0) {
      throw new Error(
        `no usable prices for ${input.city}. ${parsed.warnings.join("; ")}`,
      );
    }

    const warnings = [...parsed.warnings];
    if (r.grounding.length === 0) {
      warnings.unshift(
        "The search returned no sources. Treat every price as unverified.",
      );
    }

    return {
      items: parsed.items,
      sources: {
        items: parsed.sources,
        grounding: r.grounding,
        warnings,
        model: RATE_PROVIDER_LABEL,
        searchedAt: now.toISOString(),
      },
      promptUsed: r.prompt,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[${RATE_PROVIDER_LABEL}] ${shorten(msg)}`);
  }
}

export class IncompleteRatesError extends Error {
  constructor(
    public city: string,
    public missing: RateItemType[],
    public tried: string[] = [],
  ) {
    super(
      `Live search could not find prices for ${missing.join(", ")} in ${city}${tried.length ? ` (looked in: ${tried.join("; ")})` : ""}.`,
    );
    this.name = "IncompleteRatesError";
  }
}

const dedupe = <T>(xs: T[], key: (x: T) => string) => [
  ...new Map(xs.map((x) => [key(x), x])).values(),
];

/**
 * Researches EVERY requested item and only returns when each one has a live,
 * plausible price. Escalation, cheapest first:
 *   1. materials and works as two parallel searches;
 *   2. one focused search per item still missing, all in parallel;
 *   3. one Pakistan-wide search per item still missing.
 * If anything is still missing it throws IncompleteRatesError. It never fills
 * a gap with a built-in figure.
 */
export async function researchCompleteRates(input: {
  city: string;
  category: Category;
  now?: Date;
  itemTypes?: readonly RateItemType[];
}): Promise<ResearchResult> {
  // Fixed TMCC labour rates are never searched, even if asked for.
  const wanted = (input.itemTypes ?? ALL_RATE_ITEM_TYPES).filter(
    (t) => !isFixedLabourType(t) && !isUnsearchedType(t),
  );

  if (wanted.length === 0) {
    const now = input.now ?? new Date();
    return {
      items: [],
      promptUsed: "",
      sources: {
        items: [],
        grounding: [],
        warnings: [],
        model: RATE_PROVIDER_LABEL,
        searchedAt: now.toISOString(),
      },
    };
  }
  const materials = wanted.filter((t) => MATERIAL_TYPES.includes(t));
  const works = wanted.filter((t) => !MATERIAL_TYPES.includes(t));
  const base = { city: input.city, category: input.category, now: input.now };

  const batches = [materials, works].filter((b) => b.length > 0);
  const settled = await Promise.allSettled(
    batches.map((itemTypes) => researchRates({ ...base, itemTypes })),
  );
  const results = settled.flatMap((s) =>
    s.status === "fulfilled" ? [s.value] : [],
  );
  const failures = settled.flatMap((s) =>
    s.status === "rejected"
      ? [s.reason instanceof Error ? s.reason.message : String(s.reason)]
      : [],
  );

  const have = () =>
    new Set(results.flatMap((r) => r.items.map((i) => i.itemType)));
  let missing = wanted.filter((t) => !have().has(t));

  // Runs one search per missing item, in parallel, and keeps what it finds.
  const retryEach = async (places?: string[]) => {
    const settledEach = await Promise.allSettled(
      missing.map((t) =>
        researchRates({
          ...base,
          itemTypes: [t],
          ...(places ? { places } : {}),
        }),
      ),
    );
    for (const s of settledEach) {
      if (s.status === "fulfilled") results.push(s.value);
      else
        failures.push(
          s.reason instanceof Error ? s.reason.message : String(s.reason),
        );
    }
    missing = wanted.filter((t) => !have().has(t));
  };

  if (missing.length > 0) await retryEach();
  // Walk the rest of the ladder: nearby markets, province hubs, then national.
  for (const place of searchPlacesFor(input.city).slice(1)) {
    if (missing.length === 0) break;
    await retryEach([place]);
  }

  if (missing.length > 0) {
    const err = new IncompleteRatesError(
      input.city,
      missing,
      searchPlacesFor(input.city),
    );
    // Same failure repeats once per item; show each distinct reason once.
    const distinct = [...new Set(failures)];
    if (distinct.length) err.message += ` Reasons: ${distinct.join(" || ")}`;
    throw err;
  }

  const items = dedupe(
    results.flatMap((r) => r.items),
    (i) => i.itemType,
  );
  const first = results[0].sources;
  return {
    items,
    promptUsed: results.map((r) => r.promptUsed).join("\n\n---\n\n"),
    sources: {
      items: dedupe(
        results.flatMap((r) => r.sources.items),
        (s) => s.itemType,
      ),
      grounding: dedupe(
        results.flatMap((r) => r.sources.grounding),
        (g) => g.url,
      ),
      warnings: [...new Set(results.flatMap((r) => r.sources.warnings))],
      model: first.model,
      searchedAt: first.searchedAt,
    },
  };
}
