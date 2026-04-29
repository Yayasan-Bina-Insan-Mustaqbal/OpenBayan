import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['100.64.8.38'],
  turbopack: {
    root: appDir,
  },
};

export default nextConfig;
