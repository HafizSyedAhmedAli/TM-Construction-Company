// apps/web/src/app/client/[projectId]/page.tsx
import Image from "next/image";
import { notFound } from "next/navigation";
import type { BOQResult } from "@tmcc/shared-types";
import { prisma } from "@tmcc/db";
import { PrintButton } from "@/components/PrintButton";
import { formatPkr, groupBoq, taxPercent } from "@/lib/boq-format";

const MODEL_LABELS: Record<number, string> = {
  1: "Land & Build, Then Sell",
  2: "Construction on Your Plot",
  3: "Your Plot & Your Construction Cost",
};

// FR-20: "Client shall see only their own Project's render and final cost
// summary" — deliberately does NOT show BOQ line items, meeting notes,
// rate-card internals, or raw geometry; those stay on the office dashboard.
// No auth yet (FR-20's access control isn't built), so for now this is
// reachable by anyone with the link, same as every other route in this app.
export default async function ClientProjectPage({
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

  const boq = project.cadFile?.boq
    ? (project.cadFile.boq as unknown as BOQResult)
    : null;

  // Real render when one exists, otherwise the demo image so the page is
  // never empty (e.g. while the AI image service is unavailable).
  const imageSrc = project.render?.imageUrl ?? "/demo.jpg";

  return (
    <main className="min-h-screen px-4 py-12 bg-stone-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/tmcc-logo-full.png"
            alt="TM Construction Company"
            width={520}
            height={119}
            className="h-14 w-auto mb-6"
            priority
          />
          <h1 className="text-2xl font-bold text-brand-black text-center">
            Your House, Visualized
          </h1>
          <p className="text-sm text-stone-500 mt-1 text-center">
            {project.city} ·{" "}
            {MODEL_LABELS[project.model] ?? `Model ${project.model}`}
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- served
              from public/ and regenerated in place; needs a plain <img>,
              not next/image's static optimization. */}
          <img
            src={imageSrc}
            alt="3D visualization of your house design"
            className="w-full h-auto block"
          />

          <div className="p-6">
            {boq ? (
              <>
                <h2 className="text-sm font-semibold text-brand-black mb-3">
                  Cost Summary
                </h2>
                <div className="space-y-1 text-sm">
                  {groupBoq(boq).map((g) => (
                    <div
                      key={g.group}
                      className="flex justify-between text-stone-600"
                    >
                      <span>{g.group}</span>
                      <span>{formatPkr(g.subtotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-stone-500 pt-2 border-t border-stone-100 mt-2">
                    <span>Sales tax ({taxPercent(boq)}%)</span>
                    <span>{formatPkr(boq.tax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-brand-black pt-2 border-t border-stone-100 mt-2">
                    <span>Total estimated cost</span>
                    <span>{formatPkr(boq.total)}</span>
                  </div>
                </div>
                <p className="text-xs text-stone-400 mt-3">
                  Based on your approved drawing and Category {project.category}{" "}
                  materials in {project.city}. Final contract price is confirmed
                  after site inspection.
                </p>
                <div className="mt-4">
                  <PrintButton label="Print / Save this summary" />
                </div>
              </>
            ) : (
              <p className="text-sm text-stone-400">
                Your final cost estimate is being finalized by our office and
                will appear here shortly.
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-stone-400 mt-8 text-center">
          Questions about this estimate? Reach us at{" "}
          <a
            href="tel:03003212117"
            className="text-brand hover:text-brand-dark"
          >
            0300-3212117
          </a>{" "}
          or{" "}
          <a
            href="mailto:tmcc@gmail.com"
            className="text-brand hover:text-brand-dark"
          >
            tmcc@gmail.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
