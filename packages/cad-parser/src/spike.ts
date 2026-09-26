import fs from "fs";
import DxfParser from "dxf-parser";

const parser = new DxfParser();
const fileText = fs.readFileSync("./fixtures/sample-house.dxf", "utf8");
const dxf = parser.parseSync(fileText);

console.log("--- Layers found ---");
console.log(Object.keys(dxf.tables.layer.layers));

console.log("\n--- Entity types and counts ---");
const counts: Record<string, number> = {};
for (const e of dxf.entities) {
  counts[e.type] = (counts[e.type] || 0) + 1;
}
console.log(counts);

console.log("\n--- LWPOLYLINE entities (candidate walls) ---");
for (const e of dxf.entities.filter((e: any) => e.type === "LWPOLYLINE")) {
  console.log(
    "layer:",
    e.layer,
    "| vertices:",
    e.vertices.map((v: any) => `(${v.x},${v.y})`).join(" "),
  );
}

console.log("\n--- TEXT entities (candidate room labels) ---");
for (const e of dxf.entities.filter((e: any) => e.type === "TEXT")) {
  console.log(
    "layer:",
    e.layer,
    "| text:",
    JSON.stringify(e.text),
    "| position:",
    e.startPoint,
  );
}
