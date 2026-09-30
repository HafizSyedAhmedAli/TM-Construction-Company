// packages/rate-research/src/search-provider.ts
import type { RateTarget } from "./rate-targets";

export interface SearchExtractResult {
  text: string; // JSON array as text, the format parseRateResearch expects
  grounding: { url: string; title: string | null }[];
  prompt: string;
}

const DEFAULT_CF_LLM = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const timeoutMs = () => Number(process.env.RATE_SEARCH_TIMEOUT_MS) || 60_000;

async function tavily(query: string) {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) throw new Error("TAVILY_API_KEY is not set.");
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, search_depth: "basic", max_results: 6 }),
    signal: AbortSignal.timeout(timeoutMs()),
  });
  if (!res.ok) {
    const d = await res.text().catch(() => "");
    // 401 = bad key, 429 = too many requests, 432/433 = plan or credit limit
    throw new Error(`Tavily failed (${res.status}): ${d.slice(0, 150)}`);
  }
  const json = (await res.json()) as {
    results?: { title: string; url: string; content: string }[];
  };
  return json.results ?? [];
}

/**
 * "Nawabshah (also called Benazirabad / ...), Sindh" -> "Nawabshah Sindh".
 * A long ladder label makes a poor search query. Pakistan-wide -> "Pakistan".
 */
export function queryPlace(where: string): string {
  if (/^pakistan/i.test(where.trim())) return "Pakistan";
  return where
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildQuery(t: RateTarget, where: string, year: string): string {
  const place = queryPlace(where);
  const tpl = t.search ?? `${t.label} price {where}`;
  // Say "Pakistan" once: the place is already "Pakistan" for the national pass.
  const tail = place === "Pakistan" ? year : `Pakistan ${year}`;
  return `${tpl.replace("{where}", place)} ${tail}`.replace(/\s+/g, " ").trim();
}

async function cloudflareLlm(prompt: string): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !token)
    throw new Error("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN not set.");
  const model = process.env.AI_RATE_CF_MODEL?.trim() || DEFAULT_CF_LLM;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 2500,
      }),
      signal: AbortSignal.timeout(timeoutMs()),
    },
  );
  if (!res.ok) {
    const d = await res.text().catch(() => "");
    throw new Error(
      `Cloudflare LLM failed (${res.status}): ${d.slice(0, 200)}`,
    );
  }
  const json = (await res.json()) as { result?: { response?: unknown } };
  const raw = json.result?.response;
  if (raw == null || raw === "")
    throw new Error("Cloudflare LLM returned no text.");
  // Llama on Workers AI may return a parsed array/object rather than a string.
  return typeof raw === "string" ? raw : JSON.stringify(raw);
}

export function buildExtractionPrompt(input: {
  today: string;
  gradeHint: string;
  where: string;
  targets: RateTarget[];
  evidence: string;
}): string {
  const keys = input.targets.map((t) => `"${t.itemType}"`).join(", ");
  return [
    `Today is ${input.today}. Target grade: ${input.gradeHint}. Target place: ${input.where}. A nearby city or a Pakistan-wide price is acceptable when the target place has none: set "scope" accordingly.`,
    `Use ONLY the search results below. Never guess from memory. If an item has no usable price in its results, leave that item out.`,
    `Each item below starts with "### <itemType>". In your answer, "itemType" MUST be exactly one of: ${keys}. Copy the key exactly. Never use a product name, brand or description as itemType.`,
    `The price must be the rate for the item as described, in the stated unit. The price of one component or product (for example one wire, one tile, one bag of something else) is NOT the item's rate. Convert only if the arithmetic is simple and stated in "note", starting the note with "DERIVED:".`,
    input.evidence,
    `Reply with ONLY a JSON array, no prose, no markdown. One element per item you found:`,
    `{"itemType": one of ${keys}, "price": number, "priceLocation": string (the place the price applies to), "scope": "city" | "nearby" | "national", "sourceName": string, "sourceUrl": string, "sourceDate": "YYYY-MM-DD" or "", "note": string}`,
    `"price" is a plain PKR number for the unit stated. If a range is given, use the midpoint and say so in "note". "sourceUrl" must be one of the URLs above. Use "city" only when the price is for the target place itself.`,
  ].join("\n\n");
}

export async function searchAndExtract(input: {
  city: string;
  /** Place to search for (from the fallback ladder). Defaults to the city. */
  place?: string;
  gradeHint: string;
  today: string;
  targets: RateTarget[];
}): Promise<SearchExtractResult> {
  const { city, gradeHint, today, targets } = input;
  const where = input.place?.trim() || city;
  const year = today.slice(0, 4);

  // One search per item so each gets focused results. A failed search is kept
  // (not hidden) so a bad key or an exhausted plan shows up as the real error.
  const perItem = await Promise.all(
    targets.map(async (t) => {
      try {
        return { target: t, results: await tavily(buildQuery(t, where, year)) };
      } catch (err) {
        return {
          target: t,
          results: [] as Awaited<ReturnType<typeof tavily>>,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  const failed = perItem.filter((p) => "error" in p && p.error);
  if (failed.length === perItem.length) {
    throw new Error(
      `every search failed. ${(failed[0] as { error: string }).error}`,
    );
  }

  const grounding = perItem.flatMap((p) =>
    p.results.map((r) => ({ url: r.url, title: r.title || null })),
  );

  const evidence = perItem
    .map(({ target, results }) => {
      const body = results
        .map(
          (r, i) =>
            `  [${i + 1}] ${r.title} | ${r.url}\n  ${String(r.content ?? "").slice(0, 600)}`,
        )
        .join("\n");
      const derive = target.derive ? ` ${target.derive}.` : "";
      return `### ${target.itemType}: ${target.ask} (unit "${target.unit}").${derive}\n${body || "  (no results)"}`;
    })
    .join("\n\n");

  const prompt = buildExtractionPrompt({
    today,
    gradeHint,
    where:
      queryPlace(where) === "Pakistan"
        ? "Pakistan"
        : `${queryPlace(where)}, Pakistan`,
    targets,
    evidence,
  });

  const text = await cloudflareLlm(prompt);
  return { text, grounding, prompt };
}
