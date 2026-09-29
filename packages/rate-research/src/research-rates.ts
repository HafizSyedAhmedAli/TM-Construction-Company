import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { Category, RateCardItem, RateItemType } from "@tmcc/shared-types";
import {
  ALL_RATE_ITEM_TYPES,
  MATERIAL_TYPES,
  targetsFor,
  type RateTarget,
} from "./rate-targets";
import { parseRateResearch, type RateSource } from "./parse-research";

export const DEFAULT_RATE_MODEL = "gemini-3.1-flash-lite";

// Category → grade guidance is our assumption. TM CC should confirm it.
const GRADE_HINT: Record<Category, string> = {
  A: "premium grade (well-known branded cement, first-class bricks, premium finishes)",
  B: "standard grade",
  C: "economy grade",
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
): string {
  const asks = targets
    .map(
      (t) => `- itemType "${t.itemType}": ${t.ask}, in PKR, unit "${t.unit}"`,
    )
    .join("\n");
  return [
    `Today is ${today}. Use web search to find CURRENT construction rates in ${city}, Pakistan (if ${city} has no local listing, use the nearest major market and say so in "note").`,
    `Target grade: ${GRADE_HINT[category]}.`,
    `Find:\n${asks}`,
    `Reply with ONLY a JSON array, no prose. Each element:`,
    `{"itemType": string, "price": number, "sourceName": string, "sourceUrl": string, "sourceDate": "YYYY-MM-DD", "note": string}`,
    `Rules: use a price you actually found on a page and cite that page. If you cannot find a price, omit the item. Never estimate or average from memory.`,
  ].join("\n\n");
}

export async function researchRates(input: {
  city: string;
  category: Category;
  now?: Date;
  /** Research only these items (default: all). */
  itemTypes?: readonly RateItemType[];
}): Promise<ResearchResult> {
  const now = input.now ?? new Date();
  const modelId = process.env.AI_RATE_MODEL?.trim() || DEFAULT_RATE_MODEL;
  const targets = targetsFor(input.itemTypes);
  const promptUsed = buildRatePrompt(
    input.city,
    input.category,
    now.toISOString().slice(0, 10),
    targets,
  );

  const result = await generateText({
    model: google(modelId, { useSearchGrounding: true }),
    prompt: promptUsed,
  });

  const parsed = parseRateResearch(result.text, now, targets);
  if (parsed.items.length === 0) {
    throw new Error(
      `Gemini found no usable prices for ${input.city}. ${parsed.warnings.join("; ")}`,
    );
  }

  const grounding = (result.sources ?? []).flatMap((s) =>
    "url" in s && s.url
      ? [{ url: s.url, title: ("title" in s && s.title) || null }]
      : [],
  );
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
      searchedAt: now.toISOString(),
    },
    promptUsed,
  };
}

export class IncompleteRatesError extends Error {
  constructor(
    public city: string,
    public missing: RateItemType[],
  ) {
    super(
      `Live search could not find prices for ${missing.join(", ")} in ${city}.`,
    );
    this.name = "IncompleteRatesError";
  }
}

const dedupe = <T>(xs: T[], key: (x: T) => string) => [
  ...new Map(xs.map((x) => [key(x), x])).values(),
];

/**
 * Researches EVERY requested item (default: all 17) and only returns when each
 * one has a live, plausible price. A single search over 17 items is unreliable,
 * so it runs the four materials and the works rates as two parallel searches,
 * then retries whatever is still missing once. If anything is still missing it
 * throws IncompleteRatesError — it never fills a gap with a built-in figure.
 */
export async function researchCompleteRates(input: {
  city: string;
  category: Category;
  now?: Date;
  itemTypes?: readonly RateItemType[];
}): Promise<ResearchResult> {
  const wanted = input.itemTypes ?? ALL_RATE_ITEM_TYPES;
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

  if (missing.length > 0) {
    try {
      results.push(await researchRates({ ...base, itemTypes: missing }));
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
    missing = wanted.filter((t) => !have().has(t));
  }

  if (missing.length > 0) {
    const err = new IncompleteRatesError(input.city, missing);
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
