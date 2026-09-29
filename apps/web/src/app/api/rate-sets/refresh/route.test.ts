// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@tmcc/db", () => ({ prisma: { rateSet: { create: vi.fn() } } }));
vi.mock("@tmcc/rate-research", () => ({ researchCompleteRates: vi.fn() }));
import { prisma } from "@tmcc/db";
import { researchCompleteRates } from "@tmcc/rate-research";

const req = (body: unknown) =>
  new Request("http://localhost/api/rate-sets/refresh", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("POST /api/rate-sets/refresh", () => {
  beforeEach(() => vi.clearAllMocks());

  it("400s on a bad body without calling Gemini", async () => {
    const res = await POST(req({ city: "", category: "Z" }) as never);
    expect(res.status).toBe(400);
    expect(researchCompleteRates).not.toHaveBeenCalled();
  });

  it("502s and saves nothing when Gemini fails", async () => {
    vi.mocked(researchCompleteRates).mockRejectedValue(new Error("404"));
    const res = await POST(req({ city: "Karachi", category: "B" }) as never);
    expect(res.status).toBe(502);
    expect(prisma.rateSet.create).not.toHaveBeenCalled();
  });

  it("saves a DRAFT gemini rate set on success", async () => {
    vi.mocked(researchCompleteRates).mockResolvedValue({
      items: [{ itemType: "cement", unit: "bag", unitRate: 1400 }],
      sources: {
        items: [],
        grounding: [],
        warnings: [],
        model: "m",
        searchedAt: "2026-09-28T00:00:00Z",
      },
      promptUsed: "p",
    });
    vi.mocked(prisma.rateSet.create).mockResolvedValue({ id: "rs1" } as never);
    const res = await POST(req({ city: "Karachi", category: "B" }) as never);
    expect(res.status).toBe(201);
    expect(
      vi.mocked(prisma.rateSet.create).mock.calls[0][0].data,
    ).toMatchObject({
      city: "Karachi",
      category: "B",
      status: "DRAFT",
      origin: "gemini",
    });
  });
});
