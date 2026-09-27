// apps/web/src/app/office/[projectId]/page.tsx
import { CadReviewPanel } from "@/components/CadReviewPanel";

// No auth/roles yet (FR-20 not started) — this page is reachable by anyone
// who knows a project ID, same caveat as the API routes it calls. A real
// project-picker (backed by GET /api/projects) is also still missing; for
// now office staff need a project ID in hand to use this URL.
export default async function OfficeProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-brand-black mb-1">
          Review CAD Upload
        </h1>
        <p className="text-sm text-stone-500 mb-8">
          Project <span className="font-mono">{projectId}</span> — upload the
          finalized AutoCAD plan, review the extracted rooms and walls, then
          calculate the BOQ.
        </p>
        <CadReviewPanel projectId={projectId} />
      </div>
    </main>
  );
}
