// packages/lead-intake/src/validate-lead.test.ts
import { describe, it, expect } from "vitest";
import { validateLeadIntake, CITIES } from "./validate-lead";

const validInput = {
  name: "Ahmed Raza",
  contact: "+92-300-1234567",
  city: "Hyderabad",
  model: 2,
  category: "B",
};

describe("validateLeadIntake — FR-3 required fields", () => {
  it("accepts a fully valid submission", () => {
    const result = validateLeadIntake(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it.each([
    ["name", { ...validInput, name: "" }],
    ["contact", { ...validInput, contact: "" }],
    ["city", { ...validInput, city: "" }],
  ])("flags missing %s", (field, input) => {
    const result = validateLeadIntake(input as any);
    expect(result.valid).toBe(false);
    expect(result.errors[field as string]).toBeDefined();
  });
});

describe("validateLeadIntake — FR-4 predefined lists", () => {
  it("rejects a city not in the predefined list", () => {
    const result = validateLeadIntake({ ...validInput, city: "Islamabad" });
    expect(result.valid).toBe(false);
    expect(result.errors.city).toMatch(/not a supported city/i);
  });

  it("rejects a model outside 1/2/3", () => {
    const result = validateLeadIntake({ ...validInput, model: 4 as any });
    expect(result.valid).toBe(false);
    expect(result.errors.model).toBeDefined();
  });

  it("rejects a category outside A/B/C", () => {
    const result = validateLeadIntake({ ...validInput, category: "D" as any });
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeDefined();
  });

  it("exposes the predefined city list for the form to render", () => {
    expect(CITIES).toContain("Hyderabad");
    expect(CITIES).toContain("Karachi");
  });
});
