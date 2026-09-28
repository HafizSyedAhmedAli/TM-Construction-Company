// apps/web/src/app/office/leads/page.tsx
import Link from "next/link";
import { prisma, type Lead } from "@tmcc/db";
import { ConvertLeadForm } from "@/components/ConvertLeadForm";

const SOURCE_LABELS: Record<string, string> = {
  FORM: "Web form",
  WHATSAPP: "WhatsApp",
  FACEBOOK: "Facebook Page",
};

// FR-2/5: every WhatsApp/Form contact is logged as a Lead; office turns one
// into a Project once the design-brief meeting has happened (SRS §3 steps
// 3-5). This lists Leads that haven't been converted yet — the "projects:
// none" filter is what keeps a Lead off this list once ConvertLeadForm
// below has created a Project for it.
export default async function OfficeLeadsPage() {
  const leads = await prisma.lead.findMany({
    where: { projects: { none: {} } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-brand-black">
            Leads Awaiting a Project
          </h1>
          <Link
            href="/office"
            className="text-sm font-medium text-brand hover:text-brand-dark whitespace-nowrap"
          >
            View projects →
          </Link>
        </div>
        <p className="text-sm text-stone-500 mb-8">
          {leads.length} lead{leads.length === 1 ? "" : "s"} — create a project
          once you&apos;ve met the client and finalized the brief (SRS §3 step
          4).
        </p>

        {leads.length === 0 ? (
          <p className="text-sm text-stone-400">
            No leads waiting — every lead so far has a project.
          </p>
        ) : (
          <div className="space-y-4">
            {leads.map((lead: Lead) => (
              <div
                key={lead.id}
                className="border border-stone-200 rounded-lg p-4 bg-white"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-sm font-medium text-brand-black">
                      {lead.name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {lead.contact} ·{" "}
                      {SOURCE_LABELS[lead.source] ?? lead.source} ·{" "}
                      {lead.createdAt.toLocaleDateString("en-PK")}
                    </p>
                  </div>
                </div>
                <ConvertLeadForm
                  leadId={lead.id}
                  defaultCity={lead.city}
                  defaultModel={lead.model}
                  defaultCategory={lead.category}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
