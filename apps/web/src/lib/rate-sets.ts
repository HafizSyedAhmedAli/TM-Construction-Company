import { prisma } from "@tmcc/db";
import { getRateCard, mergeRateCards } from "@tmcc/rate-cards";
import type { Category, RateCard, RateCardItem } from "@tmcc/shared-types";

export class RateSetError extends Error {
  constructor(public code: "NOT_FOUND" | "NOT_DRAFT") {
    super(code);
  }
}

// The card the BOQ should use: latest APPROVED set merged over the placeholder.
export async function getEffectiveRateCard(
  city: string,
  category: Category,
): Promise<RateCard | null> {
  const row = await prisma.rateSet.findFirst({
    where: { city, category, status: "APPROVED" },
    orderBy: { approvedAt: "desc" },
  });

  const approved: RateCard | undefined = row
    ? {
        city,
        category,
        taxPercent: row.taxPercent,
        items: row.items as unknown as RateCardItem[],
      }
    : undefined;

  return mergeRateCards(getRateCard(city, category), approved) ?? null;
}

export async function approveRateSet(
  id: string,
  approvedBy: string,
  items?: RateCardItem[],
) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.rateSet.findUnique({ where: { id } });
    if (!target) throw new RateSetError("NOT_FOUND");
    if (target.status !== "DRAFT") throw new RateSetError("NOT_DRAFT");

    await tx.rateSet.updateMany({
      where: {
        city: target.city,
        category: target.category,
        status: "APPROVED",
      },
      data: { status: "SUPERSEDED" },
    });
    return tx.rateSet.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy,
        ...(items ? { items: items as unknown as object } : {}),
      },
    });
  });
}

export async function rejectRateSet(id: string) {
  return prisma.rateSet.update({ where: { id }, data: { status: "REJECTED" } });
}
