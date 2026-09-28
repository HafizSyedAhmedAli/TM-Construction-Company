// packages/render-engine/src/generate-render.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Geometry } from "@tmcc/shared-types";

const generateTextMock = vi.fn();
vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

const googleModelMock = vi.fn((model: string) => ({ modelId: model }));
vi.mock("@ai-sdk/google", () => ({
  google: (model: string) => googleModelMock(model),
}));

vi.mock("./schematic-png", () => ({
  buildSchematicPng: vi.fn().mockResolvedValue(Buffer.from("fake-png-bytes")),
}));

import { generateRender } from "./generate-render";

const oneRoom: Geometry = {
  walls: [],
  rooms: [{ id: "r1", name: "Kitchen", area: 47, type: "kitchen" }],
  openings: [],
};

describe("generateRender", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_IMAGE_PROVIDER;
    delete process.env.AI_IMAGE_MODEL;
  });

  it("calls generateText with the schematic image and built prompt, via generateText (not generateImage)", async () => {
    generateTextMock.mockResolvedValue({
      files: [{ mimeType: "image/png", uint8Array: new Uint8Array([1, 2, 3]) }],
    });

    await generateRender({ geometry: oneRoom, category: "B" });

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    const call = generateTextMock.mock.calls[0][0];
    expect(call.providerOptions).toEqual({
      google: { responseModalities: ["TEXT", "IMAGE"] },
    });
    expect(call.messages[0].content[0].type).toBe("text");
    expect(call.messages[0].content[0].text).toContain("Kitchen");
    expect(call.messages[0].content[1]).toEqual({
      type: "image",
      image: Buffer.from("fake-png-bytes"),
    });
  });

  it("respects AI_IMAGE_MODEL when set", async () => {
    process.env.AI_IMAGE_MODEL = "gemini-3-pro-image-preview";
    generateTextMock.mockResolvedValue({
      files: [{ mimeType: "image/png", uint8Array: new Uint8Array() }],
    });

    await generateRender({ geometry: oneRoom, category: "A" });
    expect(googleModelMock).toHaveBeenCalledWith("gemini-3-pro-image-preview");
  });

  it("throws a clear error for an unsupported AI_IMAGE_PROVIDER", async () => {
    process.env.AI_IMAGE_PROVIDER = "openai";
    await expect(
      generateRender({ geometry: oneRoom, category: "A" }),
    ).rejects.toThrow(/Unsupported AI_IMAGE_PROVIDER/);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("returns the first image file's bytes, mime type, and the prompt used", async () => {
    const bytes = new Uint8Array([9, 9, 9]);
    generateTextMock.mockResolvedValue({
      files: [{ mimeType: "image/png", uint8Array: bytes }],
    });

    const result = await generateRender({ geometry: oneRoom, category: "C" });
    expect(result.image).toBe(bytes);
    expect(result.mimeType).toBe("image/png");
    expect(result.promptUsed).toContain("Kitchen");
  });

  it("throws (rather than silently returning nothing) if the model returns no image file — caller must catch this per NFR-7", async () => {
    generateTextMock.mockResolvedValue({ files: [] });
    await expect(
      generateRender({ geometry: oneRoom, category: "B" }),
    ).rejects.toThrow(/returned no image/);
  });
});

it("defaults to the google provider and gemini-3.1-flash-image when no env vars are set", async () => {
  generateTextMock.mockResolvedValue({
    files: [{ mimeType: "image/png", uint8Array: new Uint8Array() }],
  });
  await generateRender({ geometry: oneRoom, category: "A" });
  expect(googleModelMock).toHaveBeenCalledWith("gemini-3.1-flash-image");
});

it("treats an empty AI_IMAGE_MODEL as unset", async () => {
  process.env.AI_IMAGE_MODEL = "   ";
  generateTextMock.mockResolvedValue({
    files: [{ mimeType: "image/png", uint8Array: new Uint8Array() }],
  });
  await generateRender({ geometry: oneRoom, category: "A" });
  expect(googleModelMock).toHaveBeenCalledWith("gemini-3.1-flash-image");
});
