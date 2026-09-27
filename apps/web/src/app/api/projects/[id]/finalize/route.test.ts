// apps/web/src/app/api/projects/[id]/finalize/route.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Geometry } from "@tmcc/shared-types";
import { POST } from "./route";

vi.mock("@tmcc/db", () => ({
  prisma: {
    project: { findUnique: vi.fn(), update: vi.fn() },
    cadFile: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "@tmcc/db";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req() {
  return new Request("http://localhost/api/projects/p1/finalize", {
    method: "POST",
  });
}

const GEOMETRY: Geometry = {
  walls: [
    {
      id: "w1",
      startX: 0,
      startY: 0,
      endX: 20,
      endY: 0,
      length: 20,
      height: 10,
      thickness: 0.75,
    },
  ],
  rooms: [
    { id: "r1", name: "Living", area: 300, type: "general" },
    { id: "r2", name: "Bathroom 1", area: 40, type: "bathroom" },
  ],
  openings: [{ id: "o1", type: "door", width: 3, height: 7 }],
};

describe("POST /api/projects/:id/finalize", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404s when the project doesn't exist", async () => {
    (prisma.project.findUnique as any).mockResolvedValue(null);

    const res = await POST(req() as any, ctx("missing"));
    expect(res.status).toBe(404);
    expect(prisma.cadFile.findUnique).not.toHaveBeenCalled();
  });

  it("404s when no CAD file has been uploaded for the project yet", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "p1",
      city: "Karachi",
      category: "B",
    });
    (prisma.cadFile.findUnique as any).mockResolvedValue(null);

    const res = await POST(req() as any, ctx("p1"));
    expect(res.status).toBe(404);
    expect(prisma.cadFile.update).not.toHaveBeenCalled();
  });

  it("422s with a clear message when no rate card exists for the project's city/category (FR-15/NFR-4)", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "p1",
      city: "Multan",
      category: "B",
    });
    (prisma.cadFile.findUnique as any).mockResolvedValue({
      id: "cad_1",
      projectId: "p1",
      geometry: GEOMETRY,
    });

    const res = await POST(req() as any, ctx("p1"));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error).toMatch(/multan/i);
    expect(prisma.cadFile.update).not.toHaveBeenCalled();
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it("prices the project's real geometry, persists the BOQ, and marks the project FINALIZED", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "p1",
      city: "Karachi",
      category: "B",
    });
    (prisma.cadFile.findUnique as any).mockResolvedValue({
      id: "cad_1",
      projectId: "p1",
      geometry: GEOMETRY,
    });
    (prisma.cadFile.update as any).mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: "cad_1",
        projectId: "p1",
        geometry: GEOMETRY,
        ...data,
      }),
    );

    const res = await POST(req() as any, ctx("p1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.boq.total).toBeGreaterThan(0);
    expect(
      json.boq.lineItems.find((l: any) => l.itemType === "sanitary")?.quantity,
    ).toBe(1);

    expect(prisma.cadFile.update).toHaveBeenCalledWith({
      where: { projectId: "p1" },
      data: { boq: json.boq },
    });
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "FINALIZED" },
    });
  });
});
