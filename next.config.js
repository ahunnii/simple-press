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

  experimental: {
    // Store-transfer imports POST a zip as the request body. Middleware buffers
    // request bodies and caps them at 10MB by default; raise it to match the
    // import route's own 200MB guard (MAX_UPLOAD_BYTES in
    // src/app/api/admin/store-transfer/import/route.ts).
    middlewareClientMaxBodySize: "200mb",

    // Next only defaults build workers on when there is no custom `webpack`
    // config, and `withSentryConfig` adds one — so without this the server,
    // edge and client compiles share one process and its heap never shrinks.
    // Workers give each compile its own process. Output is identical.
    webpackBuildWorker: true,

    // Trims webpack-sources string buffer caching during compilation to lower
    // peak memory (slightly slower builds; output unchanged). Together with
    // the build worker, this keeps Sentry source-map builds (SENTRY_AUTH_TOKEN
    // set, e.g. on Coolify) from getting OOM-killed.
    webpackMemoryOptimizations: true,
  },

  // Production builds keep webpack's cache in memory instead of serializing it
  // to .next/cache. With Sentry source maps on, that pack-file serialization
  // (after the server compile) was the step that exhausted the ~4GB heap on
  // Coolify. Output is unchanged. Trade-off: Nixpacks persists .next/cache
  // between deploys via a BuildKit cache mount, so builds lose incremental
  // reuse and may take longer. Runtime caches (images, fetch) are written by
  // the server, not webpack, and are unaffected. Dev is untouched.
  webpack: (config, { dev }) => {
    if (config.cache && !dev) {
      config.cache = Object.freeze({ type: "memory" });
    }
    return config;
  },

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
      {
        protocol: "https",
        hostname: "*.ytimg.com",
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
          // NOTE: Strict-Transport-Security is deliberately NOT set here either.
          // Whether `includeSubDomains` is appropriate depends on the HOST —
          // it is right for the platform apex + tenant subdomains, but wrong
          // on a tenant's custom domain (it would force HTTPS on every other
          // subdomain that business runs, for two years). Static headers can't
          // see the host, so HSTS is built per-request in `src/middleware.ts`
          // (`buildHsts` in `src/lib/security/csp.ts`).
          // NOTE: Content-Security-Policy is deliberately NOT set here. It
          // carries a per-request nonce, so it is built in `src/middleware.ts`
          // (see `src/lib/security/csp.ts`). Static headers here are shared by
          // every response and could not carry one.
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

  // Source maps are only useful if they can be uploaded, which needs
  // SENTRY_AUTH_TOKEN. Without it (local builds), generating `hidden-source-map`
  // output for every server chunk (~90MB of .map files for ~220MB of server JS)
  // pushes the webpack compile past Node's default ~4.5GB V8 heap and the build
  // dies with "JavaScript heap out of memory". Skip generation when it would be
  // thrown away anyway; builds with a token behave exactly as before.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },

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
