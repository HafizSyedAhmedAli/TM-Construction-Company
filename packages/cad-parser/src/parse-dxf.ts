// packages/cad-parser/src/parse-dxf.ts
import DxfParser from "dxf-parser";
import type { Geometry } from "@tmcc/shared-types";
import { dxfToGeometry, type RawEntity } from "./dxf-to-geometry";

export function parseDxfToGeometry(dxfText: string): Geometry {
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfText);
  if (!dxf) {
    throw new Error(
      "dxf-parser returned no result — the file may be malformed or empty.",
    );
  }
  // dxf-parser types each entity's `type` field as a plain `string`, not
  // the literal union its own runtime values actually use, so this cast
  // bridges a gap in the library's own types rather than papering over
  // something we're unsure of.
  return dxfToGeometry({
    entities: (dxf.entities ?? []) as unknown as RawEntity[],
  });
}
