import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Do not let `next dev` write an AGENTS.md into the project.
  agentRules: false,
  experimental: {
    // Room for a 10 MB badge upload plus the form around it (MAX_IMAGE_BYTES in src/lib/images.ts).
    serverActions: { bodySizeLimit: "11mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No framing: stops clickjacking on the admin approve/delete buttons.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Fetched by the client mod; only Discord (stable, canary, ptb) may read it from a browser.
      // Set here, not in the route, so error responses carry it too.
      { source: "/badges.json", headers: [{ key: "Vary", value: "Origin" }] },
      {
        source: "/badges.json",
        has: [{ type: "header", key: "origin", value: "(?<origin>https://(?:canary\\.|ptb\\.)?discord\\.com)" }],
        headers: [{ key: "Access-Control-Allow-Origin", value: ":origin" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
