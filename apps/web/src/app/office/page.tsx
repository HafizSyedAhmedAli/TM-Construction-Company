// apps/web/src/app/office/page.tsx
import Link from "next/link";
import { prisma, type Project, type Lead, type Render } from "@tmcc/db";

type ProjectWithLead = Project & { lead: Lead; render: Render | null };

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-stone-100 text-stone-600",
  CAD_UPLOADED: "bg-amber-100 text-amber-700",
  FINALIZED: "bg-green-100 text-green-700",
};

export default async function OfficeProjectsPage() {
  const [projects, pendingLeadCount] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { lead: true, render: true },
    }),
    prisma.lead.count({ where: { projects: { none: {} } } }),
  ]);

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-brand-black">Projects</h1>
          <Link
            href="/office/leads"
            className="text-sm font-medium text-brand hover:text-brand-dark whitespace-nowrap"
          >
            {pendingLeadCount} lead{pendingLeadCount === 1 ? "" : "s"} awaiting
            a project →
          </Link>
        </div>
        <p className="text-sm text-stone-500 mb-8">
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </p>

        {projects.length === 0 ? (
          <p className="text-sm text-stone-400">
            No projects yet — a project is created once office follows up on a
            Lead (SRS §3 step 4).
          </p>
        ) : (
          <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden">
            {projects.map((project: ProjectWithLead) => (
              <Link
                key={project.id}
                href={`/office/${project.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-stone-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-brand-black">
                    {project.lead.name}
                  </p>
                  <p className="text-xs text-stone-500">
                    {project.city} · Model {project.model} · Category{" "}
                    {project.category}
                    {project.render && " · render ready"}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                    STATUS_STYLES[project.status] ??
                    "bg-stone-100 text-stone-600"
                  }`}
                >
                  {project.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
