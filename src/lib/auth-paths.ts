/**
 * Single source of truth for Better Auth UI's route configuration.
 *
 * These values are consumed in two places that must never drift apart:
 *
 *   1. `<AuthProvider>` in `src/providers/providers.tsx`, which uses them to
 *      build every link and redirect the auth components emit.
 *   2. `generateStaticParams()` in
 *      `src/app/(storefront)/account/[path]/page.tsx`, which prerenders the
 *      account routes.
 *
 * If they disagree, the UI links to routes that don't exist (or, worse, that
 * exist but 404 because `dynamicParams = false`).
 *
 * The values below deliberately preserve SimplePress's pre-existing URLs.
 * Better Auth UI's own defaults are `basePaths.settings = "/settings"` and
 * `viewPaths.settings.account = "account"`, which would have moved the account
 * pages to `/settings/account`. These are already-shipped, linked, and indexed
 * URLs, so we override rather than migrate.
 */

/**
 * Route prefixes for the auth and settings sections.
 *
 * `settings` maps onto SimplePress's storefront account section
 * (`src/app/(storefront)/account/`), not a top-level `/settings` route.
 */
export const AUTH_BASE_PATHS = {
  auth: "/auth",
  settings: "/account",
} as const;

/**
 * Path segments for the auth views, keyed by Better Auth UI's view names.
 *
 * These happen to match the library's defaults, but are declared explicitly so
 * an upstream default change can't silently repoint `/auth/*` — every one of
 * these already exists as a route under `src/app/auth/`.
 */
export const AUTH_VIEW_PATHS = {
  redirect: "redirect",
  signIn: "sign-in",
  signUp: "sign-up",
  forgotPassword: "forgot-password",
  resetPassword: "reset-password",
  resetLinkSent: "reset-link-sent",
  signOut: "sign-out",
  verifyEmail: "verify-email",
} as const;

/**
 * Path segments for the settings views.
 *
 * Note `account: "settings"` — the library calls this view "account", but the
 * live URL is `/account/settings`, so the segment is renamed rather than the
 * route.
 */
export const SETTINGS_VIEW_PATHS = {
  account: "settings",
  security: "security",
} as const;

/**
 * The account paths that `/account/[path]` serves.
 *
 * Used by `generateStaticParams()`. Because that route sets
 * `dynamicParams = false`, this list is exhaustive: anything not in it 404s.
 */
export const ACCOUNT_PATHS = Object.values(SETTINGS_VIEW_PATHS);

/**
 * Query parameter the auth UI reads its post-sign-in destination from.
 *
 * Better Auth UI reads this name and only this name off `window.location.search`.
 * SimplePress historically also emitted `?redirect=` and `?callbackUrl=`; those
 * are normalized to this at the route level.
 */
export const REDIRECT_PARAM = "redirectTo";

/** Legacy destination params still honoured on inbound links (bookmarks, already-sent emails). */
export const LEGACY_REDIRECT_PARAMS = ["redirect", "callbackUrl"] as const;

/**
 * Reduce a caller-supplied destination to a safe same-origin path.
 *
 * Returns `fallback` for anything that could navigate off-site. This is an
 * open-redirect guard: `redirectTo` arrives from the query string, so an
 * attacker can put anything in it and use a trusted SimplePress sign-in link as
 * a launchpad — the exact sink recorded in
 * `docs/audit/2026-07-13-polish-audit.md`.
 *
 * Rejects, in order:
 * - non-strings and empty values
 * - anything with a scheme (`https:`, `javascript:`, `data:`) — checked before
 *   decoding so `java%73cript:` can't sneak through
 * - protocol-relative (`//evil.com`) and backslash (`/\evil.com`) forms, which
 *   browsers resolve as absolute URLs
 * - control characters (`\n`, `\t`, NUL) used to split or confuse parsers
 *
 * Decoding is applied repeatedly before the checks so layered encodings
 * (`%252f%252f`) collapse to the form the browser will actually resolve.
 */
export function sanitizeRedirectTo(
  raw: string | null | undefined,
  fallback = "/",
): string {
  if (typeof raw !== "string" || raw.length === 0) return fallback;

  // Collapse layered percent-encoding. Bounded so a malformed or adversarial
  // input can't spin here; 3 rounds is far more than any legitimate link uses.
  let value = raw;
  for (let i = 0; i < 3; i++) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      // Malformed encoding — untrustworthy, so refuse it outright.
      return fallback;
    }
    if (decoded === value) break;
    value = decoded;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) return fallback;

  // Control characters (CR/LF/TAB/NUL and friends) never appear in a real path.

  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return fallback;

  // Must be a rooted path...
  if (!trimmed.startsWith("/")) return fallback;
  // ...but not one the browser would read as protocol-relative.
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;

  return trimmed;
}

/**
 * Pull a destination out of a request's search params, honouring the legacy
 * parameter names, and sanitize it.
 *
 * Accepts the loose shape Next.js gives a page's `searchParams` so route
 * components can pass it straight through.
 */
export function resolveRedirectTo(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  fallback = "/",
): string {
  if (!searchParams) return fallback;

  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const candidate =
    first(searchParams[REDIRECT_PARAM]) ??
    LEGACY_REDIRECT_PARAMS.map((name) => first(searchParams[name])).find(
      (value) => typeof value === "string" && value.length > 0,
    );

  return sanitizeRedirectTo(candidate, fallback);
}

/**
 * Build the canonical URL for an auth route when the request arrived with a
 * legacy destination param, or `null` when it's already canonical.
 *
 * The auth components read `?redirectTo` off `window.location.search` on the
 * client and never see server-side props, so a request carrying only
 * `?redirect=` or `?callbackUrl=` would silently lose its destination. Route
 * shells redirect through this first, which both preserves old inbound links
 * (bookmarks, invite emails already sent) and guarantees the value the client
 * later reads has been through {@link sanitizeRedirectTo}.
 *
 * @param basePath  The auth route being served, e.g. `/auth/sign-in`.
 */
export function canonicalRedirectUrl(
  basePath: string,
  searchParams: Record<string, string | string[] | undefined> | undefined,
): string | null {
  if (!searchParams) return null;

  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const current = first(searchParams[REDIRECT_PARAM]);
  const hasCanonical = typeof current === "string" && current.length > 0;

  const resolved = resolveRedirectTo(searchParams, "");

  // Already canonical *and* already safe — nothing to do. When the incoming
  // `redirectTo` is unsafe, `resolved` differs from `current` and we fall
  // through to rewrite it to the sanitized value (or drop it entirely).
  if (hasCanonical && current === resolved) return null;

  // No usable destination anywhere. Only worth redirecting if we need to strip
  // a legacy or unsafe param that's still sitting in the URL.
  if (!resolved) {
    const hasStaleParam =
      hasCanonical ||
      LEGACY_REDIRECT_PARAMS.some((name) => first(searchParams[name]));
    return hasStaleParam ? basePath : null;
  }

  return `${basePath}?${REDIRECT_PARAM}=${encodeURIComponent(resolved)}`;
}
