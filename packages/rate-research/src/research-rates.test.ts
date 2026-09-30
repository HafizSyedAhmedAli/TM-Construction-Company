import { describe, it, expect, vi, beforeEach } from "vitest";

const searchMock = vi.fn();
vi.mock("./search-provider", () => ({
  searchAndExtract: (...a: unknown[]) => searchMock(...a),
}));

import { researchRates, RATE_PROVIDER_LABEL } from "./research-rates";

const reply = JSON.stringify([
  {
    itemType: "cement",
    price: 1400,
    sourceName: "Shop",
    sourceUrl: "https://example.com",
    sourceDate: "2026-09-20",
    note: "",
  },
]);
const grounding = [{ url: "https://example.com", title: "example.com" }];

describe("researchRates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns parsed items with grounding sources", async () => {
    searchMock.mockResolvedValue({ text: reply, grounding, prompt: "p" });
    const r = await researchRates({
      city: "Nawabshah",
      category: "B",
      now: new Date("2026-09-28"),
    });
    expect(r.items).toEqual([
      { itemType: "cement", unit: "bag", unitRate: 1400 },
    ]);
    expect(r.sources.grounding).toHaveLength(1);
    expect(r.sources.model).toBe(RATE_PROVIDER_LABEL);
  });

  it("warns loudly when the search returned no sources", async () => {
    searchMock.mockResolvedValue({ text: reply, grounding: [], prompt: "p" });
    const r = await researchRates({ city: "Karachi", category: "B" });
    expect(r.sources.warnings[0]).toMatch(/no sources/);
  });

  it("throws when nothing usable comes back", async () => {
    searchMock.mockResolvedValue({ text: "[]", grounding, prompt: "p" });
    await expect(
      researchRates({ city: "Multan", category: "C" }),
    ).rejects.toThrow(/no usable prices/);
  });

  it("passes the first place from the ladder to the search", async () => {
    searchMock.mockResolvedValue({ text: reply, grounding, prompt: "p" });
    await researchRates({
      city: "Karachi",
      category: "B",
      places: ["Pakistan (national average)"],
    });
    expect(searchMock.mock.calls[0][0].place).toBe(
      "Pakistan (national average)",
    );
  });
});
