const DEFAULT_CF_MODEL = "@cf/black-forest-labs/flux-1-schnell";

export async function generateWithCloudflare({
  prompt,
}: {
  prompt: string;
}): Promise<{ image: Uint8Array; mimeType: string }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !token) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set for the cloudflare provider.",
    );
  }
  const model = process.env.AI_IMAGE_MODEL?.trim() || DEFAULT_CF_MODEL;

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      // flux-1-schnell caps prompts at about 2048 chars and steps at 8
      body: JSON.stringify({ prompt: prompt.slice(0, 2000), steps: 8 }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Cloudflare AI request failed (${res.status}): ${detail.slice(0, 300)}`,
    );
  }

  const json = (await res.json()) as { result?: { image?: string } };
  const b64 = json.result?.image;
  if (!b64) throw new Error("Cloudflare AI returned no image.");
  return {
    image: new Uint8Array(Buffer.from(b64, "base64")),
    mimeType: "image/jpeg",
  };
}
