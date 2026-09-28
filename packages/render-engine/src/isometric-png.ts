import sharp from "sharp";
import type { Geometry, Wall } from "@tmcc/shared-types";

const COS30 = Math.cos(Math.PI / 6);
const OUTPUT_PX = 1024;
const MARGIN_PX = 60;
// Walls on the two edges nearest the camera are cut low so the
// interior is visible (the "dollhouse" cutaway).
const FRONT_WALL_HEIGHT_RATIO = 0.12;

const COLORS = {
  background: "#ffffff",
  floor: "#e6e2d9",
  top: "#f7f7f7",
  faceLight: "#d0d0d0",
  faceDark: "#a9a9a9",
  stroke: "#6b6b6b",
};

type P2 = [number, number];
interface Face {
  pts: P2[];
  fill: string;
}

// Isometric projection. Larger screen-y = nearer the camera.
function project(x: number, y: number, z: number): P2 {
  return [(x - y) * COS30, (x + y) * 0.5 - z];
}

// Assumption: units are feet. If thickness looks like inches (> 3),
// convert it. Adjust if your parser uses different units.
function normalizedThickness(t: number): number {
  const ft = t > 3 ? t / 12 : t;
  return Math.min(Math.max(ft, 0.4), 1.5);
}

function wallFaces(wall: Wall, height: number): Face[] {
  const dx = wall.endX - wall.startX;
  const dy = wall.endY - wall.startY;
  const len = Math.hypot(dx, dy);
  if (len === 0) return [];

  const half = normalizedThickness(wall.thickness) / 2;
  const nx = (-dy / len) * half;
  const ny = (dx / len) * half;

  const corners: P2[] = [
    [wall.startX + nx, wall.startY + ny],
    [wall.endX + nx, wall.endY + ny],
    [wall.endX - nx, wall.endY - ny],
    [wall.startX - nx, wall.startY - ny],
  ];
  const cx = (wall.startX + wall.endX) / 2;
  const cy = (wall.startY + wall.endY) / 2;

  const faces: Face[] = [];
  for (let i = 0; i < 4; i++) {
    const p = corners[i];
    const q = corners[(i + 1) % 4];
    const ox = (p[0] + q[0]) / 2 - cx;
    const oy = (p[1] + q[1]) / 2 - cy;
    if (ox + oy <= 0) continue; // faces pointing away from camera
    faces.push({
      pts: [
        project(p[0], p[1], 0),
        project(q[0], q[1], 0),
        project(q[0], q[1], height),
        project(p[0], p[1], height),
      ],
      fill: Math.abs(ox) > Math.abs(oy) ? COLORS.faceLight : COLORS.faceDark,
    });
  }
  faces.push({
    pts: corners.map(([x, y]) => project(x, y, height)),
    fill: COLORS.top,
  });
  return faces;
}

export function buildIsometricSvg(geometry: Geometry): string {
  const walls = geometry.walls;
  const xs = walls.flatMap((w) => [w.startX, w.endX]);
  const ys = walls.flatMap((w) => [w.startY, w.endY]);
  if (xs.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_PX}" height="${OUTPUT_PX}"><rect width="100%" height="100%" fill="${COLORS.background}"/></svg>`;
  }
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const edgeTol = 0.75;

  const isFrontWall = (w: Wall) =>
    (Math.abs(w.startX - maxX) < edgeTol &&
      Math.abs(w.endX - maxX) < edgeTol) ||
    (Math.abs(w.startY - maxY) < edgeTol && Math.abs(w.endY - maxY) < edgeTol);

  // Painter's algorithm: far walls first, near walls last.
  const sorted = [...walls].sort(
    (a, b) =>
      a.startX +
      a.endX +
      a.startY +
      a.endY -
      (b.startX + b.endX + b.startY + b.endY),
  );

  const floor: Face = {
    pts: [
      project(minX, minY, 0),
      project(maxX, minY, 0),
      project(maxX, maxY, 0),
      project(minX, maxY, 0),
    ],
    fill: COLORS.floor,
  };

  const faces: Face[] = [floor];
  for (const wall of sorted) {
    const full = wall.height > 0 ? wall.height : 10;
    const h = isFrontWall(wall) ? full * FRONT_WALL_HEIGHT_RATIO : full;
    faces.push(...wallFaces(wall, h));
  }

  // Fit into a centered square canvas.
  const all = faces.flatMap((f) => f.pts);
  const sxMin = Math.min(...all.map((p) => p[0]));
  const sxMax = Math.max(...all.map((p) => p[0]));
  const syMin = Math.min(...all.map((p) => p[1]));
  const syMax = Math.max(...all.map((p) => p[1]));
  const w = Math.max(sxMax - sxMin, 1);
  const h = Math.max(syMax - syMin, 1);
  const scale = (OUTPUT_PX - MARGIN_PX * 2) / Math.max(w, h);
  const offX = (OUTPUT_PX - w * scale) / 2 - sxMin * scale;
  const offY = (OUTPUT_PX - h * scale) / 2 - syMin * scale;

  const polys = faces
    .map((f) => {
      const pts = f.pts
        .map(
          ([x, y]) =>
            `${(x * scale + offX).toFixed(1)},${(y * scale + offY).toFixed(1)}`,
        )
        .join(" ");
      return `<polygon points="${pts}" fill="${f.fill}" stroke="${COLORS.stroke}" stroke-width="1" stroke-linejoin="round"/>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_PX}" height="${OUTPUT_PX}" viewBox="0 0 ${OUTPUT_PX} ${OUTPUT_PX}">
  <rect width="100%" height="100%" fill="${COLORS.background}"/>
  ${polys}
</svg>`;
}

export async function buildIsometricPng(geometry: Geometry): Promise<Buffer> {
  return sharp(Buffer.from(buildIsometricSvg(geometry)))
    .png()
    .toBuffer();
}
