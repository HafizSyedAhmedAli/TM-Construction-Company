import { NextRequest, NextResponse } from "next/server";
import { parseCsrCsv } from "@tmcc/rate-cards";
import { canonicalCityName, type Category } from "@tmcc/shared-types";
import { prisma } from "@tmcc/db";

export const maxDuration = 60;

// Body: { csv, document, year, categories: ["A","B","C"], approvedBy }
// One CSR import creates an APPROVED rate set per city per category and
// supersedes the previous CSR set for those cities.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const approvedBy =
    typeof body?.approvedBy === "string" ? body.approvedBy.trim() : "";
  const document =
    typeof body?.document === "string" ? body.document.trim() : "";
  const year = Number(body?.year);
  const categories = (
    Array.isArray(body?.categories) ? body.categories : []
  ).filter((c: unknown): c is Category => ["A", "B", "C"].includes(String(c)));

  if (
    !approvedBy ||
    !document ||
    !Number.isInteger(year) ||
    !categories.length
  ) {
    return NextResponse.json(
      {
        error: "approvedBy, document, year and categories (A/B/C) are required",
      },
      { status: 400 },
    );
  }
  if (typeof body?.csv !== "string") {
    return NextResponse.json(
      { error: "csv text is required" },
      { status: 400 },
    );
  }

  const parsed = parseCsrCsv(body.csv);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Normalise names so "Benazirabad" and "Nawabshah" end up as one city.
  const byCity = new Map<string, unknown>();
  for (const [city, items] of Object.entries(parsed.byCity)) {
    byCity.set(canonicalCityName(city) ?? city, items);
  }
  const cities = [...byCity.keys()];
  const now = new Date();
  const sources = { document, year, importedAt: now.toISOString() };

  await prisma.$transaction([
    prisma.rateSet.updateMany({
      where: {
        city: { in: cities },
        category: { in: categories },
        status: "APPROVED",
        origin: "csr",
      },
      data: { status: "SUPERSEDED" },
    }),
    prisma.rateSet.createMany({
      data: cities.flatMap((city) =>
        categories.map((category: Category) => ({
          city,
          category,
          status: "APPROVED",
          origin: "csr",
          items: byCity.get(city) as object,
          sources,
          approvedAt: now,
          approvedBy,
        })),
      ),
    }),
  ]);

  return NextResponse.json(
    { imported: cities.length * categories.length, cities },
    { status: 201 },
  );
}
