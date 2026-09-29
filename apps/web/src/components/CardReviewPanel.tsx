"use client";

import { useState, type ChangeEvent } from "react";
import type {
  BOQResult,
  Geometry,
  Room,
  RoomType,
  Wall,
} from "@tmcc/shared-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import Link from "next/link";
import { BoqTable } from "./BoqTable";

interface CadReviewPanelProps {
  projectId: string;
  /** Whatever was already saved on this project, so a page refresh doesn't
   * throw away an earlier upload/correction/finalize. */
  initialGeometry?: Geometry | null;
  initialBoq?: BOQResult | null;
  /** Called after a successful upload so the parent (which owns the
   * render-availability check) knows a CAD file now exists. */
  onGeometryUploaded?: () => void;
  /** Called whenever the BOQ is calculated (BOQResult) or invalidated (null). */
  onBoqChange?: (boq: BOQResult | null) => void;
}

type Status = "idle" | "uploading" | "reviewing" | "saving" | "calculating";

// FR-8/9/10/11/12/13: upload a DXF, let office staff correct what the parser
// extracted, then price the corrected geometry. This talks to routes that
// read/write a Project's one CadFile — it has no concept of picking a
// project; the page embedding this decides which project's ID to pass in.
export function CadReviewPanel({
  projectId,
  initialGeometry = null,
  initialBoq = null,
  onGeometryUploaded,
  onBoqChange,
}: CadReviewPanelProps) {
  const [geometry, setGeometry] = useState<Geometry | null>(initialGeometry);
  const [boq, setBoq] = useState<BOQResult | null>(initialBoq);
  const [status, setStatus] = useState<Status>(
    initialGeometry ? "reviewing" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setError(null);
    setBoq(null);
    onBoqChange?.(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/projects/${projectId}/cad-upload`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed.");
      setGeometry(body.geometry as Geometry);
      setStatus("reviewing");
      onGeometryUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("idle");
    } finally {
      e.target.value = ""; // allow re-uploading a corrected file of the same name
    }
  }

  function updateRoom(index: number, patch: Partial<Room>) {
    setGeometry((g) =>
      g
        ? {
            ...g,
            rooms: g.rooms.map((r, i) =>
              i === index ? { ...r, ...patch } : r,
            ),
          }
        : g,
    );
  }

  function updateWall(index: number, patch: Partial<Wall>) {
    setGeometry((g) =>
      g
        ? {
            ...g,
            walls: g.walls.map((w, i) =>
              i === index ? { ...w, ...patch } : w,
            ),
          }
        : g,
    );
  }

  async function handleSaveCorrections() {
    if (!geometry) return;
    setStatus("saving");
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/geometry`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geometry),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save corrections.");
      setBoq(null); // a correction invalidates any BOQ already on screen
      onBoqChange?.(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save corrections.",
      );
    } finally {
      setStatus("reviewing");
    }
  }

  async function handleCalculateBoq() {
    setStatus("calculating");
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/finalize`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok)
        throw new Error(body.error ?? "Could not calculate the BOQ.");
      setBoq(body.boq as BOQResult);
      onBoqChange?.(body.boq as BOQResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not calculate the BOQ.",
      );
    } finally {
      setStatus("reviewing");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="cad-file">Upload AutoCAD file (.dxf)</Label>
        <input
          id="cad-file"
          type="file"
          accept=".dxf"
          onChange={handleFileChange}
          disabled={status === "uploading"}
          className="mt-1.5 block text-sm text-stone-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dark disabled:opacity-50"
        />
        {status === "uploading" && (
          <p className="text-xs text-stone-400 mt-1.5">Parsing drawing…</p>
        )}
        <p className="text-xs text-stone-400 mt-1.5">
          Export the plan from AutoCAD as .dxf (.dwg conversion is not available
          yet). Units are detected automatically (mm, cm, m, ft).
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {geometry && (
        <>
          {geometry.rooms.length === 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No rooms were detected — this drawing may not follow the expected
              layer convention (see SRS §9.1/9.3). Nothing was lost;
              double-check the file, or correct the quantities manually below.
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            {[
              ["Rooms", geometry.rooms.length],
              [
                "Bathrooms",
                geometry.rooms.filter((r) => r.type === "bathroom").length,
              ],
              [
                "Covered area",
                `${Math.round(geometry.rooms.reduce((s, r) => s + r.area, 0)).toLocaleString("en-PK")} sq ft`,
              ],
              [
                "Wall length",
                `${Math.round(geometry.walls.reduce((s, w) => s + w.length, 0)).toLocaleString("en-PK")} ft`,
              ],
              [
                "Doors / windows",
                `${geometry.openings.filter((o) => o.type === "door").length} / ${geometry.openings.filter((o) => o.type === "window").length}`,
              ],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="rounded-lg border border-stone-200 bg-white px-2 py-2"
              >
                <p className="text-[11px] uppercase tracking-wide text-stone-400">
                  {label}
                </p>
                <p className="text-sm font-semibold text-brand-black">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <section>
            <h3 className="text-sm font-semibold text-brand-black mb-2">
              Rooms ({geometry.rooms.length})
            </h3>
            <div className="overflow-x-auto border border-stone-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Area (sqft)</th>
                  </tr>
                </thead>
                <tbody>
                  {geometry.rooms.map((room, i) => (
                    <tr key={room.id} className="border-t border-stone-100">
                      <td className="px-3 py-1.5">
                        <Input
                          aria-label={`Room ${i + 1} name`}
                          value={room.name}
                          onChange={(e) =>
                            updateRoom(i, { name: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <NativeSelect
                          aria-label={`Room ${i + 1} type`}
                          value={room.type}
                          onChange={(e) =>
                            updateRoom(i, { type: e.target.value as RoomType })
                          }
                        >
                          <NativeSelectOption value="general">
                            General
                          </NativeSelectOption>
                          <NativeSelectOption value="kitchen">
                            Kitchen
                          </NativeSelectOption>
                          <NativeSelectOption value="bathroom">
                            Bathroom
                          </NativeSelectOption>
                        </NativeSelect>
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          aria-label={`Room ${i + 1} area`}
                          type="number"
                          value={room.area}
                          onChange={(e) =>
                            updateRoom(i, { area: Number(e.target.value) })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-brand-black mb-2">
              Walls ({geometry.walls.length})
            </h3>
            <div className="overflow-x-auto border border-stone-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Wall</th>
                    <th className="text-left px-3 py-2">Length (ft)</th>
                    <th className="text-left px-3 py-2">Height (ft)</th>
                  </tr>
                </thead>
                <tbody>
                  {geometry.walls.map((wall, i) => (
                    <tr key={wall.id} className="border-t border-stone-100">
                      <td className="px-3 py-1.5">
                        <Input
                          aria-label={`Wall ${i + 1} height`}
                          type="number"
                          value={wall.height}
                          onChange={(e) =>
                            updateWall(i, { height: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5 text-stone-500">
                        {wall.height}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex gap-3">
            <Button
              onClick={handleSaveCorrections}
              disabled={status === "saving"}
              className="bg-brand hover:bg-brand-dark text-white cursor-pointer disabled:cursor-not-allowed"
            >
              {status === "saving" ? "Saving…" : "Save corrections"}
            </Button>
            <Button
              onClick={handleCalculateBoq}
              disabled={status === "calculating"}
              variant="outline"
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              {status === "calculating" ? "Calculating…" : "Calculate BOQ"}
            </Button>
          </div>
        </>
      )}

      {boq && (
        <section className="border-t border-stone-200 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-brand-black">
              Bill of Quantities
            </h3>
            <div className="flex gap-2 text-sm">
              <Link
                href={`/office/${projectId}/boq`}
                target="_blank"
                className="rounded-lg border border-stone-300 px-3 py-1.5 font-medium text-stone-700 hover:bg-stone-50"
              >
                Print / Save PDF
              </Link>
              <Link
                href={`/client/${projectId}`}
                target="_blank"
                className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark"
              >
                Client view
              </Link>
            </div>
          </div>
          <BoqTable boq={boq} />
        </section>
      )}
    </div>
  );
}
