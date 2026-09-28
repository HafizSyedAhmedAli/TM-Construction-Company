import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { Category, RateCardItem } from "@tmcc/shared-types";
import { RATE_TARGETS } from "./rate-targets";
import { parseRateResearch, type RateSource } from "./parse-research";

const DEFAULT_RATE_MODEL = "gemini-3.1-flash-lite";

// Category → grade guidance is our assumption. TM CC should confirm it.
const GRADE_HINT: Record<Category, string> = {
  A: "premium grade (well-known branded cement, first-class bricks)",
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
): string {
  const asks = RATE_TARGETS.map(
    (t) => `- itemType "${t.itemType}": ${t.ask}, in PKR, unit "${t.unit}"`,
  ).join("\n");
  return [
    `Today is ${today}. Use web search to find CURRENT construction material prices in ${city}, Pakistan (if ${city} has no local listing, use the nearest major market and say so in "note").`,
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
}): Promise<ResearchResult> {
  const now = input.now ?? new Date();
  const modelId = process.env.AI_RATE_MODEL?.trim() || DEFAULT_RATE_MODEL;
  const promptUsed = buildRatePrompt(
    input.city,
    input.category,
    now.toISOString().slice(0, 10),
  );

  const result = await generateText({
    model: google(modelId, { useSearchGrounding: true }),
    prompt: promptUsed,
  });

  const parsed = parseRateResearch(result.text, now);
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
