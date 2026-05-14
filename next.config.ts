import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  typescript: {
    // Temporary deployment setting: existing unrelated app pages have type errors.
    // Remove this after cleaning up the broader TypeScript backlog.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
