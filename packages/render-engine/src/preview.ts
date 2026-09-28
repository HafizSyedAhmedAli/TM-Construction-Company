import { writeFileSync } from "node:fs";
import { buildIsometricPng } from "./isometric-png";

const wall = (id: string, x1: number, y1: number, x2: number, y2: number) => ({
  id,
  startX: x1,
  startY: y1,
  endX: x2,
  endY: y2,
  length: Math.hypot(x2 - x1, y2 - y1),
  height: 10,
  thickness: 0.75,
});

const png = await buildIsometricPng({
  walls: [
    wall("1", 0, 0, 30, 0),
    wall("2", 30, 0, 30, 20),
    wall("3", 30, 20, 0, 20),
    wall("4", 0, 20, 0, 0),
    wall("5", 15, 0, 15, 12),
    wall("6", 0, 12, 15, 12),
  ],
  rooms: [],
  openings: [],
});
writeFileSync("preview.png", png);
