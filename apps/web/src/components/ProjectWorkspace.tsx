"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronDown,
  FileText,
  PencilRuler,
  Receipt,
  Send,
} from "lucide-react";
import type { BOQResult, Geometry } from "@tmcc/shared-types";
import { CadReviewPanel } from "@/components/CardReviewPanel";
import { RenderPanel, type RenderState } from "@/components/RenderPanel";
import { ProjectStepper } from "@/components/ProjectStepper";
import { BoqTable } from "@/components/BoqTable";

interface ProjectWorkspaceProps {
  projectId: string;
  initialGeometry: Geometry | null;
  initialBoq: BOQResult | null;
  initialRender: RenderState | null;
  /** Right-hand "Project Details" card, rendered by the server page. */
  details: ReactNode;
}

const card =
  "rounded-2xl border border-stone-200/70 bg-white/95 p-5 shadow-[0_10px_40px_-12px_rgba(35,31,30,0.12)] backdrop-blur sm:p-6";

const outlineBtn =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-brand-black hover:bg-stone-50";

// Wires the panels together and drives the progress stepper. CadReviewPanel
// owns upload/review/BOQ calculation (FR-8..14); RenderPanel owns the
// independent 3D render (FR-16/17, §9.3). The BOQ itself is displayed here so
// it can sit beside the render.
export function ProjectWorkspace({
  projectId,
  initialGeometry,
  initialBoq,
  initialRender,
  details,
}: ProjectWorkspaceProps) {
  const [hasCadFile, setHasCadFile] = useState(initialGeometry !== null);
  const [boq, setBoq] = useState<BOQResult | null>(initialBoq);
  const [hasRender, setHasRender] = useState(initialRender !== null);

  return (
    <div className="space-y-6">
      <ProjectStepper
        hasCad={hasCadFile}
        hasBoq={boq !== null}
        hasRender={hasRender}
      />

      {/* Row 1: drawing editor + project details */}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <section className={card}>
          <h2 className="mb-5 flex items-center gap-3 text-lg font-bold text-brand-black">
            <span className="grid size-9 place-items-center rounded-lg bg-brand-black text-white">
              <PencilRuler className="size-4" />
            </span>
            Drawing &amp; cost estimate
          </h2>
          <CadReviewPanel
            projectId={projectId}
            initialGeometry={initialGeometry}
            initialBoq={initialBoq}
            showBoq={false}
            onGeometryUploaded={() => {
              setHasCadFile(true);
              setBoq(null);
            }}
            onBoqChange={setBoq}
          />
        </section>
        {details}
      </div>

      {/* Row 2: BOQ + render / present */}
      <div className="grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2.5 text-sm font-semibold text-brand-black">
              <span className="grid size-7 place-items-center rounded-md border border-stone-200 bg-white">
                <Receipt className="size-4" />
              </span>
              Bill of Quantities
            </h2>
            {boq && (
              <div className="flex gap-2 text-sm">
                <Link
                  href={`/office/${projectId}/boq`}
                  target="_blank"
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-medium text-stone-700 hover:bg-stone-50"
                >
                  Print / Save PDF
                </Link>
                <Link
                  href={`/client/${projectId}`}
                  target="_blank"
                  className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark"
                >
                  Client View
                </Link>
              </div>
            )}
          </div>
          {boq ? (
            <BoqTable boq={boq} />
          ) : (
            <p className="rounded-xl border border-dashed border-stone-300 px-4 py-10 text-center text-sm text-stone-400">
              Upload a drawing and press “Calculate BOQ” — the priced quantities
              will appear here.
            </p>
          )}
        </section>

        <div className="space-y-6">
          <RenderPanel
            projectId={projectId}
            hasCadFile={hasCadFile}
            initialRender={initialRender}
            onRenderChange={() => setHasRender(true)}
          />
        </div>
      </div>
    </div>
  );
}
