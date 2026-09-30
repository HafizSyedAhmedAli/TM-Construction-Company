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
    body: JSON.stringify({ query, search_depth: "basic", max_results: 5 }),
    signal: AbortSignal.timeout(timeoutMs()),
  });
  if (!res.ok) throw new Error(`Tavily failed (${res.status})`);
  const json = (await res.json()) as {
    results?: { title: string; url: string; content: string }[];
  };
  return json.results ?? [];
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

  // One search per item so each gets focused results.
  const perItem = await Promise.all(
    targets.map(async (t) => {
      const results = await tavily(
        `${t.label} price ${where} Pakistan ${today.slice(0, 4)}`,
      ).catch(() => []);
      return { target: t, results };
    }),
  );

  const grounding = perItem.flatMap((p) =>
    p.results.map((r) => ({ url: r.url, title: r.title || null })),
  );

  const evidence = perItem
    .map(({ target, results }) => {
      const body = results
        .map(
          (r, i) =>
            `  [${i + 1}] ${r.title} | ${r.url}\n  ${String(r.content ?? "").slice(0, 500)}`,
        )
        .join("\n");
      const derive = target.derive ? ` ${target.derive}.` : "";
      return `### ${target.itemType}: ${target.ask} (unit "${target.unit}").${derive}\n${body || "  (no results)"}`;
    })
    .join("\n\n");

  const prompt = [
    `Today is ${today}. Target grade: ${gradeHint}. Target place: ${where}, Pakistan. A nearby city or a Pakistan-wide price is acceptable; say which in "note".`,
    `Use ONLY the search results below. Never guess from memory. If an item has no usable price in its results, omit it.`,
    evidence,
    `Reply with ONLY a JSON array, no prose, no markdown. Each element:`,
    `{"itemType": string, "price": number, "sourceName": string, "sourceUrl": string, "sourceDate": "YYYY-MM-DD" or "", "note": string}`,
    `"price" is a plain PKR number for the unit stated. If a range is given, use the midpoint and say so in "note". "sourceUrl" must be one of the URLs above.`,
  ].join("\n\n");

  const text = await cloudflareLlm(prompt);
  return { text, grounding, prompt };
}
