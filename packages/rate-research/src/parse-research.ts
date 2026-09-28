import type { RateCardItem } from "@tmcc/shared-types";
import { RATE_TARGETS } from "./rate-targets";

export interface RateSource {
  itemType: string;
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

function extractJsonArray(text: string): unknown[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start)
    throw new Error("Gemini's reply contained no JSON array");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("Gemini's reply was not valid JSON");
  }
  if (!Array.isArray(parsed))
    throw new Error("Gemini's reply was not a JSON array");
  return parsed;
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
): ParsedRates {
  const rows = extractJsonArray(text);
  const items: RateCardItem[] = [];
  const sources: RateSource[] = [];
  const warnings: string[] = [];

  for (const raw of rows) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const target = RATE_TARGETS.find((t) => t.itemType === r.itemType);
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
    });
  }

  for (const t of RATE_TARGETS) {
    if (!items.some((i) => i.itemType === t.itemType))
      warnings.push(`No price found for ${t.label}`);
  }
  return { items, sources, warnings };
}
