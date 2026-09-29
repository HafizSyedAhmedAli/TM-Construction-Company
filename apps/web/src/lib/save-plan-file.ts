// apps/web/src/lib/save-plan-file.ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { planFileExtension } from "@tmcc/lead-intake";

// Same placeholder approach as public/renders (see the render route): local
// disk is fine for one dev server but ephemeral on most serverless hosts.
// Swap for S3 / Vercel Blob before deploying. The filename is the lead's
// cuid, so it isn't guessable, but the file is still publicly served.
const PLANS_DIR = path.join(process.cwd(), "public", "lead-plans");

export async function savePlanFile(
  leadId: string,
  file: File,
): Promise<string> {
  const fileName = `${leadId}.${planFileExtension(file.name)}`;
  await mkdir(PLANS_DIR, { recursive: true });
  await writeFile(
    path.join(PLANS_DIR, fileName),
    Buffer.from(await file.arrayBuffer()),
  );
  return `/lead-plans/${fileName}`;
}
