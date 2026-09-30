import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { Category, RateCardItem, RateItemType } from "@tmcc/shared-types";
import { isFixedLabourType, searchPlacesFor } from "@tmcc/shared-types";
import {
  ALL_RATE_ITEM_TYPES,
  MATERIAL_TYPES,
  targetsFor,
  type RateTarget,
} from "./rate-targets";
import { parseRateResearch, type RateSource } from "./parse-research";

// A full-size model. The "-lite" models are cheap but follow search + format
// instructions poorly, which is what made small cities come back empty.
export const DEFAULT_RATE_MODEL = "gemini-2.5-flash";
const DEFAULT_FALLBACK_MODELS = ["gemini-2.5-pro"];

/** Primary model first, then fallbacks tried only if it finds nothing. */
export function rateModelChain(): string[] {
  const primary = process.env.AI_RATE_MODEL?.trim() || DEFAULT_RATE_MODEL;
  const fallbacks = process.env.AI_RATE_FALLBACK_MODELS?.trim()
    ? process.env.AI_RATE_FALLBACK_MODELS.split(",")
        .map((m) => m.trim())
        .filter(Boolean)
    : DEFAULT_FALLBACK_MODELS;
  return [...new Set([primary, ...fallbacks])];
}

const timeoutMs = () => Number(process.env.RATE_SEARCH_TIMEOUT_MS) || 60_000;

// Category → grade guidance is our assumption. TM CC should confirm it.
const GRADE_HINT: Record<Category, string> = {
  A: "premium grade (well-known branded cement, A-class / first-class bricks, premium finishes)",
  B: 'standard grade (B-class / second-class "doam" bricks, standard cement brands)',
  C: "economy grade (C-class / third-class bricks, budget cement brands)",
};

export interface ResearchSources {
  items: RateSource[];
  grounding: { url: string; title: string | null }[]; // what Gemini's search actually returned
  warnings: string[];
  model: string;
  searchedAt: string;
}

export interface ResearchResult {
  items: RateCardItem[];
  sources: ResearchSources;
  promptUsed: string;
}

export function buildRatePrompt(
  city: string,
  category: Category,
  today: string,
  targets: RateTarget[] = targetsFor(),
  places: string[] = searchPlacesFor(city),
): string {
  const asks = targets
    .map(
      (t) =>
        `- ${t.label} [${t.itemType}]: ${t.ask}; report it in PKR per "${t.unit}".${t.derive ? ` ${t.derive}.` : ""}`,
    )
    .join("\n");
  const ladder = places.map((p, i) => `${i + 1}. ${p}`).join("\n");
  return [
    `Today is ${today}. Use Google Search to find CURRENT construction material and works rates in Pakistan, in PKR, for the target place: ${places[0]}.`,
    `Look in this order and stop at the first place that gives a usable price for each item:\n${ladder}`,
    `Small cities often have no published rate list. In that case use the nearest bigger market or the national average from a rate site (for example materialrate.pk or civilconstructionguide.com), dealer price lists, or local news. A nearby or national price is acceptable and expected, so do not give up because the exact city is not listed, but always say which place a price is for. An approximate current market price beats no price. If a source gives a range, use the midpoint.`,
    `Target grade: ${GRADE_HINT[category]}.`,
    `Find:\n${asks}`,
    `For every item report: the price, the place it applies to, whether that place is the city itself, a nearby market or the national average, the source name, URL and date (YYYY-MM-DD if shown), and any note. Say NOT FOUND for an item only after you have tried every place in the list. Never make up a price.`,
  ].join("\n\n");
}

// Step 2 of every search. Gemini's search tool works best when it is allowed to
// answer in plain prose, so the findings are turned into strict JSON by a
// second call that has no search tool and cannot add prices of its own.
export function buildExtractPrompt(
  findings: string,
  pages: { url: string; title: string | null }[],
  targets: RateTarget[],
): string {
  const itemTypes = targets.map((t) => `"${t.itemType}"`).join(", ");
  const pageList = pages.length
    ? `\n\nPAGES THE SEARCH USED (you may cite these as sourceUrl):\n${pages.map((p) => `- ${p.title ?? ""} ${p.url}`).join("\n")}`
    : "";
  return [
    `Convert the findings below into a JSON array. Reply with ONLY the JSON array: no prose, no markdown.`,
    `Each element: {"itemType": one of ${itemTypes}, "price": number in PKR (plain number), "priceLocation": string (the place the price applies to), "scope": "city" | "nearby" | "national", "sourceName": string, "sourceUrl": string, "sourceDate": "YYYY-MM-DD" or "", "note": string}`,
    `Rules: use "city" only when the price is for the target city itself; "nearby" for another city or town; "national" for a Pakistan-wide figure. Include an item only if its price is actually stated in the findings. Do not add or change prices. If an item's price was derived from unit rates, start its note with "DERIVED:" and show the arithmetic. If there are no prices at all, reply with [].`,
    `FINDINGS:\n${findings}${pageList}`,
  ].join("\n\n");
}

async function researchWithModel(
  modelId: string,
  input: { city: string; category: Category; now: Date },
  targets: RateTarget[],
  places: string[],
): Promise<ResearchResult> {
  const promptUsed = buildRatePrompt(
    input.city,
    input.category,
    input.now.toISOString().slice(0, 10),
    targets,
    places,
  );

  const search = await generateText({
    model: google(modelId, { useSearchGrounding: true }),
    prompt: promptUsed,
    abortSignal: AbortSignal.timeout(timeoutMs()),
  });

  const grounding = (search.sources ?? []).flatMap((s) =>
    "url" in s && s.url
      ? [{ url: s.url, title: ("title" in s && s.title) || null }]
      : [],
  );

  const extracted = await generateText({
    model: google(modelId),
    prompt: buildExtractPrompt(search.text, grounding, targets),
    abortSignal: AbortSignal.timeout(timeoutMs()),
  });
  const parsed = parseRateResearch(extracted.text, input.now, targets);

  if (parsed.items.length === 0) {
    throw new Error(
      `${modelId} found no usable prices for ${input.city}. ${parsed.warnings.join("; ")}`,
    );
  }

  const warnings = [...parsed.warnings];
  if (grounding.length === 0) {
    warnings.unshift(
      "Gemini returned no search sources. Treat every price as unverified.",
    );
  }
  return {
    items: parsed.items,
    sources: {
      items: parsed.sources,
      grounding,
      warnings,
      model: modelId,
      searchedAt: input.now.toISOString(),
    },
    promptUsed,
  };
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

  // Try the primary model, then each fallback, until one finds prices.
  let lastError: unknown;
  for (const modelId of rateModelChain()) {
    try {
      return await researchWithModel(
        modelId,
        { city: input.city, category: input.category, now },
        targets,
        places,
      );
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
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
 *   1. materials and works as two parallel searches (city -> nearby -> province
 *      -> national ladder inside each prompt);
 *   2. one focused search per item still missing, all in parallel;
 *   3. one Pakistan-wide search per item still missing.
 * If anything is still missing it throws IncompleteRatesError — it never fills
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
    (t) => !isFixedLabourType(t),
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
        model: process.env.AI_RATE_MODEL?.trim() || DEFAULT_RATE_MODEL,
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
  if (missing.length > 0) await retryEach(["Pakistan (national average)"]);

  if (missing.length > 0) {
    const err = new IncompleteRatesError(
      input.city,
      missing,
      searchPlacesFor(input.city),
    );
    if (failures.length) err.message += ` ${failures.join("; ")}`;
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
