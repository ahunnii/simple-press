// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Optional release identifier. No dedicated release/commit-SHA env var exists
// in this project's env.js yet (checked: no VERCEL_GIT_COMMIT_SHA-equivalent
// is set by the Coolify deploy). Read directly (not through env.js) so this
// stays optional and never fails the build when unset — set
// NEXT_PUBLIC_APP_VERSION in the deploy environment to enable release
// tagging/grouping in Sentry. `NEXT_PUBLIC_`-prefixed vars are inlined by
// Next.js at build time even without env.js registration.
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

  // Tag events with the deploy version, if known, so issues can be grouped
  // and regression-tracked by release. See `release` comment above.
  release,

  // Conservative, standard community list of benign browser noise that isn't
  // an actionable bug — kept small on purpose (the 10% tracesSampleRate quota
  // is precious, and over-filtering risks hiding real errors). Never add a
  // real application error message here.
  ignoreErrors: [
    // Harmless browser quirk, fires constantly on some devices/zoom levels.
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Thrown by non-Error values passed to Promise.reject / thrown across
    // some third-party/browser boundaries — not actionable without a stack.
    "Non-Error promise rejection captured",
    "Non-Error exception captured",
    // Fetch/XHR aborted because the user navigated away or a component
    // unmounted mid-request — expected, not a bug.
    "AbortError: The user aborted a request.",
    "The operation was aborted.",
    "The user aborted a request.",
    // Common browser-extension (ad blockers, password managers, translators)
    // injection errors that surface as uncaught script errors we can't fix.
    "top.GLOBALS",
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "atomicFindClose",
    "fb_xd_fragment",
    "bmi_SafeAddOnload",
    "EBCallBackMessageReceived",
    "conduitPage",
    "ResizeObserver is not defined",
  ],
  // Errors whose stack trace originates from a browser extension's own
  // injected script — never our code, never actionable.
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
    /^safari-web-extension:\/\//i,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
