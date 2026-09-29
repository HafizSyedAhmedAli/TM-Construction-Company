import { NextRequest, NextResponse } from "next/server";
import { validateLeadIntake } from "@tmcc/lead-intake";
import { estimateLead } from "@tmcc/rate-cards";
import { prisma } from "@tmcc/db";
import { getLiveRateCard } from "@/lib/rate-sets";

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
  const body = await req.json();
  const result = validateLeadIntake(body);
  if (!result.valid) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: { ...body, source: "FORM" },
  });

  // The rough estimate uses live city rates (searched on first use). If they
  // cannot be found in time the lead is still saved and `estimate` is null —
  // there is no placeholder estimate.
  const rateCard = await withTimeout(
    getLiveRateCard(body.city, body.category),
    ESTIMATE_TIMEOUT_MS,
  ).catch(() => null);

  const estimate = estimateLead({
    model: body.model,
    rateCard: rateCard ?? undefined,
  });

  // Flat shape on purpose: keeps `json.id` etc. working for any existing
  // caller of this route, `estimate` just rides alongside it.
  return NextResponse.json({ ...lead, estimate }, { status: 201 });
}
