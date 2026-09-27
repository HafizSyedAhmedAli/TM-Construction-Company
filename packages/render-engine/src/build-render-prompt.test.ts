// packages/render-engine/src/build-render-prompt.test.ts
import { describe, it, expect } from "vitest";
import { buildRenderPrompt } from "./build-render-prompt";
import type { Geometry } from "@tmcc/shared-types";

const twoRoomHouse: Geometry = {
  walls: [],
  rooms: [
    { id: "r1", name: "Kitchen", area: 47.4, type: "kitchen" },
    { id: "r2", name: "Living Room", area: 209, type: "general" },
  ],
  openings: [],
};

describe("buildRenderPrompt", () => {
  it("lists every room with its name and rounded area", () => {
    const prompt = buildRenderPrompt(twoRoomHouse, "B");
    expect(prompt).toContain("Kitchen (47 sq ft)");
    expect(prompt).toContain("Living Room (209 sq ft)");
  });

  it("describes an empty plan without listing rooms", () => {
    const empty: Geometry = { walls: [], rooms: [], openings: [] };
    const prompt = buildRenderPrompt(empty, "A");
    expect(prompt).toContain("open floor plan");
  });

  it("varies the finish description by category", () => {
    const a = buildRenderPrompt(twoRoomHouse, "A");
    const c = buildRenderPrompt(twoRoomHouse, "C");
    expect(a).toContain("premium");
    expect(c).toContain("economy");
    expect(a).not.toBe(c);
  });

  it("always asks for a dollhouse-style isometric render, regardless of category", () => {
    for (const category of ["A", "B", "C"] as const) {
      expect(buildRenderPrompt(twoRoomHouse, category)).toMatch(/dollhouse/i);
    }
  });
});
