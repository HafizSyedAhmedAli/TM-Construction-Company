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

interface CadReviewPanelProps {
  projectId: string;
  /** Whatever was already saved on this project, so a page refresh doesn't
   * throw away an earlier upload/correction/finalize. */
  initialGeometry?: Geometry | null;
  initialBoq?: BOQResult | null;
  /** Called after a successful upload so the parent (which owns the
   * render-availability check) knows a CAD file now exists. */
  onGeometryUploaded?: () => void;
}

type Status = "idle" | "uploading" | "reviewing" | "saving" | "calculating";

const currency = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

// FR-8/9/10/11/12/13: upload a DXF, let office staff correct what the parser
// extracted, then price the corrected geometry. This talks to routes that
// read/write a Project's one CadFile — it has no concept of picking a
// project; the page embedding this decides which project's ID to pass in.
export function CadReviewPanel({
  projectId,
  initialGeometry = null,
  initialBoq = null,
  onGeometryUploaded,
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
          .dwg isn&apos;t supported yet — export the plan as .dxf first (FR-8).
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
                      <td className="px-3 py-1.5 text-stone-500">{wall.id}</td>
                      <td className="px-3 py-1.5">
                        <Input
                          aria-label={`Wall ${i + 1} length`}
                          type="number"
                          value={wall.length}
                          onChange={(e) =>
                            updateWall(i, { length: Number(e.target.value) })
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
          <h3 className="text-sm font-semibold text-brand-black mb-2">
            Bill of Quantities
          </h3>
          <div className="overflow-x-auto border border-stone-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Item</th>
                  <th className="text-left px-3 py-2">Quantity</th>
                  <th className="text-left px-3 py-2">Rate</th>
                  <th className="text-left px-3 py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {boq.lineItems.map((item) => (
                  <tr key={item.itemType} className="border-t border-stone-100">
                    <td className="px-3 py-1.5 capitalize">{item.itemType}</td>
                    <td className="px-3 py-1.5">
                      {item.quantity.toFixed(1)} {item.unit}
                    </td>
                    <td className="px-3 py-1.5">
                      {currency.format(item.unitRate)}
                    </td>
                    <td className="px-3 py-1.5">
                      {currency.format(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-right space-y-0.5">
            <p className="text-sm text-stone-500">
              Subtotal: {currency.format(boq.subtotal)}
            </p>
            <p className="text-sm text-stone-500">
              Tax: {currency.format(boq.tax)}
            </p>
            <p className="text-lg font-bold text-brand-black">
              Total: {currency.format(boq.total)}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
