import { NextRequest, NextResponse } from "next/server";
import { validateLeadIntake } from "@tmcc/lead-intake";
import { estimateLead } from "@tmcc/rate-cards";
import { prisma } from "@tmcc/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = validateLeadIntake(body);
  if (!result.valid) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: { ...body, source: "FORM" },
  });

  const estimate = estimateLead({
    city: body.city,
    category: body.category,
    model: body.model,
  });

  // Flat shape on purpose: keeps `json.id` etc. working for any existing
  // caller of this route, `estimate` just rides alongside it.
  return NextResponse.json({ ...lead, estimate }, { status: 201 });
}
