import "server-only";

import * as Sentry from "@sentry/nextjs";

import type { QboEnvironment } from "~/lib/quickbooks/constants";
import type { QboTokenSet } from "~/lib/quickbooks/oauth";
import type { DbClient } from "~/server/db";
import { coerceQboEnvironment } from "~/lib/quickbooks/config";
import { QBO_ACCESS_TOKEN_SKEW_MS } from "~/lib/quickbooks/constants";
import {
  QboNeedsReconnectError,
  QboNotConnectedError,
  QboOAuthError,
  redactTokenBearingError,
} from "~/lib/quickbooks/errors";
import { refreshTokens } from "~/lib/quickbooks/oauth";

/**
 * The stored-token lifecycle for a business's QuickBooks connection: hand out
 * a usable access token, refresh it just before it expires, persist the
 * rotated refresh token, and mark the connection `needs_reconnect` the moment
 * Intuit rejects the grant.
 *
 * Everything that talks to the QBO API goes through here (via `qboRequest`),
 * so this is the ONE place that reads `accessToken`/`refreshToken` off the row.
 * Both columns are `/// @encrypted` — transparently decrypted on read by the
 * prisma-field-encryption extension, and never usable in a `where` clause.
 */

/** What a caller actually needs to make an API call: a live token plus the realm and environment to aim it at. */
type QboAccessContext = {
  accessToken: string;
  realmId: string;
  environment: QboEnvironment;
};

/**
 * The subset of `QuickBooksConnection` this module reads. Structural, so the
 * full Prisma row is assignable without importing a generated type.
 */
type ConnectionRow = {
  status: string;
  realmId: string;
  environment: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
};

/** Same row, past the point where the nullable token columns are proven present. */
type UsableConnection = Omit<ConnectionRow, "accessToken" | "refreshToken"> & {
  accessToken: string;
  refreshToken: string;
};

/**
 * In-flight refreshes, keyed by business id.
 *
 * Without this, a page that fires five parallel QBO reads on an expired token
 * starts five simultaneous refreshes. Intuit rotates the refresh token on each
 * one, so four of the five results are already dead by the time they're
 * written, and whichever write lands last decides whether the connection
 * survives — an intermittent, unreproducible "QuickBooks keeps disconnecting".
 * Coalescing to one flight per business removes the race inside a process.
 *
 * Process-local, like the Sentry throttle in `payments-health.ts`: it does not
 * coordinate across replicas. Step 3's re-read inside the flight is what covers
 * the cross-replica case — see `runRefresh`.
 */
const inFlightRefreshes = new Map<string, Promise<QboAccessContext>>();

/**
 * Validates a loaded row and narrows away the nullable token columns.
 *
 * Splits the two "not usable" cases apart on purpose, because they mean
 * different things to the owner: `QboNotConnectedError` is "you never connected
 * (or you disconnected)", which the UI answers with a Connect button, while
 * `QboNeedsReconnectError` is "your connection expired", which needs a
 * re-authorize prompt. `toTrpcError` maps both to `PRECONDITION_FAILED`.
 */
function requireUsableConnection(row: ConnectionRow | null): UsableConnection {
  if (!row || row.status === "disconnected") throw new QboNotConnectedError();
  if (row.status === "needs_reconnect") throw new QboNeedsReconnectError();

  const { accessToken, refreshToken } = row;
  // A row with no refresh token can never be repaired by refreshing — the only
  // way out is a fresh OAuth grant, i.e. the same UI as "not connected".
  if (!accessToken || !refreshToken) throw new QboNotConnectedError();

  return { ...row, accessToken, refreshToken };
}

/** Whether the stored access token is good for at least `QBO_ACCESS_TOKEN_SKEW_MS` more — the margin that keeps a request from expiring mid-flight. */
function isAccessTokenFresh(row: UsableConnection): boolean {
  const expiresAt = row.accessTokenExpiresAt;
  if (!expiresAt) return false;
  return expiresAt.getTime() - Date.now() > QBO_ACCESS_TOKEN_SKEW_MS;
}

function contextFor(row: UsableConnection): QboAccessContext {
  return {
    accessToken: row.accessToken,
    realmId: row.realmId,
    environment: coerceQboEnvironment(row.environment),
  };
}

/** Flips the connection to `needs_reconnect` and reports it. The owner has to re-authorize; nothing retries out of this state. */
async function markNeedsReconnect(
  db: DbClient,
  businessId: string,
  err: QboOAuthError,
): Promise<void> {
  await db.quickBooksConnection.update({
    where: { businessId },
    data: { status: "needs_reconnect" },
  });

  Sentry.captureException(err, {
    tags: {
      service: "quickbooks",
      "quickbooks.step": "token-refresh",
      businessId,
    },
    extra: { code: err.code },
  });
}

/**
 * The body of one refresh flight. Only ever runs behind
 * `inFlightRefreshes` — never call it directly.
 */
async function runRefresh(
  db: DbClient,
  businessId: string,
  force: boolean,
): Promise<QboAccessContext> {
  // Re-read INSIDE the flight. Two reasons: the row may have been refreshed by
  // another replica (or another process) between our first read and getting
  // here, and the refresh token we're about to spend must be the current one —
  // spending a rotated-away token is exactly what earns an `invalid_grant`.
  const row = requireUsableConnection(
    await db.quickBooksConnection.findUnique({ where: { businessId } }),
  );

  if (!force && isAccessTokenFresh(row)) return contextFor(row);

  let tokens: QboTokenSet;
  try {
    tokens = await refreshTokens(row.refreshToken);
  } catch (err) {
    if (err instanceof QboOAuthError) {
      await markNeedsReconnect(db, businessId, err);
      throw new QboNeedsReconnectError();
    }
    // A timeout, a DNS failure, an Intuit 5xx. The connection is fine; the
    // network isn't. Leave the status alone so the next call just works.
    throw err;
  }

  // ONE write, and it must include `refreshToken` every time: Intuit rotated
  // it, and the value we were handed is now the only one that works.
  try {
    await db.quickBooksConnection.update({
      where: { businessId },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        lastRefreshAt: new Date(),
      },
    });
  } catch (err) {
    // `data` above carries the rotated live tokens. `PrismaClientValidationError`
    // interpolates the full argument object into `message`, so a raw failure
    // here must never reach a caller's captureException (router's
    // `captureQboFailure`, `sync.ts`).
    throw redactTokenBearingError(err, "token-persist");
  }

  return {
    accessToken: tokens.accessToken,
    realmId: row.realmId,
    environment: coerceQboEnvironment(row.environment),
  };
}

/**
 * Joins the existing flight for this business, or starts one. The map entry is
 * always cleared, success or failure.
 *
 * A `force` caller joins a non-`force` flight already in progress rather than
 * starting a second one. That is the lesser evil: two concurrent refreshes race
 * Intuit's token rotation, which is the failure this map exists to prevent. The
 * cost is a narrow window where a 401-driven force retry can be handed the same
 * token the in-flight refresh decided was still fresh — in which case the retry
 * 401s again and surfaces as a `QboApiError`, rather than corrupting the stored
 * connection.
 */
async function refreshCoalesced(
  db: DbClient,
  businessId: string,
  force: boolean,
): Promise<QboAccessContext> {
  const existing = inFlightRefreshes.get(businessId);
  if (existing) return await existing;

  const flight = runRefresh(db, businessId, force).finally(() => {
    inFlightRefreshes.delete(businessId);
  });
  inFlightRefreshes.set(businessId, flight);

  return await flight;
}

/**
 * Returns a live access token for a business's QuickBooks connection,
 * refreshing it first if it is expired or within `QBO_ACCESS_TOKEN_SKEW_MS` of
 * expiry.
 *
 * Pass `{ force: true }` to refresh unconditionally — the API client does this
 * after a 401, where the token is provably dead no matter what the stored
 * expiry claims (clock skew, a token revoked early, a stale row written by
 * another replica).
 *
 * Throws `QboNotConnectedError` (never connected / disconnected / no stored
 * tokens) or `QboNeedsReconnectError` (Intuit rejected the refresh, now or
 * previously). Network failures propagate untouched and leave the connection's
 * status alone.
 */
export async function getValidAccessToken(
  db: DbClient,
  businessId: string,
  opts?: { force?: boolean },
): Promise<QboAccessContext> {
  const force = opts?.force ?? false;

  const row = requireUsableConnection(
    await db.quickBooksConnection.findUnique({ where: { businessId } }),
  );

  if (!force && isAccessTokenFresh(row)) return contextFor(row);

  return await refreshCoalesced(db, businessId, force);
}
