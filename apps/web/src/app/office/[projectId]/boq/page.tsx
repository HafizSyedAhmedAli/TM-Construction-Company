// apps/web/src/app/office/[projectId]/boq/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { BOQResult, Geometry } from "@tmcc/shared-types";
import { prisma } from "@tmcc/db";
import { BoqTable } from "@/components/BoqTable";
import { PrintButton } from "@/components/PrintButton";
import { ASSUMPTIONS, EXCLUSIONS } from "@/lib/boq-format";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

const MODEL_LABELS: Record<number, string> = {
  1: "Model 1 — Land & Build, Then Sell",
  2: "Model 2 — Construction on Client's Plot",
  3: "Model 3 — Client's Plot & Client's Construction Cost",
};

// FR-19: printable BOQ. "Print / Save as PDF" uses the browser's PDF printer.
export default async function BoqPrintPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { lead: true, cadFile: true },
  });
  if (!project) notFound();

  const boq = project.cadFile?.boq as unknown as BOQResult | null;
  if (!boq) {
    return (
      <main className="px-4 py-12 max-w-3xl mx-auto">
        <p className="text-sm text-stone-600">
          No BOQ has been calculated for this project yet.
        </p>
        <Link href={`/office/${projectId}`} className="text-sm text-brand">
          ← Back to project
        </Link>
      </main>
    );
  }

  const geometry = project.cadFile!.geometry as unknown as Geometry;
  const area = Math.round(geometry.rooms.reduce((s, r) => s + r.area, 0));
  const today = new Date().toLocaleDateString("en-PK", { dateStyle: "long" });

  return (
    <main className="px-4 py-8 max-w-4xl mx-auto bg-white print:p-0">
      <div className="print:hidden flex items-center justify-between mb-6">
        <Link href={`/office/${projectId}`} className="text-sm text-brand">
          ← Back to project
        </Link>
        <a
          href={`/api/projects/${projectId}/boq-pdf`}
          download
          className="print:hidden inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          <Download className="size-4" />
          Download PDF
        </a>
      </div>

      <header className="flex items-start justify-between border-b-2 border-brand pb-4 mb-6">
        <Image
          src="/tmcc-logo-full.png"
          alt="TM Construction Company"
          width={520}
          height={119}
          className="h-14 w-auto"
        />
        <div className="text-right text-xs text-stone-500">
          <p>Head Office: 404, Oyster Towers, Clifton Block 2, Karachi</p>
          <p>Regional Office: A-7, Rehman City, Nawabshah</p>
          <p>0300-3212117 · tmcc@gmail.com</p>
          <p>PEC registered</p>
        </div>
      </header>

      <h1 className="text-2xl font-bold text-brand-black">
        Bill of Quantities &amp; Cost Estimate
      </h1>
      <p className="text-sm text-stone-500 mb-5">Prepared on {today}</p>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-6">
        <div className="flex justify-between">
          <dt className="text-stone-500">Client</dt>
          <dd className="font-medium">{project.lead.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Contact</dt>
          <dd>{project.lead.contact}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">City</dt>
          <dd>{project.city}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Material category</dt>
          <dd>Category {project.category}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Engagement</dt>
          <dd>{MODEL_LABELS[project.model] ?? `Model ${project.model}`}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Covered area</dt>
          <dd>{area.toLocaleString("en-PK")} sq ft</dd>
        </div>
      </dl>

      <BoqTable boq={boq} />
      <p className="mt-2 text-right text-sm text-stone-500">
        Approx. Rs{" "}
        {new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
          boq.total / Math.max(area, 1),
        )}{" "}
        per sq ft (incl. tax)
      </p>

      <div className="grid grid-cols-2 gap-8 mt-8 text-xs text-stone-600 break-inside-avoid">
        <section>
          <h2 className="font-semibold text-brand-black mb-1 text-sm">
            Basis of estimate
          </h2>
          <ul className="list-disc pl-4 space-y-1">
            {ASSUMPTIONS.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-brand-black mb-1 text-sm">
            Not included
          </h2>
          <ul className="list-disc pl-4 space-y-1">
            {EXCLUSIONS.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-16 mt-16 text-xs text-stone-500 break-inside-avoid">
        <div className="border-t border-stone-400 pt-1">
          For TM Construction Company
        </div>
        <div className="border-t border-stone-400 pt-1">Client acceptance</div>
      </div>
    </main>
  );
}
