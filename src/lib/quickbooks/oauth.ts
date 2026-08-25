import "server-only";

import type { QboEnvironment } from "~/lib/quickbooks/constants";
import type { QboCompanyInfo, QboTokenResponse } from "~/lib/quickbooks/types";
import {
  getQboApiBase,
  getQuickBooksRedirectUri,
  requireQuickBooksConfig,
} from "~/lib/quickbooks/config";
import {
  QBO_AUTHORIZE_URL,
  QBO_MINOR_VERSION,
  QBO_REQUEST_TIMEOUT_MS,
  QBO_REVOKE_URL,
  QBO_SCOPE,
  QBO_TOKEN_URL,
} from "~/lib/quickbooks/constants";
import { QboApiError, QboOAuthError } from "~/lib/quickbooks/errors";
import { pickEntity } from "~/lib/quickbooks/mapping";

/**
 * Intuit OAuth2 transport: the authorize URL, the two token grants
 * (authorization code and refresh), revocation, and the one unauthenticated-
 * by-us read (`CompanyInfo`) the connect callback needs to label the
 * connection.
 *
 * This module is deliberately STATELESS — it never touches the database. The
 * caller decides what to persist. `tokens.ts` owns the stored-token lifecycle;
 * the connect/disconnect route handlers own the row's status transitions.
 *
 * ── Token hygiene ──
 * No function here ever puts an access token, a refresh token, or an
 * authorization code into a thrown message, a log line, or a Sentry event. The
 * failure surface is `QboOAuthError { code, status }` and `QboApiError`, both
 * of which carry only Intuit's error code and the HTTP status. This matters
 * more than usual for refresh tokens: Intuit ROTATES them on every refresh and
 * a leaked one is valid for ~100 days against a real business's books.
 */

/** Re-exported so callers of `refreshTokens` can `instanceof`-check without a second import. */
export { QboOAuthError };

/**
 * One Intuit token grant's worth of material, with the two `expires_in`
 * durations already resolved to absolute `Date`s against the moment of the
 * response — the form the `QuickBooksConnection` columns store.
 */
export type QboTokenSet = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
};

/**
 * Fallback lifetimes used only if Intuit omits (or sends a non-numeric)
 * `expires_in` / `x_refresh_token_expires_in`. These match Intuit's documented
 * defaults — 1 hour and ~101 days. Under-estimating is the safe direction: a
 * too-early expiry costs one extra refresh, a too-late one hands out a dead
 * token mid-request.
 */
const DEFAULT_ACCESS_TOKEN_TTL_S = 3600;
const DEFAULT_REFRESH_TOKEN_TTL_S = 8_726_400;

/** `Authorization: Basic base64(clientId:clientSecret)` — how Intuit authenticates the token and revoke endpoints. */
function basicAuthHeader(clientId: string, clientSecret: string): string {
  const encoded = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString(
    "base64",
  );
  return `Basic ${encoded}`;
}

/** Reads a response body as JSON, returning `null` rather than throwing when it isn't JSON at all (WAF page, empty body, HTML 5xx). */
async function readJsonSafe(res: Response): Promise<unknown> {
  try {
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

/** Pulls the OAuth2 `error` code out of a rejected grant's body, defaulting to `invalid_grant`. */
function readOAuthErrorCode(body: unknown): string {
  if (typeof body === "object" && body !== null) {
    const code = (body as { error?: unknown }).error;
    if (typeof code === "string" && code.length > 0) return code;
  }
  return "invalid_grant";
}

function secondsOrDefault(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

/**
 * Shared POST to `QBO_TOKEN_URL` for both grant types.
 *
 * Status handling is the load-bearing part: **only** a 400 or 401 becomes a
 * `QboOAuthError`, because that is the error class `tokens.ts` converts into a
 * permanent `needs_reconnect`. Anything else (429, 5xx, an unparseable
 * success body) becomes a `QboApiError`, which leaves the stored connection
 * untouched so it recovers on the next attempt.
 */
async function requestTokenGrant(body: URLSearchParams): Promise<QboTokenSet> {
  const config = requireQuickBooksConfig();

  const res = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(config.clientId, config.clientSecret),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(QBO_REQUEST_TIMEOUT_MS),
  });

  const parsed = await readJsonSafe(res);

  if (!res.ok) {
    if (res.status === 400 || res.status === 401) {
      throw new QboOAuthError({
        code: readOAuthErrorCode(parsed),
        status: res.status,
      });
    }
    throw new QboApiError(`QuickBooks token request failed (${res.status})`, {
      status: res.status,
      ownerFixable: false,
    });
  }

  const token = parsed as Partial<QboTokenResponse> | null;
  if (!token?.access_token || !token.refresh_token) {
    // A 2xx with no tokens in it. Not an `invalid_grant` — the grant was
    // accepted — so it must not cost the owner their connection.
    throw new QboApiError("QuickBooks returned an unusable token response", {
      status: res.status,
      ownerFixable: false,
    });
  }

  const now = Date.now();
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    accessTokenExpiresAt: new Date(
      now +
        secondsOrDefault(token.expires_in, DEFAULT_ACCESS_TOKEN_TTL_S) * 1000,
    ),
    refreshTokenExpiresAt: new Date(
      now +
        secondsOrDefault(
          token.x_refresh_token_expires_in,
          DEFAULT_REFRESH_TOKEN_TTL_S,
        ) *
          1000,
    ),
  };
}

/**
 * Builds the Intuit consent URL the owner is redirected to when they click
 * "Connect QuickBooks".
 *
 * `state` is the caller's CSRF/business binding — the callback must verify it
 * before trusting the `realmId` and `code` in the query string. This function
 * neither generates nor validates it.
 */
export function buildAuthorizeUrl(params: { state: string }): string {
  const config = requireQuickBooksConfig();

  const url = new URL(QBO_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", QBO_SCOPE);
  url.searchParams.set("redirect_uri", getQuickBooksRedirectUri());
  url.searchParams.set("state", params.state);
  return url.toString();
}

/**
 * Exchanges the one-time authorization code from the OAuth callback for a
 * token set. `redirect_uri` must be the exact string used in the authorize
 * request — hence both sides going through `getQuickBooksRedirectUri()`.
 */
export async function exchangeCode(code: string): Promise<QboTokenSet> {
  return await requestTokenGrant(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getQuickBooksRedirectUri(),
    }),
  );
}

/**
 * Trades a stored refresh token for a fresh token set.
 *
 * Intuit ROTATES the refresh token on every successful call: the returned
 * `refreshToken` is usually a NEW value and the one passed in stops working
 * shortly after. The caller must persist `refreshToken` on every success, not
 * just when it looks changed — dropping one rotation strands the connection
 * and forces the owner to re-authorize.
 *
 * Throws `QboOAuthError` when Intuit rejects the grant (400/401) — see the
 * class docs for why only that case is terminal.
 */
export async function refreshTokens(
  refreshToken: string,
): Promise<QboTokenSet> {
  return await requestTokenGrant(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

/**
 * Revokes a token at Intuit (either an access or a refresh token; revoking
 * either kills the whole grant). Called on disconnect.
 *
 * Throws on a non-2xx so a caller that cares can observe it, but disconnect
 * flows should treat it as BEST EFFORT: the local row must be cleared whether
 * or not Intuit answered, otherwise a transient Intuit outage leaves the owner
 * unable to disconnect. Same ordering lesson as the Stripe Connect disconnect
 * route — clear locally first, then revoke upstream.
 */
export async function revokeToken(token: string): Promise<void> {
  const config = requireQuickBooksConfig();

  const res = await fetch(QBO_REVOKE_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(config.clientId, config.clientSecret),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
    signal: AbortSignal.timeout(QBO_REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new QboApiError(
      `QuickBooks token revocation failed (${res.status})`,
      { status: res.status, ownerFixable: false },
    );
  }
}

/**
 * Reads the connected company's display name, for labelling the connection in
 * the admin UI.
 *
 * NEVER THROWS. It runs inside the OAuth callback, immediately after a
 * successful token exchange, where the tokens are already in hand and the only
 * remaining job is to save them. Letting a cosmetic name lookup fail the
 * callback would throw away a perfectly good connection — and the owner would
 * be bounced back to "Connect QuickBooks" with no idea why. A `null` name is
 * simply a connection labelled by its realm id.
 *
 * Deliberately does not go through `qboRequest` (client.ts): there is no
 * persisted connection row to read a token from yet.
 */
export async function fetchCompanyInfo(params: {
  accessToken: string;
  realmId: string;
  environment: QboEnvironment;
}): Promise<{ companyName: string | null }> {
  const { accessToken, realmId, environment } = params;

  try {
    const realm = encodeURIComponent(realmId);
    const url = `${getQboApiBase(environment)}/v3/company/${realm}/companyinfo/${realm}?minorversion=${QBO_MINOR_VERSION}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(QBO_REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) return { companyName: null };

    const body: unknown = await res.json();
    const info = pickEntity<QboCompanyInfo>(body, "CompanyInfo");
    const name = info?.CompanyName ?? info?.LegalName;
    const trimmed = typeof name === "string" ? name.trim() : "";

    return { companyName: trimmed.length > 0 ? trimmed : null };
  } catch {
    return { companyName: null };
  }
}
