// apps/web/src/components/RenderPanel.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RenderPanel } from "./RenderPanel";

function mockFetchOnce(response: { ok: boolean; json: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: response.ok,
        json: () => Promise.resolve(response.json),
      }),
    ),
  );
}

describe("RenderPanel", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("prompts to upload a CAD file first when none exists yet, with no button", () => {
    render(<RenderPanel projectId="p1" hasCadFile={false} />);

    expect(
      screen.getByText(/upload a cad file above first/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /generate 3d render/i }),
    ).not.toBeInTheDocument();
  });

  it("generates and displays a render (FR-16/17)", async () => {
    mockFetchOnce({
      ok: true,
      json: {
        imageUrl: "/renders/p1.png",
        promptUsed: "isometric render of a two-storey house",
        generatedAt: "2026-09-27T10:00:00.000Z",
      },
    });
    render(<RenderPanel projectId="p1" hasCadFile />);

    await userEvent.click(
      screen.getByRole("button", { name: /generate 3d render/i }),
    );

    expect(fetch).toHaveBeenCalledWith("/api/projects/p1/render", {
      method: "POST",
    });
    expect(await screen.findByAltText(/3d visualization/i)).toHaveAttribute(
      "src",
      expect.stringContaining("/renders/p1.png"),
    );
    // Button relabels for a second pass rather than disappearing.
    expect(
      screen.getByRole("button", { name: /regenerate render/i }),
    ).toBeInTheDocument();
  });

  it("surfaces the NFR-7 error message without crashing when generation fails", async () => {
    mockFetchOnce({
      ok: false,
      json: {
        error:
          "3D render generation failed: rate limited. BOQ finalization is unaffected — you can retry the render separately.",
      },
    });
    render(<RenderPanel projectId="p1" hasCadFile />);

    await userEvent.click(
      screen.getByRole("button", { name: /generate 3d render/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /boq finalization is unaffected/i,
    );
  });

  it("shows a previously generated render immediately, without a fetch, when passed initialRender", () => {
    render(
      <RenderPanel
        projectId="p1"
        hasCadFile
        initialRender={{
          imageUrl: "/renders/p1.png",
          promptUsed: "a prompt",
          generatedAt: "2026-09-27T10:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByAltText(/3d visualization/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /regenerate render/i }),
    ).toBeInTheDocument();
  });
});
