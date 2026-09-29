// apps/web/src/app/api/projects/[id]/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { Geometry } from "@tmcc/shared-types";
import { estimateFromGeometry } from "@tmcc/rate-cards";
import { prisma } from "@tmcc/db";
import { getLiveRateCard, RateUnavailableError } from "@/lib/rate-sets";

// The first BOQ for a city runs a live AI price search (17 items, two
// grounded searches plus a possible retry) before it can be priced.
export const maxDuration = 120;

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

  const category = project.category as "A" | "B" | "C";

  // No placeholder fallback: if live rates cannot be found, nothing is
  // saved and the project is not marked FINALIZED.
  let rateCard;
  try {
    rateCard = await getLiveRateCard(project.city, category);
  } catch (err) {
    if (err instanceof RateUnavailableError) {
      return NextResponse.json(
        {
          error: `${err.message}. Try again, or add rates manually on the Rates page.`,
        },
        { status: 502 },
      );
    }
    throw err;
  }

  const boq = estimateFromGeometry({
    geometry: cadFile.geometry as unknown as Geometry,
    rateCard,
  });
  if (!boq) {
    return NextResponse.json(
      {
        error: `No rates available for ${project.city} / Category ${project.category}`,
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
