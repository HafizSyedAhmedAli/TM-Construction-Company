import type { RateCardItem } from "@tmcc/shared-types";
import { RATE_TARGETS, RateTarget } from "./rate-targets";

export type RateScope = "city" | "nearby" | "national";
export interface RateSource {
  itemType: string;
  /** Where the price actually applies (may be a nearby market or Pakistan-wide). */
  priceLocation: string | null;
  scope: RateScope | null;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceDate: string | null; // YYYY-MM-DD
  note: string | null;
}

export interface ParsedRates {
  items: RateCardItem[];
  sources: RateSource[];
  warnings: string[];
}

const STALE_AFTER_DAYS = 90;
const DAY_MS = 86_400_000;

// Finds the first balanced [...] in the text that parses as JSON. Tolerates
// code fences, prose around the array, and "[" / "]" inside string values.
function extractJsonArray(text: string): unknown[] {
  const clean = text.replace(/```(?:json)?/gi, "");
  for (
    let start = clean.indexOf("[");
    start !== -1;
    start = clean.indexOf("[", start + 1)
  ) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < clean.length; i++) {
      const ch = clean[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === "[") depth++;
      else if (ch === "]" && --depth === 0) {
        try {
          const parsed = JSON.parse(clean.slice(start, i + 1));
          if (Array.isArray(parsed)) return parsed;
        } catch {
          /* try the next "[" */
        }
        break;
      }
    }
  }
  throw new Error("Gemini's reply contained no valid JSON array");
}

function toPrice(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v.replace(/[,\s]/g, "")) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0
    ? Math.round(n * 100) / 100
    : null;
}

const str = (v: unknown) =>
  typeof v === "string" && v.trim() ? v.trim() : null;

// Gemini can't return structured JSON mode while the search tool is on,
// so we ask for JSON in plain text and validate every field ourselves.
export function parseRateResearch(
  text: string,
  now: Date = new Date(),
  targets: RateTarget[] = RATE_TARGETS,
): ParsedRates {
  const rows = extractJsonArray(text);
  const items: RateCardItem[] = [];
  const sources: RateSource[] = [];
  const warnings: string[] = [];

  for (const raw of rows) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const target = targets.find((t) => t.itemType === r.itemType);
    if (!target) {
      warnings.push(`Ignored unknown item "${String(r.itemType)}"`);
      continue;
    }
    if (items.some((i) => i.itemType === target.itemType)) {
      warnings.push(`Ignored duplicate ${target.label}`);
      continue;
    }
    const price = toPrice(r.price);
    if (price === null) {
      warnings.push(`${target.label}: no usable price`);
      continue;
    }
    if (price < target.min || price > target.max) {
      warnings.push(
        `${target.label}: PKR ${price} is outside the plausible range, dropped`,
      );
      continue;
    }

    const url = str(r.sourceUrl);
    const validUrl = url && /^https?:\/\//i.test(url) ? url : null;
    if (!validUrl) warnings.push(`${target.label}: no source link`);

    const dateStr = str(r.sourceDate);
    const validDate =
      dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : null;
    if (
      validDate &&
      now.getTime() - Date.parse(validDate) > STALE_AFTER_DAYS * DAY_MS
    ) {
      warnings.push(
        `${target.label}: source is older than ${STALE_AFTER_DAYS} days`,
      );
    }

    const scopeRaw = str(r.scope)?.toLowerCase();
    const scope: RateScope | null =
      scopeRaw === "city" || scopeRaw === "nearby" || scopeRaw === "national"
        ? scopeRaw
        : null;
    const priceLocation = str(r.priceLocation);
    if (scope === "nearby" || scope === "national") {
      warnings.push(
        `${target.label}: ${scope === "national" ? "Pakistan-wide" : "nearby-market"} price${priceLocation ? ` (${priceLocation})` : ""}, not the city's own`,
      );
    }
    if (str(r.note)?.toUpperCase().startsWith("DERIVED")) {
      warnings.push(`${target.label}: derived from unit rates, please verify`);
    }

    items.push({
      itemType: target.itemType,
      unit: target.unit,
      unitRate: price,
    });
    sources.push({
      itemType: target.itemType,
      sourceName: str(r.sourceName),
      sourceUrl: validUrl,
      sourceDate: validDate,
      note: str(r.note),
      priceLocation,
      scope,
    });
  }

  for (const t of targets) {
    if (!items.some((i) => i.itemType === t.itemType))
      warnings.push(`No price found for ${t.label}`);
  }
  return { items, sources, warnings };
}
