import type { Geometry } from "@tmcc/shared-types";

export const MATERIAL_ASSUMPTIONS = {
  referenceThicknessFt: 0.75, // 9 in wall
  bricksPerSqftFaceAtReference: 13.5,
  cementBagsPer1000Bricks: 5,
  sandCftPer1000Bricks: 30,
  plasterCementBagsPerSqft: 0.04,
  plasterSandCftPerSqft: 0.12,
  steelKgPerSqft: 4, // same rule of thumb as steelFixing
} as const;

const A = MATERIAL_ASSUMPTIONS;

export function wallFaceArea(g: Geometry): number {
  return g.walls.reduce((s, w) => s + w.length * w.height, 0);
}

export function floorArea(g: Geometry): number {
  return g.rooms.reduce((s, r) => s + r.area, 0);
}

// Bricks scale linearly with wall thickness (4.5 in wall = half the bricks).
export function brickCount(g: Geometry): number {
  const bricks = g.walls.reduce(
    (s, w) =>
      s +
      w.length *
        w.height *
        A.bricksPerSqftFaceAtReference *
        (w.thickness / A.referenceThicknessFt),
    0,
  );
  return Math.ceil(bricks);
}

// Matches the existing plaster basis in calculate-boq (both faces).
function plasterArea(g: Geometry): number {
  return wallFaceArea(g) * 2;
}

export function cementBags(g: Geometry): number {
  const raw =
    (brickCount(g) / 1000) * A.cementBagsPer1000Bricks +
    plasterArea(g) * A.plasterCementBagsPerSqft;
  return Math.ceil(raw); // whole bags only
}

export function sandCft(g: Geometry): number {
  const raw =
    (brickCount(g) / 1000) * A.sandCftPer1000Bricks +
    plasterArea(g) * A.plasterSandCftPerSqft;
  return Math.round(raw * 100) / 100;
}

export function steelMaterialTons(g: Geometry): number {
  return (floorArea(g) * A.steelKgPerSqft) / 1000;
}
