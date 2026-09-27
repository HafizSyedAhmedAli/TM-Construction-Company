// packages/render-engine/src/schematic-svg.ts
import type { Geometry } from "@tmcc/shared-types";

const PX_PER_FT = 12;
const MARGIN_PX = 40;
const LEGEND_WIDTH_PX = 240;
const LEGEND_ROW_PX = 22;

interface BoundingBoxFt {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function wallBoundingBox(geometry: Geometry): BoundingBoxFt {
  const xs = geometry.walls.flatMap((w) => [w.startX, w.endX]);
  const ys = geometry.walls.flatMap((w) => [w.startY, w.endY]);
  if (xs.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Renders the parsed geometry as a plain top-down wall-skeleton schematic —
// this is the "image" half of the image-edit call in generate-render.ts,
// standing in for the dimensioned floor-plan image the client's own example
// used. Walls are placed accurately (Wall carries real startX/Y/endX/Y from
// dxf-to-geometry.ts). Rooms are NOT: @tmcc/shared-types' Room only carries
// an aggregate `area`, no position — dxf-to-geometry.ts computes each
// room's polygon and label point while parsing, then discards them once it
// reduces to { area }. So room names/areas are drawn as a side legend here,
// not placed inside their actual outlines. To draw them in-place, add an
// optional labelX/labelY to Room in shared-types and pass through
// `label.startPoint` in dxf-to-geometry.ts, which already has it in hand.
export function buildSchematicSvg(geometry: Geometry): string {
  const box = wallBoundingBox(geometry);
  const widthFt = Math.max(box.maxX - box.minX, 1);
  const heightFt = Math.max(box.maxY - box.minY, 1);
  const planWidthPx = widthFt * PX_PER_FT;
  const planHeightPx = heightFt * PX_PER_FT;

  const svgWidth = planWidthPx + MARGIN_PX * 2 + LEGEND_WIDTH_PX;
  const svgHeight = Math.max(
    planHeightPx + MARGIN_PX * 2,
    MARGIN_PX * 2 + geometry.rooms.length * LEGEND_ROW_PX,
  );

  const toSvgX = (ftX: number) => MARGIN_PX + (ftX - box.minX) * PX_PER_FT;
  // CAD Y grows upward; SVG Y grows downward — flip it.
  const toSvgY = (ftY: number) => MARGIN_PX + (box.maxY - ftY) * PX_PER_FT;

  const wallLines = geometry.walls
    .map((wall) => {
      const x1 = toSvgX(wall.startX).toFixed(1);
      const y1 = toSvgY(wall.startY).toFixed(1);
      const x2 = toSvgX(wall.endX).toFixed(1);
      const y2 = toSvgY(wall.endY).toFixed(1);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1a1a1a" stroke-width="3" stroke-linecap="square" />`;
    })
    .join("\n  ");

  const legendX = planWidthPx + MARGIN_PX * 2;
  const legendItems = geometry.rooms
    .map((room, i) => {
      const y = MARGIN_PX + 16 + i * LEGEND_ROW_PX;
      const label = `${room.name} — ${Math.round(room.area)} sq ft`;
      return `<text x="${legendX}" y="${y}" font-family="sans-serif" font-size="13" fill="#1a1a1a">${escapeXml(label)}</text>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#ffffff" />
  ${wallLines}
  <text x="${legendX}" y="${MARGIN_PX - 8}" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1a1a1a">Rooms</text>
  ${legendItems}
</svg>`;
}
