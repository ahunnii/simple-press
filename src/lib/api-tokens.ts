import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { businessHostFilter } from "~/lib/domain-utils";
import { db } from "~/server/db";

/**
 * Owner-issued, read-only API tokens for the Business Profile API
 * (`/api/v1/...`). A token is `spk_` + 43 base64url chars (256 bits of
 * entropy). Only its sha256 hex digest is stored (`BusinessApiToken.tokenHash`)
 * — hashed rather than encrypted because auth looks the row up with
 * `where: { tokenHash }`. With 256 random bits a plain fast hash is
 * sufficient; there is nothing to brute-force.
 *
 * Tokens are tenant-bound: a token only works on the host of the business it
 * was issued for. Every failure returns the same bare 401 so a caller can't
 * tell a revoked token from an unknown one or a wrong-tenant one.
 */

export const API_TOKEN_PREFIX = "spk_";

export const API_TOKEN_SCOPES = ["profile:read"] as const;
export type ApiTokenScope = (typeof API_TOKEN_SCOPES)[number];

const TOKEN_PATTERN = /^spk_[A-Za-z0-9_-]{43}$/;

/** Only touch lastUsedAt this often, so reads don't turn into writes. */
const LAST_USED_REFRESH_MS = 5 * 60 * 1000;

export function hashApiToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Mint a new token. The raw `token` must be shown to the owner once and never
 * persisted; store only `tokenHash` and `prefix`.
 */
export function generateApiToken(): {
  token: string;
  tokenHash: string;
  prefix: string;
} {
  const token = `${API_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    token,
    tokenHash: hashApiToken(token),
    prefix: token.slice(0, 12),
  };
}

/**
 * Extract the raw token from an `Authorization: Bearer spk_...` header.
 * Returns null for anything that isn't well-formed, so malformed input never
 * reaches the database.
 */
export function parseBearer(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authHeader);
  const token = match?.[1];
  if (!token?.startsWith(API_TOKEN_PREFIX)) return null;
  return TOKEN_PATTERN.test(token) ? token : null;
}

export type VerifyApiTokenResult =
  | { ok: true; tokenId: string; businessId: string }
  | { ok: false; status: 401 | 403 };

/**
 * Authenticate an API request: bearer token → active token on an active
 * business → that business is the one `host` resolves to → scope granted.
 * 401 for every identity failure (uniform, no detail); 403 only when the
 * token is valid for this tenant but lacks the scope.
 */
export async function verifyApiToken(args: {
  authorization: string | null;
  host: string;
  scope: ApiTokenScope;
}): Promise<VerifyApiTokenResult> {
  const raw = parseBearer(args.authorization);
  if (!raw) return { ok: false, status: 401 };

  const token = await db.businessApiToken.findUnique({
    where: { tokenHash: hashApiToken(raw) },
    select: {
      id: true,
      businessId: true,
      scopes: true,
      revokedAt: true,
      lastUsedAt: true,
      business: {
        select: { status: true, subdomain: true, customDomain: true },
      },
    },
  });

  if (!token || token.revokedAt || token.business.status !== "active") {
    return { ok: false, status: 401 };
  }

  // The token must belong to the tenant this request's Host resolves to;
  // otherwise a token for store A would read store A's data via store B's host.
  const hostBusiness = await db.business.findFirst({
    where: { ...businessHostFilter(args.host), id: token.businessId },
    select: { id: true },
  });
  if (!hostBusiness) return { ok: false, status: 401 };

  if (!token.scopes.includes(args.scope)) return { ok: false, status: 403 };

  const now = Date.now();
  if (
    !token.lastUsedAt ||
    now - token.lastUsedAt.getTime() > LAST_USED_REFRESH_MS
  ) {
    // Best-effort bookkeeping: a failed write must never fail the read.
    void db.businessApiToken
      .update({ where: { id: token.id }, data: { lastUsedAt: new Date(now) } })
      .catch(() => {});
  }

  return { ok: true, tokenId: token.id, businessId: token.businessId };
}
