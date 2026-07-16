import { buildSecurityHeaders } from "./lib/security-headers.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    const dev = process.env.NODE_ENV !== "production";
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders({ dev }),
      },
    ];
  },
};

export default nextConfig;
