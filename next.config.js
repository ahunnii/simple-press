/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

// Injected content via Sentry wizard below

import { withSentryConfig } from "@sentry/nextjs";

import { env } from "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Keep Prisma (and the field-encryption extension, which does a bare
  // `require("@prisma/client")`) as server-only externals. Without this, Next
  // tries to bundle `@prisma/client`, hits its browser entry, and fails to
  // resolve `.prisma/client/index-browser` (this project generates the client
  // to the custom `generated/prisma` path, so the default location is absent).
  serverExternalPackages: ["@prisma/client", "prisma-field-encryption"],

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

// export default config;

const withSentry = withSentryConfig(config, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "center-for-generative-justice",
  project: "simple-press",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring-tunnel",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});

export default withSentry;
