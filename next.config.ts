import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // v2.5.0 - Force cache invalidation
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  // "Team & Access" is temporarily dropped from the product. These redirects
  // make /team (and its sub-routes) unreachable; the nav item is hidden in
  // src/lib/navigation.ts. Remove both to bring the feature back.
  async redirects() {
    return [
      { source: "/team", destination: "/", permanent: false },
      { source: "/team/:path*", destination: "/", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/public/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
      {
        source: "/embed/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
