// apps/web/src/app/office/[projectId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { BOQResult, Geometry } from "@tmcc/shared-types";
import { prisma } from "@tmcc/db";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";

const MODEL_LABELS: Record<number, string> = {
  1: "Model 1 — Land & Build, Then Sell",
  2: "Model 2 — Construction on Client's Plot",
  3: "Model 3 — Client's Plot & Client's Construction Cost",
};

export default async function OfficeProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { lead: true, cadFile: true, render: true },
  });

  if (!project) notFound();

  const approvedRates = await prisma.rateSet.findFirst({
    where: {
      city: project.city,
      category: project.category,
      status: "APPROVED",
    },
    orderBy: { approvedAt: "desc" },
  });

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="text-2xl font-bold text-brand-black">
            {project.lead.name}
          </h1>
          <Link
            href="/office"
            className="text-sm font-medium text-stone-500 hover:text-brand whitespace-nowrap"
          >
            ← All projects
          </Link>
        </div>
        <p className="text-sm text-stone-500 mb-8">
          Project <span className="font-mono">{project.id}</span> ·{" "}
          {project.city} ·{" "}
          {MODEL_LABELS[project.model] ?? `Model ${project.model}`} · Category{" "}
          {project.category} · Status{" "}
          <span className="font-medium text-stone-700">{project.status}</span>
        </p>

        <div className="mb-6 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
          <p className="text-stone-600">
            <span className="font-medium text-brand-black">Rates applied:</span>{" "}
            {project.city} · Category {project.category} ·{" "}
            {approvedRates
              ? `market rates approved ${approvedRates.approvedAt?.toISOString().slice(0, 10)} by ${approvedRates.approvedBy}`
              : "TM CC standard rate list (no market-rate refresh approved yet)"}
          </p>
          <Link
            href="/office/rates"
            className="font-medium text-brand hover:text-brand-dark whitespace-nowrap"
          >
            Manage rates →
          </Link>
        </div>

        {project.meetingNotes && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="font-medium">Meeting notes:</span>{" "}
            {project.meetingNotes}
          </div>
        )}

        <ProjectWorkspace
          projectId={project.id}
          initialGeometry={
            project.cadFile
              ? (project.cadFile.geometry as unknown as Geometry)
              : null
          }
          initialBoq={
            project.cadFile?.boq
              ? (project.cadFile.boq as unknown as BOQResult)
              : null
          }
          initialRender={
            project.render
              ? {
                  imageUrl: project.render.imageUrl,
                  promptUsed: project.render.promptUsed,
                  generatedAt: project.render.generatedAt.toISOString(),
                }
              : null
          }
        />
      </div>
    </main>
  );
}
