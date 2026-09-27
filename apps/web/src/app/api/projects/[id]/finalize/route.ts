// apps/web/src/app/api/projects/[id]/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { Geometry } from "@tmcc/shared-types";
import { estimateFromGeometry } from "@tmcc/rate-cards";
import { prisma } from "@tmcc/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const cadFile = await prisma.cadFile.findUnique({ where: { projectId } });
  if (!cadFile)
    return NextResponse.json(
      { error: "No CAD file uploaded for this project yet" },
      { status: 404 },
    );

  const boq = estimateFromGeometry({
    geometry: cadFile.geometry as unknown as Geometry,
    city: project.city,
    category: project.category as "A" | "B" | "C",
  });

  if (!boq) {
    return NextResponse.json(
      {
        error: `No rate card exists yet for ${project.city} / Category ${project.category}`,
      },
      { status: 422 },
    );
  }

  const updated = await prisma.cadFile.update({
    where: { projectId },
    data: { boq: boq as unknown as object },
  });
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "FINALIZED" },
  });

  return NextResponse.json({ ...updated, boq });
}
