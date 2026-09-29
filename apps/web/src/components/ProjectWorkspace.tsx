"use client";

import { useState } from "react";
import Link from "next/link";
import type { BOQResult, Geometry } from "@tmcc/shared-types";
import { CadReviewPanel } from "@/components/CardReviewPanel";
import { RenderPanel, type RenderState } from "@/components/RenderPanel";
import { ProjectStepper } from "@/components/ProjectStepper";

interface ProjectWorkspaceProps {
  projectId: string;
  initialGeometry: Geometry | null;
  initialBoq: BOQResult | null;
  initialRender: RenderState | null;
}

// Wires the panels together and drives the progress stepper. CadReviewPanel
// owns upload/review/BOQ (FR-8..14); RenderPanel owns the independent 3D
// render (FR-16/17, §9.3). They only share "does a CAD file exist yet".
export function ProjectWorkspace({
  projectId,
  initialGeometry,
  initialBoq,
  initialRender,
}: ProjectWorkspaceProps) {
  const [hasCadFile, setHasCadFile] = useState(initialGeometry !== null);
  const [hasBoq, setHasBoq] = useState(initialBoq !== null);
  const [hasRender, setHasRender] = useState(initialRender !== null);

  return (
    <div className="space-y-8">
      <ProjectStepper
        hasCad={hasCadFile}
        hasBoq={hasBoq}
        hasRender={hasRender}
      />

      <section>
        <h2 className="text-lg font-semibold text-brand-black mb-3">
          Drawing &amp; cost estimate
        </h2>
        <CadReviewPanel
          projectId={projectId}
          initialGeometry={initialGeometry}
          initialBoq={initialBoq}
          onGeometryUploaded={() => {
            setHasCadFile(true);
            setHasBoq(false);
          }}
          onBoqChange={(b) => setHasBoq(b !== null)}
        />
      </section>

      <div className="pt-2">
        <RenderPanel
          projectId={projectId}
          hasCadFile={hasCadFile}
          initialRender={initialRender}
          onRenderChange={() => setHasRender(true)}
        />
      </div>

      {hasBoq && (
        <section className="print:hidden border-t border-stone-200 pt-8">
          <h2 className="text-lg font-semibold text-brand-black mb-3">
            Present to the client
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/client/${projectId}`}
              target="_blank"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Open client page →
            </Link>
            <Link
              href={`/office/${projectId}/boq`}
              target="_blank"
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Printable BOQ (PDF) →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
