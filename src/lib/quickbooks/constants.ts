/**
 * Static, dependency-free QuickBooks Online (QBO) integration constants.
 *
 * Nothing in this file reads an env var, touches the DB, or imports anything
 * server-only — it is safe to import from a client component (e.g. an admin
 * settings page that needs `QBO_MIN_INVOICE_SYNC_INTERVAL_MS` to render a
 * "next sync" hint). Platform credentials (client id/secret) belong in
 * `~/env` and are read by the OAuth/client modules, not here.
 */

/** The single Intuit OAuth scope this integration requests — accounting only. */
export const QBO_SCOPE = "com.intuit.quickbooks.accounting";

/** Intuit's OAuth2 authorization endpoint (redirects the owner to Intuit's consent screen). */
export const QBO_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";

/** Intuit's OAuth2 token endpoint — used for both the initial code exchange and refresh-token grants. */
export const QBO_TOKEN_URL =
  "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

/** Intuit's OAuth2 token revocation endpoint — called on disconnect. */
export const QBO_REVOKE_URL =
  "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

/** Path (not a full URL) the OAuth authorize request's `redirect_uri` resolves to. */
export const QBO_REDIRECT_PATH = "/api/quickbooks/connect/callback";

/** Which Intuit API environment a connection talks to. Sandbox and production use disjoint realms. */
export type QboEnvironment = "sandbox" | "production";

/**
 * Base URL for the QBO Accounting API, per environment. NO trailing slash —
 * the API client builds request URLs as
 * `${QBO_API_BASE[env]}/v3/company/${realmId}${path}`.
 */
export const QBO_API_BASE: Record<QboEnvironment, string> = {
  sandbox: "https://sandbox-quickbooks.api.intuit.com",
  production: "https://quickbooks.api.intuit.com",
};

/** QBO web app base URL, per environment — used to build owner-facing "Open in QuickBooks" links. NO trailing slash. */
export const QBO_APP_BASE: Record<QboEnvironment, string> = {
  sandbox: "https://app.sandbox.qbo.intuit.com",
  production: "https://app.qbo.intuit.com",
};

/**
 * Builds the QBO web app URL for viewing a given invoice — the owner-facing
 * "Open in QuickBooks" link shown next to a synced invoice in the admin UI.
 */
export function qboInvoiceUrl(
  environment: QboEnvironment,
  qboInvoiceId: string,
): string {
  return `${QBO_APP_BASE[environment]}/app/invoice?txnId=${encodeURIComponent(qboInvoiceId)}`;
}

/**
 * Pinned Intuit "minor version" sent as `?minorversion=` on every API
 * request. Intuit deprecates old minor versions on a schedule — verify this
 * value against Intuit's current deprecation schedule before bumping it, and
 * bump deliberately (a minor version change can alter response shapes).
 */
export const QBO_MINOR_VERSION = 75;

/** Minimum time between automatic invoice-status sync runs for a single business. */
export const QBO_MIN_INVOICE_SYNC_INTERVAL_MS = 30 * 60 * 1000;

/** Max invoices processed in a single sync/poll batch run. */
export const QBO_SYNC_BATCH = 100;

/** Max ids per `IN (...)` clause in a QBO query — Intuit's query API has its own row/length limits. */
export const QBO_QUERY_CHUNK = 50;

/** Max length an error message is truncated to before being stored/logged. */
export const QBO_MAX_ERROR_LENGTH = 500;

/** Timeout applied to every outbound QBO API request. */
export const QBO_REQUEST_TIMEOUT_MS = 10_000;

/** Refresh the access token this many ms before its reported expiry, to avoid racing a request against expiry. */
export const QBO_ACCESS_TOKEN_SKEW_MS = 60_000;

/**
 * Stamped on `QuickBooksInvoice.lastError` for rows whose `realmId` no longer
 * matches the connected company. Owner-facing — it appears verbatim in the
 * admin invoice list.
 *
 * Lives here rather than in `sync.ts` because two very different callers write
 * it: the sync engine (defensively, for a row that somehow still qualifies)
 * and the OAuth callback (the moment the company actually changes). A shared
 * literal is what keeps the admin list from showing two wordings for one
 * condition.
 */
export const QBO_REALM_MISMATCH_ERROR =
  "Belongs to a previous QuickBooks company";

/**
 * The owner-facing explanation for a connection made against a DIFFERENT
 * Intuit environment than this deployment is configured for.
 *
 * Sandbox and production realms are disjoint, so a sandbox connection's realm
 * id and invoice ids mean nothing to the production API (and vice versa) —
 * every call would fail, or worse, resolve against the wrong company's books.
 * The only fix is a reconnect, so the message says so. Shared verbatim by the
 * tRPC router's precondition check and the sync engine's per-business skip.
 */
export function qboEnvironmentMismatchMessage(
  connectionEnvironment: QboEnvironment,
  platformEnvironment: QboEnvironment,
): string {
  return `This QuickBooks connection was made in ${connectionEnvironment} mode, but this deployment is configured for ${platformEnvironment}. Reconnect QuickBooks in Settings → Integrations.`;
}
