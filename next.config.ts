import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "pdf-parse", "pdf-lib"],
  env: {
    NEXT_PUBLIC_MAX_FILE_SIZE_MB: process.env.MAX_FILE_SIZE_MB ?? "25",
  },
};

export default nextConfig;
