import { describe, it, expect } from "vitest";
import { parseRateResearch } from "./parse-research";

const NOW = new Date("2026-09-28");
const row = (o: object) => ({
  itemType: "cement",
  price: 1400,
  sourceName: "Shop",
  sourceUrl: "https://example.com/c",
  sourceDate: "2026-09-20",
  ...o,
});
const wrap = (rows: object[]) => "```json\n" + JSON.stringify(rows) + "\n```";

describe("parseRateResearch", () => {
  it("parses fenced JSON into rate items with sources", () => {
    const r = parseRateResearch(wrap([row({})]), NOW);
    expect(r.items).toEqual([
      { itemType: "cement", unit: "bag", unitRate: 1400 },
    ]);
    expect(r.sources[0]).toMatchObject({
      sourceUrl: "https://example.com/c",
      sourceDate: "2026-09-20",
    });
  });
  it("accepts prices written as strings with commas", () => {
    const r = parseRateResearch(
      wrap([row({ itemType: "steelMaterial", price: "265,000" })]),
      NOW,
    );
    expect(r.items[0].unitRate).toBe(265000);
  });
  it("drops implausible prices with a warning", () => {
    const r = parseRateResearch(wrap([row({ price: 50 })]), NOW);
    expect(r.items).toEqual([]);
    expect(r.warnings.join()).toMatch(/outside the plausible range/);
  });
  it("keeps the price but nulls a non-http source link and warns", () => {
    const r = parseRateResearch(
      wrap([row({ sourceUrl: "javascript:alert(1)" })]),
      NOW,
    );
    expect(r.items).toHaveLength(1);
    expect(r.sources[0].sourceUrl).toBeNull();
    expect(r.warnings.join()).toMatch(/no source link/);
  });
  it("warns about stale sources", () => {
    const r = parseRateResearch(wrap([row({ sourceDate: "2026-01-01" })]), NOW);
    expect(r.warnings.join()).toMatch(/older than 90 days/);
  });
  it("warns about items it found nothing for", () => {
    const r = parseRateResearch(wrap([row({})]), NOW);
    expect(r.warnings.join()).toMatch(/No price found for Bricks/);
  });
  it("ignores unknown and duplicate items", () => {
    const r = parseRateResearch(
      wrap([row({}), row({ price: 1500 }), row({ itemType: "gold" })]),
      NOW,
    );
    expect(r.items).toHaveLength(1);
    expect(r.items[0].unitRate).toBe(1400);
  });
  it("throws on non-JSON replies", () => {
    expect(() =>
      parseRateResearch("Sorry, I could not find that.", NOW),
    ).toThrow();
    expect(() => parseRateResearch("[not json]", NOW)).toThrow(/valid JSON/);
  });
});

it("accepts an already-parsed array or wrapped object (Workers AI)", () => {
  const rows = [row({})];
  expect(parseRateResearch(rows, NOW).items).toHaveLength(1);
  expect(parseRateResearch({ items: rows }, NOW).items).toHaveLength(1);
});