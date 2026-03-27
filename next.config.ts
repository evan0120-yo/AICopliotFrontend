import type { NextConfig } from "next";

const backendOrigin =
  process.env.INTERNAL_AI_COPILOT_BACKEND_ORIGIN ??
  process.env.REWARDBRIDGE_BACKEND_ORIGIN ??
  "http://localhost:8082";

const nextConfig: NextConfig = {
  experimental: {
    proxyTimeout: 600000,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
