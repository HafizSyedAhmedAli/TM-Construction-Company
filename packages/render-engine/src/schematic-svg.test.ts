// packages/render-engine/src/schematic-svg.test.ts
import { describe, it, expect } from "vitest";
import { buildSchematicSvg } from "./schematic-svg";
import type { Geometry } from "@tmcc/shared-types";

const rectangleHouse: Geometry = {
  walls: [
    {
      id: "w1",
      startX: 0,
      startY: 0,
      endX: 20,
      endY: 0,
      length: 20,
      height: 10,
      thickness: 0.75,
    },
    {
      id: "w2",
      startX: 20,
      startY: 0,
      endX: 20,
      endY: 15,
      length: 15,
      height: 10,
      thickness: 0.75,
    },
    {
      id: "w3",
      startX: 20,
      startY: 15,
      endX: 0,
      endY: 15,
      length: 20,
      height: 10,
      thickness: 0.75,
    },
    {
      id: "w4",
      startX: 0,
      startY: 15,
      endX: 0,
      endY: 0,
      length: 15,
      height: 10,
      thickness: 0.75,
    },
  ],
  rooms: [
    { id: "r1", name: "Living Room", area: 209, type: "general" },
    { id: "r2", name: 'Bath "1"', area: 40, type: "bathroom" },
  ],
  openings: [],
};

describe("buildSchematicSvg", () => {
  it("draws one <line> per wall segment", () => {
    const svg = buildSchematicSvg(rectangleHouse);
    const lineCount = (svg.match(/<line /g) ?? []).length;
    expect(lineCount).toBe(rectangleHouse.walls.length);
  });

  it("produces a valid, positively-sized viewBox", () => {
    const svg = buildSchematicSvg(rectangleHouse);
    const match = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    expect(match).not.toBeNull();
    const [, w, h] = match!;
    expect(Number(w)).toBeGreaterThan(0);
    expect(Number(h)).toBeGreaterThan(0);
  });

  it("lists every room's name and rounded area in the legend", () => {
    const svg = buildSchematicSvg(rectangleHouse);
    expect(svg).toContain("Living Room — 209 sq ft");
    expect(svg).toContain("40 sq ft");
  });

  it("escapes XML-unsafe characters in room names", () => {
    const svg = buildSchematicSvg(rectangleHouse);
    expect(svg).toContain("Bath &quot;1&quot;");
    expect(svg).not.toContain('Bath "1"');
  });

  it("doesn't throw and still returns a valid SVG for empty geometry (no walls or rooms)", () => {
    const empty: Geometry = { walls: [], rooms: [], openings: [] };
    const svg = buildSchematicSvg(empty);
    expect(svg).toContain("<svg");
    expect(svg.match(/<line /g)).toBeNull();
  });
});
