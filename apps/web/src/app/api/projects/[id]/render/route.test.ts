// apps/web/src/app/api/projects/[id]/render/route.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Geometry } from "@tmcc/shared-types";
import { POST } from "./route";

vi.mock("@tmcc/db", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    cadFile: { findUnique: vi.fn() },
    render: { upsert: vi.fn() },
  },
}));

vi.mock("@tmcc/render-engine", () => ({
  generateRender: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@tmcc/db";
import { generateRender } from "@tmcc/render-engine";
import { writeFile } from "node:fs/promises";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req() {
  return new Request("http://localhost/api/projects/p1/render", {
    method: "POST",
  });
}

const GEOMETRY: Geometry = {
  walls: [],
  rooms: [{ id: "r1", name: "Kitchen", area: 47, type: "kitchen" }],
  openings: [],
};

describe("POST /api/projects/:id/render", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404s when the project doesn't exist", async () => {
    (prisma.project.findUnique as any).mockResolvedValue(null);

    const res = await POST(req() as any, ctx("missing"));
    expect(res.status).toBe(404);
    expect(generateRender).not.toHaveBeenCalled();
  });

  it("404s when no CAD file has been uploaded yet", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "p1",
      category: "B",
    });
    (prisma.cadFile.findUnique as any).mockResolvedValue(null);

    const res = await POST(req() as any, ctx("p1"));
    expect(res.status).toBe(404);
    expect(generateRender).not.toHaveBeenCalled();
  });

  it("passes the project's real geometry and category to generateRender", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "p1",
      category: "A",
    });
    (prisma.cadFile.findUnique as any).mockResolvedValue({
      geometry: GEOMETRY,
    });
    (generateRender as any).mockResolvedValue({
      image: new Uint8Array([1, 2, 3]),
      mimeType: "image/png",
      promptUsed: "a prompt",
    });
    (prisma.render.upsert as any).mockResolvedValue({ id: "render_1" });

    await POST(req() as any, ctx("p1"));

    expect(generateRender).toHaveBeenCalledWith({
      geometry: GEOMETRY,
      category: "A",
    });
  });

  it("returns 502 (not 500) when render generation fails, without touching the project or BOQ (NFR-7)", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "p1",
      category: "B",
    });
    (prisma.cadFile.findUnique as any).mockResolvedValue({
      geometry: GEOMETRY,
    });
    (generateRender as any).mockRejectedValue(new Error("rate limited"));

    const res = await POST(req() as any, ctx("p1"));
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.error).toMatch(/rate limited/);
    expect(json.error).toMatch(/BOQ finalization is unaffected/);
    expect(prisma.render.upsert).not.toHaveBeenCalled();
  });

  it("writes the image to disk and upserts a Render row with the returned imageUrl and prompt", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "p1",
      category: "B",
    });
    (prisma.cadFile.findUnique as any).mockResolvedValue({
      geometry: GEOMETRY,
    });
    (generateRender as any).mockResolvedValue({
      image: new Uint8Array([1, 2, 3]),
      mimeType: "image/png",
      promptUsed: "render this kitchen",
    });
    (prisma.render.upsert as any).mockImplementation(({ create }: any) =>
      Promise.resolve({ id: "render_1", ...create }),
    );

    const res = await POST(req() as any, ctx("p1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(writeFile).toHaveBeenCalledTimes(1);
    const [writtenPath] = (writeFile as any).mock.calls[0];
    expect(writtenPath).toMatch(/p1\.png$/);

    expect(prisma.render.upsert).toHaveBeenCalledWith({
      where: { projectId: "p1" },
      create: {
        projectId: "p1",
        imageUrl: "/renders/p1.png",
        promptUsed: "render this kitchen",
      },
      update: expect.objectContaining({
        imageUrl: "/renders/p1.png",
        promptUsed: "render this kitchen",
      }),
    });
    expect(json.imageUrl).toBe("/renders/p1.png");
  });
});
