import "server-only";

import type { QboEnvironment } from "~/lib/quickbooks/constants";
import type { QboQueryResponse } from "~/lib/quickbooks/types";
import type { DbClient } from "~/server/db";
import { getQboApiBase } from "~/lib/quickbooks/config";
import {
  QBO_MINOR_VERSION,
  QBO_REQUEST_TIMEOUT_MS,
} from "~/lib/quickbooks/constants";
import { QboApiError } from "~/lib/quickbooks/errors";
import { pickQueryRows } from "~/lib/quickbooks/mapping";
import { getValidAccessToken } from "~/lib/quickbooks/tokens";

/**
 * The authenticated transport for the QBO Accounting API.
 *
 * Every outbound QuickBooks call in the app goes through `qboRequest` — it is
 * the single place that resolves a token, builds a company-scoped URL, pins the
 * minor version, applies the timeout, handles the 401 retry, and converts a
 * non-2xx into a `QboApiError`. Callers above this layer (invoice sync,
 * customer/item resolution) deal in entities, never in HTTP.
 *
 * No token value ever reaches an error message, a log line, or a Sentry event
 * from here: failures carry the HTTP status and Intuit's `Fault` contents only.
 */

export type QboRequestOptions = {
  method?: "GET" | "POST";
  /** Path BELOW the company scope, with a leading slash — e.g. `/invoice`, `/query`, `/invoice/42/send`. */
  path: string;
  /** Serialized as JSON unless `contentType` says otherwise. Omit for GETs. */
  body?: unknown;
  /** Extra query params. `undefined` values are dropped, so optional params need no call-site branching. */
  query?: Record<string, string | number | undefined>;
  /**
   * Overrides `application/json`. The one real use is
   * `application/octet-stream` on `/invoice/{id}/send`, which Intuit requires
   * with an EMPTY body — see `buildRequestBody`.
   */
  contentType?: string;
};

/** The token/realm/environment triple resolved once per attempt and reused for the retry. */
type RequestContext = {
  accessToken: string;
  realmId: string;
  environment: QboEnvironment;
};

/**
 * `{apiBase}/v3/company/{realmId}{path}?minorversion=...&...query`
 *
 * `minorversion` is set FIRST so an explicit `query` entry of the same name
 * would win — nothing does that today, but a caller pinning a different minor
 * version for one endpoint shouldn't be silently overridden.
 */
function buildUrl(ctx: RequestContext, opts: QboRequestOptions): string {
  const base = `${getQboApiBase(ctx.environment)}/v3/company/${encodeURIComponent(ctx.realmId)}${opts.path}`;
  const url = new URL(base);

  url.searchParams.set("minorversion", String(QBO_MINOR_VERSION));

  for (const [key, value] of Object.entries(opts.query ?? {})) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

/**
 * Returns the wire body, or `undefined` for a bodyless request.
 *
 * The `application/octet-stream` case is not a quirk of ours: Intuit's
 * "send invoice by email" endpoint (`POST /invoice/{id}/send`) requires that
 * content type with an EMPTY payload, and rejects the request if a JSON body
 * turns up instead.
 */
function buildRequestBody(
  method: "GET" | "POST",
  opts: QboRequestOptions,
): string | undefined {
  if (method === "GET") return undefined;
  if (opts.contentType === "application/octet-stream") return "";
  return opts.body === undefined ? undefined : JSON.stringify(opts.body);
}

async function sendRequest(
  ctx: RequestContext,
  opts: QboRequestOptions,
): Promise<Response> {
  const method = opts.method ?? "GET";
  const body = buildRequestBody(method, opts);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${ctx.accessToken}`,
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = opts.contentType ?? "application/json";
  }

  return await fetch(buildUrl(ctx, opts), {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(QBO_REQUEST_TIMEOUT_MS),
  });
}

/** Reads a response body as JSON, returning `null` rather than throwing when it isn't JSON at all (WAF page, HTML 5xx, empty body). */
async function readJsonSafe(res: Response): Promise<unknown> {
  try {
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

/**
 * Turns a settled response into either the parsed payload or a `QboApiError`.
 *
 * Some QBO endpoints (notably `/invoice/{id}/send` and deletes) answer 2xx with
 * no body at all; those resolve to `undefined`, which the caller's `T` is
 * expected to allow.
 */
async function readResult<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw QboApiError.fromResponse(
      res.status,
      await readJsonSafe(res),
      `QuickBooks request failed (${res.status})`,
    );
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (text.length === 0) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    // A 2xx that isn't JSON — an interstitial or proxy page, not a QBO
    // response. Rethrown as a QboApiError so callers have one error type to
    // handle, and so the body (whatever it is) never lands in a log.
    throw new QboApiError("QuickBooks returned a malformed response", {
      status: res.status,
      ownerFixable: false,
    });
  }
}

/**
 * Performs one authenticated QBO API call for a business.
 *
 * ── The 401 retry ──
 * A 401 is retried EXACTLY ONCE, after a forced token refresh. This is not
 * belt-and-braces: the stored `accessTokenExpiresAt` can be wrong in ways the
 * freshness check cannot see — the connection was revoked and re-granted
 * elsewhere, another replica rotated the token, or the clocks disagree — and
 * Intuit's 401 is the only authority on it. Retrying once converts a whole
 * class of spurious "QuickBooks sync failed" into a transparent recovery. A
 * second 401 is real (bad realm, revoked grant) and throws.
 *
 * Throws `QboApiError` for any non-2xx, and propagates
 * `QboNotConnectedError` / `QboNeedsReconnectError` from the token layer.
 */
export async function qboRequest<T>(
  db: DbClient,
  businessId: string,
  opts: QboRequestOptions,
): Promise<T> {
  const ctx = await getValidAccessToken(db, businessId);
  const res = await sendRequest(ctx, opts);

  if (res.status === 401) {
    const refreshedCtx = await getValidAccessToken(db, businessId, {
      force: true,
    });
    return await readResult<T>(await sendRequest(refreshedCtx, opts));
  }

  return await readResult<T>(res);
}

/**
 * Runs a QBO query (Intuit's SQL-like dialect) and returns just the rows for
 * `entity`, or `[]` when nothing matched — a query with no results omits the
 * entity key entirely rather than sending an empty array.
 *
 * `sql` is interpolated by the caller, so every literal in it MUST go through
 * `escapeQboQueryValue` (mapping.ts) first.
 */
export async function qboQuery<T>(
  db: DbClient,
  businessId: string,
  entity: string,
  sql: string,
): Promise<T[]> {
  const body = await qboRequest<QboQueryResponse<T>>(db, businessId, {
    method: "GET",
    path: "/query",
    query: { query: sql },
  });

  return pickQueryRows<T>(body, entity);
}
