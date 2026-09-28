// apps/web/src/app/client/[projectId]/page.tsx
import Image from "next/image";
import { notFound } from "next/navigation";
import type { BOQResult } from "@tmcc/shared-types";
import { prisma } from "@tmcc/db";

const currency = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

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
          {project.render ? (
            /* eslint-disable-next-line @next/next/no-img-element -- served
               from public/renders and regenerated in place; needs a plain
               <img>, not next/image's static optimization. */
            // <img
            //   src={project.render.imageUrl}
            //   alt="3D visualization of your house design"
            //   className="w-full h-auto block"
            // />
            <img
              src="/demo.jfif"
              alt="3D visualization of your house design"
              className="w-full h-auto block"
            />
          ) : (
            <div className="aspect-video flex items-center justify-center bg-stone-100">
              <p className="text-sm text-stone-400 px-6 text-center">
                Your 3D visualization is being prepared — check back soon, or
                ask your TM Construction Company representative for an update.
              </p>
            </div>
          )}

          <div className="p-6">
            {boq ? (
              <>
                <h2 className="text-sm font-semibold text-brand-black mb-3">
                  Cost Summary
                </h2>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-stone-500">
                    <span>Subtotal</span>
                    <span>{currency.format(boq.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>Tax</span>
                    <span>{currency.format(boq.tax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-brand-black pt-2 border-t border-stone-100 mt-2">
                    <span>Total</span>
                    <span>{currency.format(boq.total)}</span>
                  </div>
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
