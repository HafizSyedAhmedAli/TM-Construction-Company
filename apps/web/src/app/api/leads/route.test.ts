// apps/web/src/app/api/leads/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@tmcc/db", () => ({
  prisma: { lead: { create: vi.fn() } },
}));

import { prisma } from "@tmcc/db";

function req(body: unknown) {
  return new Request("http://localhost/api/leads", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Ahmed Raza",
  contact: "+92-300-1234567",
  city: "Hyderabad",
  model: 2,
  category: "B",
};

describe("POST /api/leads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists a valid lead via prisma and returns 201", async () => {
    (prisma.lead.create as any).mockResolvedValue({ id: "lead_1", ...validBody, source: "FORM", createdAt: new Date() });

    const res = await POST(req(validBody) as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe("lead_1");
    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ...validBody, source: "FORM" }),
    });
  });

  it("returns 400 and does not touch the DB when validation fails (FR-4)", async () => {
    const res = await POST(req({ ...validBody, city: "" }) as any);
    expect(res.status).toBe(400);
    expect(prisma.lead.create).not.toHaveBeenCalled();
  });
});