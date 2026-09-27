// packages/render-engine/src/generate-render.ts
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { Category, Geometry } from "@tmcc/shared-types";
import { buildRenderPrompt } from "./build-render-prompt";
import { buildSchematicPng } from "./schematic-png";

export interface GenerateRenderInput {
  geometry: Geometry;
  category: Category;
}

export interface GenerateRenderResult {
  image: Uint8Array;
  mimeType: string;
  promptUsed: string;
}

// FR-16 / §9.2, NFR-6: provider + model come from env, not a hardcoded call
// site, so swapping off the Gemini free tier later (§9.2 flags the provider
// as not yet finalized) is a config change — the same swappable-service
// shape §NFR-6 already asks for on CAD parsing, and that rate-cards uses
// for pricing.
//
// This deliberately does NOT use the AI SDK's `generateImage()` helper.
// Gemini image models (gemini-2.5-flash-image, "Nano Banana") are
// multimodal *language* models under the hood — `generateImage()` only
// takes a plain string prompt with no way to attach an input image, so it
// can only do text-to-image, not the image-EDIT (schematic-in, render-out)
// this feature needs. generateText() with responseModalities:
// ["TEXT","IMAGE"] is the documented path for image editing with this
// provider — see https://ai-sdk.dev/providers/ai-sdk-providers/google and
// https://github.com/vercel/ai/issues/14044 for why generateImage() can't
// do this as of the AI SDK version pinned in package.json.
function resolveModel() {
  const provider = process.env.AI_IMAGE_PROVIDER ?? "google";
  if (provider !== "google") {
    throw new Error(
      `Unsupported AI_IMAGE_PROVIDER "${provider}" — only "google" (Gemini) is wired up so far.`,
    );
  }
  return google(process.env.AI_IMAGE_MODEL ?? "gemini-2.5-flash-image");
}

// NFR-7: this function is expected to fail sometimes (rate limits, an
// unavailable third-party service) — callers (see the render route) must
// catch that and must NOT let it block BOQ generation, which is entirely
// independent (§9.3/§3 note: BOQ and the render both consume the same
// parsed geometry independently; neither feeds the other).
export async function generateRender({
  geometry,
  category,
}: GenerateRenderInput): Promise<GenerateRenderResult> {
  const promptUsed = buildRenderPrompt(geometry, category);
  const schematicPng = await buildSchematicPng(geometry);

  const result = await generateText({
    model: resolveModel(),
    providerOptions: {
      google: { responseModalities: ["TEXT", "IMAGE"] },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: promptUsed },
          { type: "image", image: schematicPng },
        ],
      },
    ],
  });

  const imageFile = result.files.find((f) => f.mimeType.startsWith("image/"));
  if (!imageFile) {
    throw new Error(
      "AI image service returned no image for this render request.",
    );
  }

  return {
    image: imageFile.uint8Array,
    mimeType: imageFile.mimeType,
    promptUsed,
  };
}
