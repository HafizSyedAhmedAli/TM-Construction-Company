// packages/render-engine/src/schematic-png.ts
import sharp from "sharp";
import type { Geometry } from "@tmcc/shared-types";
import { buildSchematicSvg } from "./schematic-svg";

// Gemini's image-edit input needs an actual bitmap, not vector SVG (see
// generate-render.ts) — sharp rasterizes via its bundled librsvg backend,
// so no headless browser/canvas dependency is needed for this step.
export async function buildSchematicPng(geometry: Geometry): Promise<Buffer> {
  const svg = buildSchematicSvg(geometry);
  return sharp(Buffer.from(svg)).png().toBuffer();
}
