import { createHmac, timingSafeEqual } from "crypto";

import { env } from "~/env";

// 365 days — the "View invoice" link is the customer's only way back to the
// payment instructions without an account, and invoices are routinely paid
// late, disputed, or looked up again at tax time. Longer than the 180-day
// subscription TTL because an invoice link is re-sent far less often (only on
// a manual reminder), so the first email's link has to last.
const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

type InvoiceTokenPayload = {
  /** Discriminator, so an invoice token can never be replayed against subscription or order-status verification (or vice versa). */
  k: "inv";
  /** Invoice row id. */
  iid: string;
  /** Business id the invoice belongs to — checked against `checkBusiness()` on every use. */
  bid: string;
  exp: number;
};

export interface InvoiceTokenSubject {
  invoiceId: string;
  businessId: string;
}

export type InvoiceTokenVerification =
  | { ok: true; invoiceId: string; businessId: string }
  | { ok: false; reason: "invalid" | "expired" };

function base64urlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(input: string): string {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  base64 += "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64, "base64").toString("utf-8");
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Create a signed, URL-safe invoice-view token — the same mechanics as
 * `~/lib/subscriptions/token.ts` (base64url JSON payload + HMAC-SHA256
 * signature), with a `k: "inv"` discriminator and a 365-day TTL. Embedded in
 * every customer invoice email and the account Invoices tab.
 *
 * Minted fresh on every send/reminder/`getMine` rather than stored, so there
 * is nothing to revoke: a cancelled invoice still resolves (and shows as
 * cancelled), and a deleted one 404s on lookup.
 */
export function createInvoiceToken(
  subject: InvoiceTokenSubject & { now?: Date },
  secret: string = env.SIMPLEPRESS_HASH_SECRET,
): string {
  const payload: InvoiceTokenPayload = {
    k: "inv",
    iid: subject.invoiceId,
    bid: subject.businessId,
    exp: (subject.now?.getTime() ?? Date.now()) + TOKEN_TTL_MS,
  };

  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const sig = sign(encodedPayload, secret);

  return `${encodedPayload}.${sig}`;
}

/**
 * Verify and decode an invoice-view token — never throws.
 *
 * Unlike the subscription token this distinguishes `expired` from `invalid`,
 * so the hosted page can say "this link has expired, ask the business for a
 * new one" instead of a bare 404. `expired` is only returned for a token whose
 * signature AND shape check out — a forged token can't learn anything by
 * probing for the difference.
 */
export function verifyInvoiceToken(
  token: string,
  now: Date = new Date(),
  secret: string = env.SIMPLEPRESS_HASH_SECRET,
): InvoiceTokenVerification {
  const invalid = { ok: false, reason: "invalid" } as const;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return invalid;

  const encodedPayload = token.slice(0, dotIndex);
  const receivedSig = token.slice(dotIndex + 1);

  const expectedSig = sign(encodedPayload, secret);

  const receivedBuf = Buffer.from(receivedSig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    receivedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(receivedBuf, expectedBuf)
  ) {
    return invalid;
  }

  let payload: InvoiceTokenPayload | null;
  try {
    payload = JSON.parse(
      base64urlDecode(encodedPayload),
    ) as InvoiceTokenPayload | null;
  } catch {
    return invalid;
  }

  if (
    // `?.`: a validly-signed `null` payload must be rejected, not throw.
    payload?.k !== "inv" ||
    typeof payload.iid !== "string" ||
    payload.iid.length === 0 ||
    typeof payload.bid !== "string" ||
    payload.bid.length === 0 ||
    typeof payload.exp !== "number"
  ) {
    return invalid;
  }

  if (now.getTime() > payload.exp) return { ok: false, reason: "expired" };

  return { ok: true, invoiceId: payload.iid, businessId: payload.bid };
}

/** The hosted page path for a token — prefix with the business origin (`getBusinessUrl`) for an absolute link. */
export function invoiceViewPath(token: string): string {
  return `/invoice/${token}`;
}
