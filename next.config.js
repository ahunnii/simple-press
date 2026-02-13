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
