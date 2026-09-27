// apps/web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp (pulled in via @tmcc/render-engine, for schematic rasterization)
  // ships a native binary — it must run as-is server-side, not get bundled.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;