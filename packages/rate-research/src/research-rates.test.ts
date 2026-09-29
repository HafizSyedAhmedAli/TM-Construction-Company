import { describe, it, expect, vi, beforeEach } from "vitest";

const generateTextMock = vi.fn();
vi.mock("ai", () => ({
  generateText: (...a: unknown[]) => generateTextMock(...a),
}));
const googleMock = vi.fn((id: string, s: unknown) => ({ modelId: id, s }));
vi.mock("@ai-sdk/google", () => ({
  google: (id: string, s: unknown) => googleMock(id, s),
}));

import { DEFAULT_RATE_MODEL, researchRates } from "./research-rates";

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
const sources = [
  {
    sourceType: "url",
    id: "1",
    url: "https://vertexaisearch.example/x",
    title: "example.com",
  },
];

describe("researchRates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_RATE_MODEL;
  });

  it("turns search grounding on and returns a draft with grounding sources", async () => {
    generateTextMock.mockResolvedValue({ text: reply, sources });
    const r = await researchRates({
      city: "Nawabshah",
      category: "B",
      now: new Date("2026-09-28"),
    });
    expect(googleMock).toHaveBeenCalledWith(DEFAULT_RATE_MODEL, {
      useSearchGrounding: true,
    });
    expect(r.items).toEqual([
      { itemType: "cement", unit: "bag", unitRate: 1400 },
    ]);
    expect(r.sources.grounding).toHaveLength(1);
    expect(r.promptUsed).toContain("Nawabshah");
  });

  it("honours AI_RATE_MODEL and ignores a blank one", async () => {
    generateTextMock.mockResolvedValue({ text: reply, sources });
    process.env.AI_RATE_MODEL = "custom-model";
    await researchRates({ city: "Karachi", category: "A" });
    expect(googleMock).toHaveBeenLastCalledWith("custom-model", {
      useSearchGrounding: true,
    });
    process.env.AI_RATE_MODEL = "  ";
    await researchRates({ city: "Karachi", category: "A" });
    expect(googleMock).toHaveBeenLastCalledWith(DEFAULT_RATE_MODEL, {
      useSearchGrounding: true,
    });
  });

  it("warns loudly when Gemini used no search sources", async () => {
    generateTextMock.mockResolvedValue({ text: reply, sources: [] });
    const r = await researchRates({ city: "Karachi", category: "B" });
    expect(r.sources.warnings[0]).toMatch(/no search sources/);
  });

  it("throws when nothing usable comes back", async () => {
    generateTextMock.mockResolvedValue({ text: "[]", sources });
    await expect(
      researchRates({ city: "Multan", category: "C" }),
    ).rejects.toThrow(/no usable prices/);
  });
});

describe("researchRates prose recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateTextMock.mockReset();
  });

  it("asks the model to reformat when the reply has no JSON array", async () => {
    generateTextMock
      .mockResolvedValueOnce({
        text: "I found cement at Rs 1,400 per bag on example.com.",
        sources,
      })
      .mockResolvedValueOnce({ text: reply, sources: [] });
    const r = await researchRates({ city: "Hyderabad", category: "B" });
    expect(generateTextMock).toHaveBeenCalledTimes(2);
    expect(r.items).toEqual([
      { itemType: "cement", unit: "bag", unitRate: 1400 },
    ]);
  });
});
