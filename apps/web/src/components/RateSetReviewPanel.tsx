"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RateCardItem } from "@tmcc/shared-types";
import type { ResearchSources } from "@tmcc/rate-research";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { BOQ_META } from "@/lib/boq-format";

export interface DraftRateSet {
  id: string;
  city: string;
  category: string;
  origin: string;
  createdAt: string;
  items: RateCardItem[];
  sources: ResearchSources | null;
}

// FR-15 / NFR-4: Gemini only ever proposes. Nothing reaches a BOQ until
// office edits (if needed) and approves it here.
export function RateSetReviewPanel({
  initialDrafts,
}: {
  initialDrafts: DraftRateSet[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState(initialDrafts);
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("B");
  const [approvedBy, setApprovedBy] = useState("");
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, body?: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data;
  }

  async function refresh() {
    setBusy("refresh");
    setError(null);
    try {
      const d = await call("/api/rate-sets/refresh", { city, category });
      setDrafts((prev) => [{ ...d, createdAt: String(d.createdAt) }, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(null);
    }
  }

  async function approve(d: DraftRateSet) {
    if (!approvedBy.trim())
      return setError("Enter your name in “Approved by” first.");
    setBusy(d.id);
    setError(null);
    try {
      const items = d.items.map((i) => ({
        ...i,
        unitRate: Number(edits[d.id]?.[i.itemType] ?? i.unitRate),
      }));
      await call(`/api/rate-sets/${d.id}/approve`, { approvedBy, items });
      setDrafts((prev) => prev.filter((x) => x.id !== d.id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function reject(d: DraftRateSet) {
    setBusy(d.id);
    setError(null);
    try {
      await call(`/api/rate-sets/${d.id}/reject`);
      setDrafts((prev) => prev.filter((x) => x.id !== d.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="border border-stone-200 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-brand-black">
          Refresh rates with Gemini
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="rs-city">City</Label>
            <Input
              id="rs-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Nawabshah"
            />
          </div>
          <div>
            <Label htmlFor="rs-cat">Category</Label>
            <NativeSelect
              id="rs-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <NativeSelectOption value="A">A</NativeSelectOption>
              <NativeSelectOption value="B">B</NativeSelectOption>
              <NativeSelectOption value="C">C</NativeSelectOption>
            </NativeSelect>
          </div>
          <Button onClick={refresh} disabled={!city.trim() || busy !== null}>
            {busy === "refresh" ? "Searching…" : "Search current prices"}
          </Button>
        </div>
        <div>
          <Label htmlFor="rs-by">Approved by</Label>
          <Input
            id="rs-by"
            value={approvedBy}
            onChange={(e) => setApprovedBy(e.target.value)}
            placeholder="Your name"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>

      {drafts.length === 0 && (
        <p className="text-sm text-stone-400">No drafts awaiting review.</p>
      )}

      {drafts.map((d) => (
        <section
          key={d.id}
          className="border border-stone-200 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-brand-black">
              {d.city} · Category {d.category}{" "}
              <span className="text-xs font-normal text-stone-500">
                ({d.origin})
              </span>
            </h3>
          </div>

          {d.sources?.warnings.map((w) => (
            <p
              key={w}
              className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1"
            >
              {w}
            </p>
          ))}

          <div className="divide-y divide-stone-100">
            {d.items.map((i) => {
              const src = d.sources?.items.find(
                (s) => s.itemType === i.itemType,
              );
              return (
                <div key={i.itemType} className="flex items-center gap-3 py-2">
                  <span className="w-48 text-sm">
                    {BOQ_META[i.itemType]?.label ?? i.itemType}
                  </span>
                  <Input
                    type="number"
                    className="w-32"
                    value={edits[d.id]?.[i.itemType] ?? String(i.unitRate)}
                    onChange={(e) =>
                      setEdits((p) => ({
                        ...p,
                        [d.id]: { ...p[d.id], [i.itemType]: e.target.value },
                      }))
                    }
                  />
                  <span className="text-xs text-stone-500">PKR / {i.unit}</span>
                  <span className="text-xs text-stone-500 ml-auto text-right">
                    {src?.sourceUrl ? (
                      <a
                        href={src.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand underline"
                      >
                        {src.sourceName ?? "source"}
                      </a>
                    ) : (
                      "no source"
                    )}
                    {src?.sourceDate && ` · ${src.sourceDate}`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button onClick={() => approve(d)} disabled={busy !== null}>
              {busy === d.id ? "Working…" : "Approve"}
            </Button>
            <Button
              variant="outline"
              onClick={() => reject(d)}
              disabled={busy !== null}
            >
              Reject
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
}
