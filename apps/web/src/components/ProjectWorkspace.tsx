"use client";

import { useState } from "react";
import type { BOQResult, Geometry } from "@tmcc/shared-types";
import { CadReviewPanel } from "@/components/CardReviewPanel";
import { RenderPanel, type RenderState } from "@/components/RenderPanel";

interface ProjectWorkspaceProps {
  projectId: string;
  initialGeometry: Geometry | null;
  initialBoq: BOQResult | null;
  initialRender: RenderState | null;
}

// Just wires the two panels together: CadReviewPanel owns the
// upload/review/finalize flow (FR-8..14), RenderPanel owns the independent
// 3D-render flow (FR-16/17, §9.3). The only thing they share is whether a
// CAD file exists yet — the render route needs one, the BOQ route needs
// one, neither needs the other's output.
export function ProjectWorkspace({
  projectId,
  initialGeometry,
  initialBoq,
  initialRender,
}: ProjectWorkspaceProps) {
  const [hasCadFile, setHasCadFile] = useState(initialGeometry !== null);

  return (
    <div className="space-y-8">
      <CadReviewPanel
        projectId={projectId}
        initialGeometry={initialGeometry}
        initialBoq={initialBoq}
        onGeometryUploaded={() => setHasCadFile(true)}
      />
      <RenderPanel
        projectId={projectId}
        hasCadFile={hasCadFile}
        initialRender={initialRender}
      />
    </div>
  );
}
