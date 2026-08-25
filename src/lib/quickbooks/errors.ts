import { TRPCError } from "@trpc/server";

import type { QboFaultBody } from "~/lib/quickbooks/types";

/**
 * Error types for the QuickBooks Online (QBO) integration, plus the single
 * place that translates them into a `TRPCError` at the tRPC procedure
 * boundary (`toTrpcError`). Kept here rather than inlined at every call site
 * so every procedure reports the same code for the same failure class.
 */

/**
 * Fault codes Intuit returns for a request the OWNER can fix by changing
 * what they entered (a duplicate `DocNumber`, a reference to an inactive
 * account, a missing required field) as opposed to a transient or
 * platform-side failure (auth, rate limit, 5xx, an unexpected response
 * shape). Kept intentionally small: when in doubt, treat a fault as NOT
 * owner-fixable, so it surfaces as an internal error we get paged for rather
 * than a friendly message that quietly hides a real bug.
 *
 * `6000` = generic validation failure, `6240` = duplicate document number,
 * `2500` = referenced object (customer/item/account) not found or inactive.
 * Verified against Intuit's error code reference at the time this was
 * written; revisit if unfamiliar codes turn up in support triage.
 */
const QBO_OWNER_FIXABLE_FAULT_CODES = new Set(["6000", "6240", "2500"]);

/**
 * The documented rule behind `QboApiError.ownerFixable` when the caller
 * doesn't pass an explicit override: a 400-level status AND either Intuit's
 * `Fault.type === "ValidationFault"` or a code in the small owner-fixable set
 * above.
 */
function isOwnerFixableFault(input: {
  status: number;
  code?: string;
  faultType?: string;
}): boolean {
  if (input.status < 400 || input.status >= 500) return false;
  if (input.faultType === "ValidationFault") return true;
  return (
    input.code !== undefined && QBO_OWNER_FIXABLE_FAULT_CODES.has(input.code)
  );
}

/**
 * A non-2xx response from the QBO API. `ownerFixable` decides how
 * `toTrpcError` reports it: `true` becomes a `BAD_REQUEST` with a QBO-
 * prefixed message the owner can act on; `false` becomes an opaque
 * `INTERNAL_SERVER_ERROR` we get paged for.
 */
export class QboApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly detail?: string;
  readonly ownerFixable: boolean;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      detail?: string;
      /** Intuit's `Fault.type`, e.g. `"ValidationFault"` — used only to compute the `ownerFixable` default, not stored on the instance. */
      faultType?: string;
      /** Explicit override — skips the default `isOwnerFixableFault` computation entirely. */
      ownerFixable?: boolean;
    },
  ) {
    super(message);
    this.name = "QboApiError";
    this.status = options.status;
    this.code = options.code;
    this.detail = options.detail;
    this.ownerFixable =
      options.ownerFixable ??
      isOwnerFixableFault({
        status: options.status,
        code: options.code,
        faultType: options.faultType,
      });
  }

  /**
   * Builds a `QboApiError` from an HTTP status and a (possibly unparseable)
   * response body, using `parseQboFault` to fill in `message`/`code`/`detail`
   * when the body is a recognizable `Fault` envelope, and `fallbackMessage`
   * otherwise (e.g. a non-JSON body from a WAF or a 5xx HTML error page).
   */
  static fromResponse(
    status: number,
    body: unknown,
    fallbackMessage: string,
  ): QboApiError {
    const fault = parseQboFault(body);
    if (!fault) {
      return new QboApiError(fallbackMessage, { status });
    }
    return new QboApiError(fault.message, {
      status,
      code: fault.code,
      detail: fault.detail,
      faultType: fault.type,
    });
  }
}

/** Thrown when a business has never connected QuickBooks. */
export class QboNotConnectedError extends Error {
  constructor() {
    super("QuickBooks is not connected");
    this.name = "QboNotConnectedError";
  }
}

/** Thrown when a stored refresh token was rejected (expired/revoked at Intuit's side) and the owner must re-authorize. */
export class QboNeedsReconnectError extends Error {
  constructor() {
    super("QuickBooks needs to be reconnected");
    this.name = "QboNeedsReconnectError";
  }
}

/** Thrown when the platform-level QBO app credentials are missing or misconfigured. */
export class QboNotConfiguredError extends Error {
  constructor(message = "QuickBooks integration is not configured") {
    super(message);
    this.name = "QboNotConfiguredError";
  }
}

/**
 * Translates a thrown QBO error into a `TRPCError` at a tRPC procedure
 * boundary. `QboNotConnectedError` / `QboNeedsReconnectError` /
 * `QboNotConfiguredError` all become `PRECONDITION_FAILED` — the request
 * itself was fine, but the integration isn't in a state to serve it. An
 * owner-fixable `QboApiError` becomes `BAD_REQUEST`. Everything else
 * (a non-owner-fixable `QboApiError`, a network failure, a programmer error)
 * becomes an opaque `INTERNAL_SERVER_ERROR` with the original error preserved
 * as `cause` for Sentry.
 */
export function toTrpcError(err: unknown): TRPCError {
  if (
    err instanceof QboNotConnectedError ||
    err instanceof QboNeedsReconnectError ||
    err instanceof QboNotConfiguredError
  ) {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: err.message,
      cause: err,
    });
  }

  if (err instanceof QboApiError && err.ownerFixable) {
    return new TRPCError({
      code: "BAD_REQUEST",
      message: `QuickBooks: ${err.message}`,
      cause: err,
    });
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "QuickBooks request failed",
    cause: err,
  });
}

/**
 * Pure parser for Intuit's `Fault` error envelope. Returns `null` when
 * `body` doesn't look like one at all (e.g. a network-level failure whose
 * body isn't even JSON, or an unrelated shape) rather than throwing — callers
 * decide what to do with an unparseable error (typically `fallbackMessage`
 * via `QboApiError.fromResponse`).
 */
export function parseQboFault(
  body: unknown,
): { message: string; code?: string; detail?: string; type?: string } | null {
  if (typeof body !== "object" || body === null) return null;

  const fault = (body as QboFaultBody).Fault;
  if (!fault?.Error || fault.Error.length === 0) return null;

  const first = fault.Error[0];
  if (!first) return null;

  return {
    message: first.Message ?? "QuickBooks request failed",
    code: first.code,
    detail: first.Detail,
    type: fault.type,
  };
}

/**
 * An OAuth token grant Intuit REJECTED — a 400/401 from
 * `QBO_TOKEN_URL`, carrying an OAuth2 `error` code such as `invalid_grant`
 * (the refresh token was rotated away, revoked by the owner in QuickBooks, or
 * aged past its ~100-day life) or `invalid_client`.
 *
 * Deliberately distinct from `QboApiError`: this is the one failure class that
 * is TERMINAL for a stored connection. `getValidAccessToken` treats it as the
 * signal to flip the row to `needs_reconnect` and stop retrying, so a transient
 * failure must NEVER be reported as one — a network timeout or an Intuit 5xx on
 * the token endpoint stays a plain error and leaves the connection alone, so it
 * heals by itself on the next call instead of demanding the owner re-authorize.
 *
 * Never carries a token value: `code`/`status` only, both safe to log.
 */
export class QboOAuthError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(options: { code: string; status: number; message?: string }) {
    super(
      options.message ??
        `QuickBooks rejected the token grant (${options.code})`,
    );
    this.name = "QboOAuthError";
    this.code = options.code;
    this.status = options.status;
  }
}

/**
 * Wraps an error thrown by a Prisma call whose `data` carried OAuth tokens.
 * `PrismaClientValidationError` interpolates the full argument object into
 * `message`, so the raw error must never reach a log line or Sentry. The
 * wrapper replaces the message with a fixed string and attaches a SANITIZED
 * `cause` — an `Error` carrying only the original error's `name` (e.g.
 * `"PrismaClientValidationError"`), never the original error itself: Sentry's
 * linked-errors integration walks and serializes `cause`, so attaching the
 * raw error there would leak the tokens right back into the event. A Prisma
 * known-request `code` (e.g. `P2021`), when present on `err`, is copied onto
 * the wrapper (not the cause) so the Sentry event stays greppable — `message`
 * and `meta` are never copied, since either can carry the offending `data`.
 */
export function redactTokenBearingError(err: unknown, context: string): Error {
  const wrapped = new Error(`${context}: QuickBooks connection write failed`, {
    cause: new Error(err instanceof Error ? err.name : "UnknownError"),
  });

  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string") {
      (wrapped as Error & { code?: string }).code = code;
    }
  }

  return wrapped;
}
