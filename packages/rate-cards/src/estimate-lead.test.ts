import { describe, it, expect } from "vitest";
import { estimateLead } from "./estimate-lead";

describe("estimateLead", () => {
  it("returns a positive total for a known city/category/model", () => {
    const result = estimateLead({ city: "Karachi", category: "B", model: 2 });
    expect(result).not.toBeNull();
    expect(result!.total).toBeGreaterThan(0);
    expect(result!.tax).toBeCloseTo(result!.subtotal * 0.17, 2);
  });

  it("returns null for a city with no rate card", () => {
    expect(
      estimateLead({ city: "Multan", category: "B", model: 2 }),
    ).toBeNull();
  });

  it("scales up with a higher category (better materials cost more)", () => {
    const b = estimateLead({ city: "Karachi", category: "B", model: 2 })!;
    const a = estimateLead({ city: "Karachi", category: "A", model: 2 })!;
    expect(a.total).toBeGreaterThan(b.total);
  });
});
