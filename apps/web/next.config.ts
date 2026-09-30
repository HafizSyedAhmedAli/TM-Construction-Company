import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp ships a native binary; react-pdf must also run as-is server-side.
  serverExternalPackages: ["sharp", "@react-pdf/renderer"],
};

export default nextConfig;
