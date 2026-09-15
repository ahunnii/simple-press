/**
 * Content-Security-Policy (REPORT-ONLY) construction.
 *
 * This module is imported by `src/middleware.ts`, which runs on the **edge
 * runtime**. That means:
 *   - no `node:crypto` (use Web Crypto, which the edge runtime provides),
 *   - no import of `~/env` (it pulls in `@t3-oss/env-nextjs` + zod and is not
 *     worth the edge bundle); read `process.env.*` directly instead. Every var
 *     read here is already declared and validated in `src/env.js`.
 *
 * Nothing in here can block a request: the policy is emitted under
 * `Content-Security-Policy-Report-Only`, so browsers report violations and
 * enforce nothing.
 */

/**
 * Sentry's CSP report ingestion endpoint, derived from the project DSN that is
 * already hardcoded (public by design) in `sentry.server.config.ts`:
 *
 *   https://5e6a011a5bdc2f14efa396319877120e@o4511181241384960.ingest.us.sentry.io/4511181245972480
 *
 * Sentry's documented security-report URL shape is
 *   https://o<ORG_ID>.ingest.us.sentry.io/api/<PROJECT_ID>/security/?sentry_key=<PUBLIC_KEY>
 *
 * Hardcoded rather than plumbed through `env.js` on purpose: the DSN it is
 * built from is already a hardcoded public value in the Sentry configs, so an
 * env var would add deploy surface for zero secrecy.
 */
const SENTRY_CSP_REPORT_URI =
  "https://o4511181241384960.ingest.us.sentry.io/api/4511181245972480/security/?sentry_key=5e6a011a5bdc2f14efa396319877120e";

export const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";

export interface BuildCspOptions {
  /** Dev build: relaxes eval + localhost/HMR origins. Defaults to `NODE_ENV !== "production"`. */
  dev?: boolean;
  /** Preview deployment. Only tags the Sentry report URL. Defaults to `IS_PREVIEW_ENV === "true"`. */
  preview?: boolean;
  /**
   * Origin of the MinIO/S3 bucket (fonts + XHR). Pass `null` to omit it.
   * Defaults to the normalized `NEXT_PUBLIC_STORAGE_URL`.
   */
  storageOrigin?: string | null;
  /**
   * Platform root domain (e.g. `simplepress.co`). Pass `null` to omit it.
   * Defaults to `NEXT_PUBLIC_PLATFORM_DOMAIN`.
   */
  platformDomain?: string | null;
}

/**
 * Generate a fresh CSP nonce: 16 random bytes, base64-encoded (24 chars).
 *
 * Web Crypto only — `node:crypto` is not importable from the edge runtime.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Normalize `NEXT_PUBLIC_STORAGE_URL` into a bare origin.
 *
 * The var is stored **without** a scheme in production (`src/lib/s3/url.ts`
 * builds `https://${NEXT_PUBLIC_STORAGE_URL}/...`), but `.env.example` ships it
 * *with* one (`http://localhost:9000`), so both shapes exist in the wild.
 * Returns `null` when unset or unparseable.
 */
export function resolveStorageOrigin(
  raw: string | null | undefined,
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

/** Join directive sources, dropping any empty/falsy entry so no `  ` or stray token can appear. */
function directive(name: string, sources: (string | false | null)[]): string {
  const parts = sources.filter(
    (source): source is string => typeof source === "string" && source !== "",
  );
  return [name, ...parts].join(" ");
}

/**
 * Build the report-only policy string for one request.
 *
 * Notes on the choices that are easy to get wrong:
 *  - `'strict-dynamic'` makes CSP3 browsers ignore the host allowlist in
 *    `script-src` and trust anything a nonced script inserts (reCAPTCHA and the
 *    Instagram embed both `document.createElement("script")`). The hosts are
 *    kept anyway as the CSP2 fallback.
 *  - `style-src` must keep `'unsafe-inline'`: React `style={{}}` props and
 *    Next's own inline styles are inline styles, and nonces do not apply to
 *    them in a way we can thread through every component.
 *  - `img-src ... https:` is deliberately wide open — owners paste arbitrary
 *    external product/blog image URLs.
 *  - `frame-src` keeps `'self'`/`blob:`/`data:` alongside `https:` so the admin
 *    email preview's `<iframe srcDoc>` (an `about:srcdoc` document) cannot
 *    report on browsers that still check `frame-src` for it.
 */
export function buildCsp(nonce: string, opts: BuildCspOptions = {}): string {
  const dev = opts.dev ?? process.env.NODE_ENV !== "production";
  const preview = opts.preview ?? process.env.IS_PREVIEW_ENV === "true";
  const storageOrigin =
    opts.storageOrigin !== undefined
      ? opts.storageOrigin
      : resolveStorageOrigin(process.env.NEXT_PUBLIC_STORAGE_URL);
  const platformDomainRaw =
    opts.platformDomain !== undefined
      ? opts.platformDomain
      : (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? null);
  const platformDomain = platformDomainRaw?.trim() ?? "";
  const platformOrigins =
    platformDomain && !platformDomain.includes("localhost")
      ? [`https://${platformDomain}`, `https://*.${platformDomain}`]
      : [];

  const reportUri = `${SENTRY_CSP_REPORT_URI}&sentry_environment=${
    preview ? "preview" : dev ? "development" : "production"
  }`;

  const directives = [
    directive("default-src", ["'self'"]),

    directive("script-src", [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // CSP2 fallback hosts (ignored by CSP3 browsers because of strict-dynamic):
      // reCAPTCHA v3 loader + its gstatic payload, and the Instagram embed script.
      "https://www.google.com",
      "https://www.gstatic.com",
      "https://www.instagram.com",
      // Next dev/Turbopack evals for source maps + React Refresh. Never in prod.
      dev && "'unsafe-eval'",
    ]),

    directive("style-src", ["'self'", "'unsafe-inline'"]),

    directive("img-src", [
      "'self'",
      "data:",
      "blob:",
      "https:",
      dev && "http:",
    ]),

    directive("font-src", ["'self'", "data:", storageOrigin]),

    directive("connect-src", [
      "'self'",
      // reCAPTCHA verification round-trip.
      "https://www.google.com",
      // Sentry. The browser SDK normally tunnels through the same-origin
      // /monitoring-tunnel rewrite, but keep the direct ingest host for the
      // report endpoint and any un-tunnelled transport.
      "https://*.ingest.us.sentry.io",
      // MapLibre basemap styles + tiles.
      "https://basemaps.cartocdn.com",
      "https://*.basemaps.cartocdn.com",
      "https://tiles.openfreemap.org",
      storageOrigin,
      ...platformOrigins,
      // Next HMR / Turbopack websocket in dev.
      dev && "ws:",
      dev && "wss:",
      dev && "http://localhost:*",
    ]),

    directive("frame-src", [
      "'self'",
      "https:",
      "blob:",
      "data:",
      dev && "http://localhost:*",
    ]),

    // MapLibre spawns its tile-decoding workers from a blob: URL.
    directive("worker-src", ["'self'", "blob:"]),
    directive("child-src", ["'self'", "blob:"]),

    directive("media-src", ["'self'", "https:", "data:", "blob:"]),

    directive("object-src", ["'none'"]),
    directive("base-uri", ["'self'"]),
    directive("frame-ancestors", ["'self'"]),

    directive("form-action", [
      "'self'",
      // Post-form 302s that a legitimate flow can land on.
      "https://checkout.stripe.com",
      "https://billing.stripe.com",
      "https://connect.stripe.com",
      "https://appcenter.intuit.com",
      "https://discord.com",
      // Auth callbacks always resolve on the platform domain, even when the
      // form was submitted from a tenant subdomain or custom domain.
      ...platformOrigins,
    ]),

    directive("report-uri", [reportUri]),
  ];

  return directives.join("; ");
}
