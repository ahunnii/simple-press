// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Optional release identifier — mirrors src/instrumentation-client.ts so
// edge-runtime events group under the same release. No dedicated
// release/commit-SHA env var exists in this project yet; set
// NEXT_PUBLIC_APP_VERSION in the deploy environment to enable it. Read
// directly (not through env.js) so it stays optional and never fails the build.
const release = process.env.NEXT_PUBLIC_APP_VERSION ?? undefined;

Sentry.init({
  dsn: "https://5e6a011a5bdc2f14efa396319877120e@o4511181241384960.ingest.us.sentry.io/4511181245972480",

  enabled: process.env.NODE_ENV === "production",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,

  // Tag events with the deploy version, if known — see `release` comment above.
  release,
});
