"use client";

import { useState } from "react";
import { Box, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RenderState {
  imageUrl: string;
  promptUsed: string;
  generatedAt: string;
}

interface RenderPanelProps {
  projectId: string;
  /** False until a CAD file has been uploaded — the render route 404s without one. */
  hasCadFile: boolean;
  initialRender?: RenderState | null;
  /** Called after a render is generated, so the parent can update progress. */
  onRenderChange?: (render: RenderState) => void;
}

type Status = "idle" | "generating" | "error";

// FR-16/17, §9.3: this only ever talks to POST /api/projects/:id/render.
// It never touches CadFile.boq and never blocks on it — the render and the
// BOQ are independently derived from the same parsed geometry, and per
// NFR-7 a failure here must not take down BOQ finalization (or vice versa).
export function RenderPanel({
  projectId,
  hasCadFile,
  initialRender = null,
  onRenderChange,
}: RenderPanelProps) {
  const [render, setRender] = useState<RenderState | null>(initialRender);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setStatus("generating");
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/render`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Render generation failed.");
      setRender(body as RenderState);
      onRenderChange?.(body as RenderState);
      setStatus("idle");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Render generation failed.",
      );
      setStatus("error");
    }
  }

  return (
    <section className="rounded-2xl border border-stone-200/70 bg-white/95 p-5 shadow-[0_10px_40px_-12px_rgba(35,31,30,0.12)] backdrop-blur sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2.5 text-sm font-semibold text-brand-black">
          <span className="grid size-7 place-items-center rounded-md border border-stone-200 bg-white">
            <Box className="size-4" />
          </span>
          3D Visualization
        </h3>
        {hasCadFile && (
          <Button
            onClick={handleGenerate}
            disabled={status === "generating"}
            variant="outline"
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            {status === "generating"
              ? "Generating…"
              : render
                ? "Regenerate render"
                : "Generate 3D render"}
          </Button>
        )}
      </div>

      {!hasCadFile && (
        <p className="text-sm text-stone-400">
          Upload a CAD file above first — the render is generated from the
          parsed layout (FR-16).
        </p>
      )}

      {status === "generating" && (
        <p className="mb-3 text-xs text-stone-400">
          Calling the AI image-generation service — this can take up to a
          minute. The BOQ is unaffected either way (NFR-7).
        </p>
      )}

      {error && (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {render && (
        <figure>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- served
                from public/renders and overwritten in place on regenerate;
                a cache-busting query param needs a plain <img>, not
                next/image's static optimization. */}
            <img
              src={`${render.imageUrl}?t=${new Date(render.generatedAt).getTime()}`}
              alt="AI-generated 3D visualization of the house design"
              className="block h-auto w-full"
            />
          </div>
          <figcaption className="mt-3 flex items-center justify-between gap-3 text-[11px] text-stone-400">
            <span className="flex items-center gap-1.5">
              <Camera className="size-3.5" />
              Generated{" "}
              {new Date(render.generatedAt).toLocaleString("en-PK", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            <span className="italic" title={render.promptUsed}>
              Photorealistic isometric floorplan
            </span>
          </figcaption>
        </figure>
      )}
    </section>
  );
}
