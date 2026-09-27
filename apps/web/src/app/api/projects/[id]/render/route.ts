// apps/web/src/app/api/projects/[id]/render/route.ts
import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Category, Geometry } from "@tmcc/shared-types";
import { generateRender } from "@tmcc/render-engine";
import { prisma } from "@tmcc/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Local disk under apps/web/public is a placeholder for real object storage
// (see the Render model's comment in schema.prisma) — fine for one server
// in development, but ephemeral on most serverless hosts. Swap this for an
// S3/Vercel Blob upload before this needs to survive a redeploy.
const RENDERS_DIR = path.join(process.cwd(), "public", "renders");

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const cadFile = await prisma.cadFile.findUnique({ where: { projectId } });
  if (!cadFile) {
    return NextResponse.json(
      { error: "No CAD file uploaded for this project yet" },
      { status: 404 },
    );
  }

  // NFR-7: the external AI image service may fail or be slow, and that must
  // never block BOQ generation. This route is already independent of
  // /finalize (separate endpoint, doesn't touch CadFile.boq or
  // Project.status), so a failure here simply means no Render row exists
  // yet — it does not corrupt or block anything else.
  let rendered;
  try {
    rendered = await generateRender({
      geometry: cadFile.geometry as unknown as Geometry,
      category: project.category as Category,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `3D render generation failed: ${err instanceof Error ? err.message : "unknown error"}. BOQ finalization is unaffected — you can retry the render separately.`,
      },
      { status: 502 },
    );
  }

  const extension = rendered.mimeType.split("/")[1] ?? "png";
  const fileName = `${projectId}.${extension}`;
  await mkdir(RENDERS_DIR, { recursive: true });
  await writeFile(path.join(RENDERS_DIR, fileName), rendered.image);
  const imageUrl = `/renders/${fileName}`;

  const render = await prisma.render.upsert({
    where: { projectId },
    create: {
      projectId,
      imageUrl,
      promptUsed: rendered.promptUsed,
    },
    update: {
      imageUrl,
      promptUsed: rendered.promptUsed,
      generatedAt: new Date(),
    },
  });

  return NextResponse.json(render, { status: 200 });
}
