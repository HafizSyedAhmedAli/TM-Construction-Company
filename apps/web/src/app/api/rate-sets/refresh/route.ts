import { NextRequest, NextResponse } from "next/server";
import type { Category } from "@tmcc/shared-types";
import { researchCompleteRates } from "@tmcc/rate-research";
import { DEFAULT_TAX_PERCENT } from "@tmcc/rate-cards";
import { prisma } from "@tmcc/db";

export const maxDuration = 120; // 17 items = two grounded searches (+ retry)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const city = typeof body?.city === "string" ? body.city.trim() : "";
  const category = body?.category as Category;
  if (!city || !["A", "B", "C"].includes(category)) {
    return NextResponse.json(
      { error: "city and category (A/B/C) are required" },
      { status: 400 },
    );
  }

  // Same isolation as the render route (NFR-7): if Gemini fails, nothing is
  // saved and no existing BOQ or approved rate is touched.
  let research;
  try {
    research = await researchCompleteRates({ city, category });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Rate refresh failed: ${err instanceof Error ? err.message : "unknown error"}. Existing approved rates are unaffected.`,
      },
      { status: 502 },
    );
  }

  const draft = await prisma.rateSet.create({
    data: {
      city,
      category,
      status: "DRAFT",
      origin: "gemini",
      taxPercent: DEFAULT_TAX_PERCENT,
      items: research.items as unknown as object,
      sources: research.sources as unknown as object,
    },
  });
  return NextResponse.json(draft, { status: 201 });
}
