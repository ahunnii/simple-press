/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

import { env } from "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.artisanalfutures.org",
      },
      {
        protocol: "https",
        hostname: "*.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "trendanomaly.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/umami.js",
        destination: `${env.UMAMI_BASE_URL}/script.js`,
      },
      {
        source: "/api/send",
        destination: `${env.UMAMI_BASE_URL}/api/send`,
      },
    ];
  },
};

export default config;
