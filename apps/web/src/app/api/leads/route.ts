import { NextRequest, NextResponse } from "next/server";
import { validateLeadIntake } from "@tmcc/lead-intake";
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

  return NextResponse.json(lead, { status: 201 });
}