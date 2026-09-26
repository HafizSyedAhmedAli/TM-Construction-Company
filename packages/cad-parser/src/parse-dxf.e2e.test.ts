import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import { parseDxfToGeometry } from "./parse-dxf";

describe("parseDxfToGeometry (real dxf-parser, real DXF file)", () => {
  const text = readFileSync("./fixtures/sample-house.dxf", "utf8");
  const geometry = parseDxfToGeometry(text);

  it("matches the hand-constructed fixture result", () => {
    expect(geometry.rooms).toHaveLength(3);
    expect(geometry.walls).toHaveLength(12);
    expect(geometry.openings).toHaveLength(2);

    const kitchen = geometry.rooms.find((r) => r.name === "Kitchen");
    expect(kitchen?.area).toBeCloseTo(240);
    expect(kitchen?.type).toBe("kitchen");
  });
});
