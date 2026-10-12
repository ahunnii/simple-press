import { createHmac, timingSafeEqual } from "crypto";

import { env } from "~/env";

/**
 * The `pending_session` cookie: which Stripe Checkout Session this browser
 * started. Set by `/api/stripe/create-session`, read by
 *
 * - `/api/stripe/session` (order-confirmation page) — proof that the visitor
 *   asking for a session's details is the one who started it;
 * - create-session's supersede of the shopper's own previous checkout and the
 *   storefront Apply (discount.validate) — both act on the session it names.
 *
 * The value is SIGNED: `<sessionId>.<hmac>`, HMAC-SHA256 (base64url) over the
 * session id AND the business id with SIMPLEPRESS_HASH_SECRET. A Stripe
 * session id is not a secret (it is in the Checkout URL and the success URL),
 * so an unsigned cookie would let anyone who saw another shopper's `cs_…` id
 * set `pending_session=<their id>` and have create-session expire that
 * shopper's open checkout and release their stock + single-use code. Binding
 * the business id means a cookie minted by one store is meaningless on
 * another.
 */
export const PENDING_SESSION_COOKIE = "pending_session";

/** Which pending cookie to sign/read: its name and its signature context. */
export type PendingCookieKind = { name: string; context: string };

// Domain separation: SIMPLEPRESS_HASH_SECRET also signs order-status, invoice
// and OAuth-state tokens; the context prefix keeps a MAC from one usage from
// ever verifying as another.
export const ONE_TIME_PENDING_COOKIE: PendingCookieKind = {
  name: PENDING_SESSION_COOKIE,
  context: "pending_session:v1",
};
/**
 * The subscription checkout's twin: `pending_subscription_session`, set by
 * `/api/stripe/subscriptions/create-session` and read by `/subscribe/success`
 * as proof the visitor started that checkout. Same signed format, but a
 * DIFFERENT signature context, so a value minted for one cookie never
 * verifies as the other.
 */
export const SUBSCRIPTION_PENDING_COOKIE: PendingCookieKind = {
  name: "pending_subscription_session",
  context: "pending_subscription_session:v1",
};

/**
 * Stripe session metadata create-session stamps on every session it creates
 * from the signed-cookie deploy on. It tells the order-confirmation route
 * which cookie format that session's owner holds: marked → a SIGNED cookie is
 * required; unmarked (created before the deploy) → the legacy bare cookie is
 * still accepted. See `/api/stripe/session`. The subscription create-session
 * stamps the same marker for `/subscribe/success`.
 */
export const PENDING_COOKIE_MARKER_KEY = "pendingCookie";
export const PENDING_COOKIE_MARKER_VALUE = "signed-v1";

/** True when the session was created with a signed pending cookie. */
export function hasSignedCookieMarker(
  metadata: Record<string, string> | null | undefined,
): boolean {
  return metadata?.[PENDING_COOKIE_MARKER_KEY] === PENDING_COOKIE_MARKER_VALUE;
}

/**
 * Seconds either pending cookie lives; the one-time checkout it names expires
 * after 30 min.
 */
export const PENDING_SESSION_COOKIE_MAX_AGE = 3600;

/**
 * Clock-skew allowance (seconds) added to the cookie max age when deciding
 * whether a bare legacy cookie can still genuinely exist for a session: a bare
 * cookie can never be older than its max age, so a session created longer ago
 * than `MAX_AGE + SLACK` cannot have one.
 */
export const LEGACY_COOKIE_AGE_SLACK_SECONDS = 15 * 60;

/**
 * True when something created at `createdMs` is young enough that a legacy
 * bare cookie for it can still exist (see LEGACY_COOKIE_AGE_SLACK_SECONDS).
 * Written as a negated >= so a missing/NaN time fails closed.
 */
export function withinLegacyCookieAge(
  createdMs: number,
  now: number = Date.now(),
): boolean {
  return !!(
    createdMs >=
    now -
      (PENDING_SESSION_COOKIE_MAX_AGE + LEGACY_COOKIE_AGE_SLACK_SECONDS) * 1000
  );
}

/**
 * The rollout rule for a legacy BARE pending cookie, shared by
 * `/api/stripe/session` and `/subscribe/success`: accepted only for a Stripe
 * session that (a) lacks the signed-cookie marker — every session created
 * from the signed-cookie deploy on carries it, and for those only a SIGNED
 * cookie works — and (b) is young enough for a bare cookie to still exist.
 * Stripe keeps completed sessions retrievable indefinitely, so without (b)
 * every pre-deploy session would stay readable with nothing but its id; once
 * an hour has passed since the deploy no unmarked session is young enough and
 * the fallback rejects everything.
 */
export function legacyBareCookieAllowed(
  session: {
    created: number;
    metadata: Record<string, string> | null | undefined;
  },
  now: number = Date.now(),
): boolean {
  return (
    !hasSignedCookieMarker(session.metadata) &&
    withinLegacyCookieAge(session.created * 1000, now)
  );
}

// Stripe Checkout Session ids: `cs_test_…` / `cs_live_…`. Never contains a
// dot, so the last `.` separates the id from the signature.
const SESSION_ID_RE = /^cs_[A-Za-z0-9_]{1,255}$/;

function signature(
  sessionId: string,
  businessId: string,
  secret: string,
  kind: PendingCookieKind,
): string {
  return createHmac("sha256", secret)
    .update(`${kind.context}:${businessId}:${sessionId}`)
    .digest("base64url");
}

/**
 * The cookie value create-session sets for a session it just created.
 * `kind` defaults to the one-time `pending_session` cookie.
 */
export function signPendingSessionCookie(
  sessionId: string,
  businessId: string,
  opts: { secret?: string; kind?: PendingCookieKind } = {},
): string {
  const secret = opts.secret ?? env.SIMPLEPRESS_HASH_SECRET;
  const kind = opts.kind ?? ONE_TIME_PENDING_COOKIE;
  return `${sessionId}.${signature(sessionId, businessId, secret, kind)}`;
}

function verify(
  value: string,
  businessId: string,
  secret: string,
  kind: PendingCookieKind,
): string | null {
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const sessionId = value.slice(0, dot);
  if (!SESSION_ID_RE.test(sessionId)) return null;
  const received = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(signature(sessionId, businessId, secret, kind));
  if (received.length !== expected.length) return null;
  return timingSafeEqual(received, expected) ? sessionId : null;
}

/** Every value of the `name` cookie in the Cookie header (decoded). */
function cookieValues(headers: Pick<Headers, "get">, name: string): string[] {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return [];
  const values: string[] = [];
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1 || part.slice(0, eq).trim() !== name) continue;
    try {
      values.push(decodeURIComponent(part.slice(eq + 1).trim()));
    } catch {
      // Malformed percent-encoding: not a value we ever set.
    }
  }
  return values;
}

/**
 * The session id the request's `pending_session` cookie names, ONLY when its
 * signature verifies for `businessId`; null when absent, garbage, unsigned,
 * tampered, or minted for another store. Supersede and Apply use this alone:
 * they never accept a bare (legacy) value.
 */
export function readPendingSessionId(
  headers: Pick<Headers, "get">,
  businessId: string,
  opts: { secret?: string; kind?: PendingCookieKind } = {},
): string | null {
  const secret = opts.secret ?? env.SIMPLEPRESS_HASH_SECRET;
  const kind = opts.kind ?? ONE_TIME_PENDING_COOKIE;
  for (const value of cookieValues(headers, kind.name)) {
    const signed = verify(value, businessId, secret, kind);
    if (signed) return signed;
  }
  return null;
}

/**
 * The order-confirmation route's ownership check, in one pass over the Cookie
 * header: does any `pending_session` value name `sessionId`? Returns
 * `{ sessionId, signed: true }` for a value whose signature verifies, else
 * `{ sessionId, signed: false }` for a bare value equal to `sessionId` (the
 * format create-session set before the cookie was signed), else null. A signed
 * value always wins over a bare one, and a cookie naming a DIFFERENT session
 * never shadows one naming this session.
 *
 * The route accepts the bare result only for an unmarked, recently created
 * session (see `/api/stripe/session`); supersede and Apply must not use this.
 * `/subscribe/success` uses it with `kind: SUBSCRIPTION_PENDING_COOKIE`, under
 * the same unmarked + recent rule.
 */
export function matchPendingSessionCookie(
  headers: Pick<Headers, "get">,
  businessId: string,
  sessionId: string,
  opts: { secret?: string; kind?: PendingCookieKind } = {},
): { sessionId: string; signed: boolean } | null {
  const secret = opts.secret ?? env.SIMPLEPRESS_HASH_SECRET;
  const kind = opts.kind ?? ONE_TIME_PENDING_COOKIE;
  let bare = false;
  for (const value of cookieValues(headers, kind.name)) {
    if (verify(value, businessId, secret, kind) === sessionId) {
      return { sessionId, signed: true };
    }
    if (value === sessionId && SESSION_ID_RE.test(value)) bare = true;
  }
  return bare ? { sessionId, signed: false } : null;
}
