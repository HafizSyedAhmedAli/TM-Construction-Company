import Link from "next/link";
import { prisma } from "@tmcc/db";
import type { RateCardItem } from "@tmcc/shared-types";
import type { ResearchSources } from "@tmcc/rate-research";
import {
  RateSetReviewPanel,
  type DraftRateSet,
} from "@/components/RateSetReviewPanel";

export const dynamic = "force-dynamic";

export default async function OfficeRatesPage() {
  const [drafts, approved] = await Promise.all([
    prisma.rateSet.findMany({
      where: { status: "DRAFT" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rateSet.findMany({
      where: { status: "APPROVED" },
      orderBy: { approvedAt: "desc" },
    }),
  ]);

  const initialDrafts: DraftRateSet[] = drafts.map((d) => ({
    id: d.id,
    city: d.city,
    category: d.category,
    origin: d.origin,
    createdAt: d.createdAt.toISOString(),
    items: d.items as unknown as RateCardItem[],
    sources: d.sources as unknown as ResearchSources | null,
  }));

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-brand-black">Rates</h1>
          <Link
            href="/office"
            className="text-sm font-medium text-brand hover:text-brand-dark"
          >
            ← Projects
          </Link>
        </div>
        <p className="text-sm text-stone-500 mb-8">
          A BOQ only uses approved rates. Drafts come from a Gemini web search
          and must be reviewed first.
        </p>

        <RateSetReviewPanel initialDrafts={initialDrafts} />

        <h2 className="text-sm font-semibold text-brand-black mt-10 mb-2">
          Approved
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-stone-400">
            Nothing approved yet, so BOQs still use the placeholder rate cards.
          </p>
        ) : (
          <ul className="text-sm text-stone-600 space-y-1">
            {approved.map((a) => (
              <li key={a.id}>
                {a.city} · Category {a.category} — approved by {a.approvedBy} on{" "}
                {a.approvedAt?.toISOString().slice(0, 10)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
