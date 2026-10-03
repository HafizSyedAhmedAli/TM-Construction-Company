import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp ships a native binary; react-pdf must also run as-is server-side.
  serverExternalPackages: ["sharp", "@react-pdf/renderer"],
  transpilePackages: [
    "@tmcc/shared-types",
    "@tmcc/lead-intake",
    "@tmcc/boq-engine",
    "@tmcc/rate-cards",
    "@tmcc/rate-research",
    "@tmcc/cad-parser",
    "@tmcc/db",
  ],
  outputFileTracingIncludes: {
    "/api/projects/[id]/boq-pdf": ["./public/tmcc-logo-full.png"],
  },
};

export default nextConfig;
