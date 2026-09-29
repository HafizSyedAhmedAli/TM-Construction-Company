import { NextRequest, NextResponse } from "next/server";
import {
  validateLeadIntake,
  validatePlanFile,
  type LeadIntakeInput,
} from "@tmcc/lead-intake";
import { estimateLead } from "@tmcc/rate-cards";
import { prisma } from "@tmcc/db";
import { getLiveRateCard } from "@/lib/rate-sets";
import { pickLeadData, readLeadRequest } from "@/lib/lead-request";
import { savePlanFile } from "@/lib/save-plan-file";

export const maxDuration = 60;

// Lead capture must never wait forever on a price search.
const ESTIMATE_TIMEOUT_MS = 40_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function POST(req: NextRequest) {
  const { body, planFile } = await readLeadRequest(req);
  const input = (body ?? {}) as Partial<LeadIntakeInput>;

  const result = validateLeadIntake(input);
  const planFileError = planFile ? validatePlanFile(planFile) : null;
  if (!result.valid || planFileError) {
    return NextResponse.json(
      {
        errors: {
          ...result.errors,
          ...(planFileError ? { planFile: planFileError } : {}),
        },
      },
      { status: 400 },
    );
  }

  let lead = await prisma.lead.create({
    data: pickLeadData(input as LeadIntakeInput),
  });

  // The lead is already saved; a failed file write must not lose it.
  if (planFile) {
    try {
      const planFileUrl = await savePlanFile(lead.id, planFile);
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: { planFileUrl, planFileName: planFile.name },
      });
    } catch (err) {
      console.error("Could not save lead plan file", err);
    }
  }

  // The rough estimate uses live city rates (searched on first use). If they
  // cannot be found in time the lead is still saved and `estimate` is null —
  // there is no placeholder estimate.
  const rateCard = await withTimeout(
    getLiveRateCard(input.city!, input.category!),
    ESTIMATE_TIMEOUT_MS,
  ).catch(() => null);

  const estimate = estimateLead({
    model: input.model!,
    rateCard: rateCard ?? undefined,
  });

  // Flat shape on purpose: keeps `json.id` etc. working for any existing
  // caller of this route, `estimate` just rides alongside it.
  return NextResponse.json({ ...lead, estimate }, { status: 201 });
}
