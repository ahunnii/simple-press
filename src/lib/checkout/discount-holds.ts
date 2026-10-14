import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";

import type { Deadline } from "~/lib/checkout/stripe-call-budget";
import type { ReservationEntry } from "~/lib/inventory/reservation";
import type { DbClient } from "~/server/db";
import { readPendingSessionId } from "~/lib/checkout/pending-session-cookie";
import {
  callWithinDeadline,
  classifyStripeError,
  createDeadline,
  isDeadlineExceeded,
} from "~/lib/checkout/stripe-call-budget";
import {
  countHeldDiscountUses,
  releaseReservation,
} from "~/lib/inventory/reservation";
import { stripeClient } from "~/lib/stripe/client";

/**
 * The shopper's own previous checkout, and the discount-use accounting that
 * create-session and the storefront "Apply" (discount.validate) share.
 *
 * Discount uses (and stock) are held from checkout START by the session's
 * InventoryReservation. A shopper who goes to Stripe, presses Back and
 * continues to payment again would otherwise be locked out of a single-use
 * (or per-customer-1) code — or the last unit — by their OWN still-open first
 * session for up to 30 minutes. create-session therefore supersedes that
 * session — the one the SIGNED `pending_session` cookie names — before it
 * claims a new hold, and Apply leaves that session's hold out of its counts
 * because create-session will give it back. Both sides decide "which hold is
 * supersedable" with the same lookup (`lookupSupersedableHold`), so they
 * cannot drift apart.
 */

/**
 * Metadata key create-session sets on a session it supersedes (value: unix
 * seconds). The `checkout.session.expired` webhook skips the abandoned-cart
 * email for such a session — the shopper is checking out again right now.
 */
export const SUPERSEDED_METADATA_KEY = "supersededAt";

/**
 * Per-attempt timeout for every Stripe call in this module. Supersede and
 * Apply's lookup are best-effort and run on the shopper's request path
 * (Continue to payment / Apply). stripe-node's defaults (80s timeout, two
 * network retries) would stall the request for minutes during a Stripe
 * slowdown, so give up fast instead.
 */
export const STRIPE_HOLD_REQUEST_TIMEOUT_MS = 5000;

/**
 * Hard time budget for create-session's whole supersede step (lookup, mark,
 * expire, re-check, un-mark — up to five sequential calls). One call that
 * uses its full per-attempt timeout, plus a retry backoff and the rest of the
 * chain at normal latency, fits; a Stripe outage costs the shopper at most
 * this, not five timeouts.
 */
export const SUPERSEDE_BUDGET_MS = 8000;

/** Budget for Apply's lookup: one retrieve. */
export const LOOKUP_BUDGET_MS = STRIPE_HOLD_REQUEST_TIMEOUT_MS;

/**
 * One network retry: stripe-node then retries a dropped connection, a timed
 * out attempt, 409 lock_timeout, 429 and 5xx — with an idempotency key on
 * POSTs (update / expire), so the retry is safe. The step's deadline still
 * bounds the total (see `callWithinDeadline`).
 */
const STRIPE_HOLD_MAX_NETWORK_RETRIES = 1;

/**
 * EVERY Stripe call here goes through this (the single place the request
 * options are built, so none can run without a timeout or past the step's
 * deadline). A timeout, dropped connection or exhausted budget surfaces as an
 * "unknown" outcome (see `classifyStripeError`): supersede reports it to
 * Sentry and returns `{ superseded: false, released: false }` without
 * blocking the new checkout, and Apply treats the hold as counting.
 */
function holdCall<T>(
  deadline: Deadline,
  stripeAccount: string,
  call: (options: Stripe.RequestOptions) => Promise<T>,
): Promise<T> {
  return callWithinDeadline(
    deadline,
    STRIPE_HOLD_REQUEST_TIMEOUT_MS,
    (timeout) =>
      call({
        stripeAccount,
        timeout,
        maxNetworkRetries: STRIPE_HOLD_MAX_NETWORK_RETRIES,
      }),
  );
}

/**
 * THE "should this failure reach Sentry?" decision for every best-effort
 * Stripe step in this module (supersede's mark / expire / un-mark / outer
 * catch, and Apply's lookup).
 *
 * - `DeadlineExceededError` (a call skipped or cut off by the step's budget)
 *   is EXPECTED and handled — during a Stripe slowdown every returning
 *   shopper's checkout would hit it, so it must not become an event. It
 *   leaves an info breadcrumb naming the step (context for any later event on
 *   the same request) and nothing else.
 * - Anything else (a genuine StripeConnectionError, API error, DB error) is
 *   captured as a warning, with a stable fingerprint per step and error type
 *   so a burst groups into one issue instead of one per shopper.
 */
function reportHoldFailure(
  err: unknown,
  opts: {
    route: string;
    /** Sentry `checkout.step` tag; also the fingerprint's step. */
    step: string;
    businessId: string;
    extra?: Record<string, unknown>;
  },
): void {
  if (isDeadlineExceeded(err)) {
    Sentry.addBreadcrumb({
      category: "checkout",
      level: "info",
      message: `Stripe call skipped or cut off by the step deadline (${opts.step})`,
      data: { route: opts.route, step: opts.step, businessId: opts.businessId },
    });
    return;
  }
  const type = (err as { type?: unknown } | null | undefined)?.type;
  const errorType =
    typeof type === "string"
      ? type
      : err instanceof Error
        ? err.name
        : "UnknownError";
  Sentry.captureException(err, {
    level: "warning",
    fingerprint: ["supersede", opts.step, errorType],
    tags: {
      route: opts.route,
      "checkout.step": opts.step,
      businessId: opts.businessId,
    },
    ...(opts.extra ? { extra: opts.extra } : {}),
  });
}

export type SupersedableSession = {
  session: Stripe.Checkout.Session;
  /** "open": still payable — expire it first. "expired": already dead on
   *  Stripe, its webhook just hasn't released the hold yet. */
  status: "open" | "expired";
};

/**
 * The session, when it is a CART checkout of this business that Stripe says
 * is still `open` (or already `expired`). Never a `complete` session: a
 * completed checkout with a pending bank payment still owns its hold.
 *
 * Retrieved on the business's connected account, so another store's session
 * is simply "not found" (null). Expected Stripe rejections (not found, wrong
 * account) return null; anything else — including a timeout or an exhausted
 * `deadline` — throws for the caller to report.
 */
export async function retrieveSupersedableSession(opts: {
  sessionId: string;
  businessId: string;
  stripeAccountId: string;
  deadline: Deadline;
}): Promise<SupersedableSession | null> {
  let session: Stripe.Checkout.Session;
  try {
    session = await holdCall(opts.deadline, opts.stripeAccountId, (options) =>
      stripeClient.checkout.sessions.retrieve(opts.sessionId, options),
    );
  } catch (err) {
    if (classifyStripeError(err) === "invalid") return null;
    throw err;
  }
  if (
    session.mode !== "payment" ||
    session.metadata?.businessId !== opts.businessId ||
    // Only cart checkouts hold reservations; never touch a donation.
    session.metadata.kind
  ) {
    return null;
  }
  if (session.status === "open") return { session, status: "open" };
  if (session.status === "expired") return { session, status: "expired" };
  return null;
}

export type SupersedableHold = SupersedableSession & {
  sessionId: string;
  stripeAccountId: string;
  reservationId: string;
  items: ReservationEntry[];
};

/**
 * THE supersedable-hold decision, shared by create-session and Apply.
 * DB-first, so nothing reaches Stripe unless there is a hold to give back:
 *
 * 1. The cookie must carry a valid signature for this business
 *    (`readPendingSessionId`) — a forged or unsigned value naming someone
 *    else's session is ignored.
 * 2. This business must have an ACTIVE InventoryReservation whose
 *    `stripeSessionId` is that session. None → null, no Stripe call.
 * 3. Only then: the session, retrieved on the business's connected account,
 *    must be a cart checkout of this business that is `open` (or `expired`),
 *    never `complete`.
 *
 * Deliberately NO `metadata.reservationId` fallback: if attaching
 * `stripeSessionId` to the reservation failed in create-session (rare, and
 * reported to Sentry there), neither side supersedes and the shopper's old
 * hold lapses at its 30-minute expiry. Both sides must see the same hold.
 *
 * Also deliberate: a cart with NO reservation (only untracked stock, no
 * discount code) is never superseded. Its old session is not expired, so it
 * may still produce the abandoned-cart email when it lapses — the behavior
 * before superseding existed. Nothing is held, so nothing locks the shopper
 * out, and skipping it saves a Stripe round-trip on every checkout.
 *
 * `discountCodeId` (Apply only) narrows to a hold that contains a use of
 * that code. Excluding any other hold would be a no-op for that code's
 * counts, so this only skips a pointless Stripe call; the lookup itself is
 * identical. Throws on unexpected DB/Stripe errors.
 */
async function lookupSupersedableHold(
  db: DbClient,
  opts: {
    sessionId: string;
    businessId: string;
    discountCodeId?: string;
    deadline: Deadline;
  },
): Promise<SupersedableHold | null> {
  const reservation = await db.inventoryReservation.findFirst({
    where: {
      businessId: opts.businessId,
      stripeSessionId: opts.sessionId,
      status: "active",
    },
    select: {
      id: true,
      items: true,
      business: { select: { stripeAccountId: true } },
    },
  });
  const stripeAccountId = reservation?.business.stripeAccountId;
  if (!reservation || !stripeAccountId) return null;
  const items = reservation.items as ReservationEntry[];
  if (
    opts.discountCodeId !== undefined &&
    !items.some((e) => e.discountCodeId === opts.discountCodeId)
  ) {
    return null;
  }
  const found = await retrieveSupersedableSession({
    sessionId: opts.sessionId,
    businessId: opts.businessId,
    stripeAccountId,
    deadline: opts.deadline,
  });
  if (!found) return null;
  return {
    ...found,
    sessionId: opts.sessionId,
    stripeAccountId,
    reservationId: reservation.id,
    items,
  };
}

/**
 * Release exactly the looked-up reservation (stock + discount use). Gated by
 * the same conditional `active → released` flip as every other settlement
 * path, so the later expired webhook (or the sweeper) releases nothing twice.
 */
async function releaseHold(
  db: DbClient,
  hold: Pick<SupersedableHold, "reservationId" | "items">,
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const flipped = await tx.inventoryReservation.updateMany({
      where: { id: hold.reservationId, status: "active" },
      data: { status: "released" },
    });
    if (flipped.count === 0) return false;
    await releaseReservation(tx, { items: hold.items }, { mode: "release" });
    return true;
  });
}

/**
 * create-session, after the request's hold-independent validation and before
 * the stock check, the discount usage checks and the reservation claim: if
 * the signed `pending_session` cookie names a supersedable hold (see
 * `lookupSupersedableHold`), mark its session superseded, expire it on
 * Stripe and — only once Stripe confirms it is expired — release that
 * reservation inline, so the new checkout sees the shopper's own stock and
 * discount use as free again.
 *
 * The whole step — DB lookup included — runs within `SUPERSEDE_BUDGET_MS`: a
 * Stripe call that no longer fits is skipped and read as an unknown outcome,
 * exactly like a timeout (see `callWithinDeadline`).
 *
 * When the expire call fails, what happens depends on what the failure says
 * (`classifyStripeError`) and on one re-check of the session (skipped, i.e.
 * "can't tell", when the budget is spent):
 *
 * | expire error            | re-check says  | supersededAt mark | hold            |
 * | ----------------------- | -------------- | ----------------- | --------------- |
 * | invalid (not open now)  | (no re-check)  | kept              | kept            |
 * | unknown or failed       | expired        | kept              | released inline |
 * | unknown (timeout, …)    | open / ?       | kept              | kept, reported  |
 * | failed (Stripe error)   | open           | cleared           | kept, reported  |
 * | failed (Stripe error)   | complete / ?   | kept              | kept, reported  |
 *
 * Unknown + open keeps the mark on purpose: a timed-out expire (or
 * stripe-node's abandoned retry) can still commit AFTER the re-check, and a
 * cleared mark would then email an abandoned-cart reminder to a shopper who
 * is checking out again right now. The accepted cost: if that old session
 * really stays open and is later abandoned, its abandoned-cart email is
 * missed. Only a definite failure — Stripe answered that it did not expire
 * the session — while the session is still open clears the mark.
 *
 * Never throws: a missing/forged cookie, no active hold, a foreign or unknown
 * session, an already-complete session, or any Stripe/DB error just leaves
 * things as they are (the new checkout proceeds and may then be rejected on
 * its own merits). Unexpected errors are reported to Sentry.
 *
 * `deadline` is a test seam; callers omit it.
 */
export async function supersedePendingCheckout(
  db: DbClient,
  opts: { headers: Headers; businessId: string; deadline?: Deadline },
): Promise<{ superseded: boolean; released: boolean }> {
  const none = { superseded: false, released: false };
  const sessionId = readPendingSessionId(opts.headers, opts.businessId);
  if (!sessionId) return none;
  const deadline = opts.deadline ?? createDeadline(SUPERSEDE_BUDGET_MS);

  try {
    const hold = await lookupSupersedableHold(db, {
      sessionId,
      businessId: opts.businessId,
      deadline,
    });
    if (!hold) return none;
    const stripeAccount = hold.stripeAccountId;

    let expired = hold.status === "expired";
    if (hold.status === "open") {
      // Mark BEFORE expiring: the `checkout.session.expired` event carries the
      // session as it is at expiry, metadata included, and an expired session
      // may no longer be updatable. Stripe merges metadata keys, so the
      // session's existing metadata (businessId, reservationId, …) stays. A
      // failed mark is not a reason to keep the shopper locked out — at worst
      // they get one abandoned-cart email.
      // False only when Stripe definitely did not apply the mark.
      let mayBeMarked = true;
      try {
        await holdCall(deadline, stripeAccount, (options) =>
          stripeClient.checkout.sessions.update(
            sessionId,
            {
              metadata: {
                [SUPERSEDED_METADATA_KEY]: String(
                  Math.floor(Date.now() / 1000),
                ),
              },
            },
            options,
          ),
        );
      } catch (markErr) {
        const markClass = classifyStripeError(markErr);
        mayBeMarked = markClass === "unknown";
        if (markClass !== "invalid") {
          reportHoldFailure(markErr, {
            route: "stripe.create-session",
            step: "supersede-mark",
            businessId: opts.businessId,
          });
        }
      }
      try {
        const result = await holdCall(deadline, stripeAccount, (options) =>
          stripeClient.checkout.sessions.expire(sessionId, {}, options),
        );
        expired = result.status === "expired";
      } catch (expireErr) {
        const expireClass = classifyStripeError(expireErr);
        if (expireClass === "invalid") {
          // The session completed or expired between the retrieve and this
          // call — leave its hold alone. The mark is deliberately kept:
          // completed → it is harmless (no abandoned-cart email for a paid
          // session); expired → the shopper is checking out again right now,
          // so suppressing the abandoned-cart email is correct.
          return none;
        }
        // "unknown": Stripe may have expired it (a timeout after commit) or
        // still may. "failed": Stripe says it did not. Either way look once
        // more before deciding anything (see the table above).
        let recheck: Stripe.Checkout.Session.Status | null = null;
        try {
          const again = await holdCall(deadline, stripeAccount, (options) =>
            stripeClient.checkout.sessions.retrieve(sessionId, options),
          );
          recheck = again.status;
        } catch {
          // Can't tell (the reported expire error below covers it).
        }
        if (recheck !== "expired") {
          if (expireClass === "failed" && recheck === "open" && mayBeMarked) {
            // Definitely still open and payable, so a leftover mark would
            // silence the abandoned-cart email if the shopper really abandons
            // it. Best-effort clear it (Stripe deletes a metadata key set to
            // ""); a failure is reported and the mark stays.
            try {
              await holdCall(deadline, stripeAccount, (options) =>
                stripeClient.checkout.sessions.update(
                  sessionId,
                  { metadata: { [SUPERSEDED_METADATA_KEY]: "" } },
                  options,
                ),
              );
            } catch (clearErr) {
              reportHoldFailure(clearErr, {
                route: "stripe.create-session",
                step: "supersede-unmark",
                businessId: opts.businessId,
                extra: { pendingSessionId: sessionId },
              });
            }
          }
          // The outer catch reports the expire failure; the hold stays.
          throw expireErr;
        }
        // It did expire: the shopper is checking out again right now, so the
        // mark stays (no abandoned-cart email) and the hold is free — fall
        // through to the same inline release as a clean expire.
        expired = true;
      }
    }

    // Stripe confirmed the session can no longer be paid: its hold is free.
    // A `complete` session never reaches here.
    if (!expired) return none;
    const released = await releaseHold(db, hold);
    return { superseded: hold.status === "open", released };
  } catch (err) {
    console.warn("[create-session] Failed to supersede pending checkout:", err);
    reportHoldFailure(err, {
      route: "stripe.create-session",
      step: "supersede-pending-session",
      businessId: opts.businessId,
      extra: { pendingSessionId: sessionId },
    });
    return none;
  }
}

/**
 * Apply (discount.validate): the reservation id create-session WOULD
 * supersede — same lookup — when it holds a use of `discountCodeId`. Its hold
 * is about to be given back, so Apply leaves it out of its counts. Null
 * otherwise (no/forged cookie, no active hold, a completed bank payment, any
 * error or an exhausted `LOOKUP_BUDGET_MS` — when in doubt the hold counts,
 * exactly as create-session would count it). Read-only: never marks, expires
 * or releases anything.
 *
 * `deadline` is a test seam; callers omit it.
 */
export async function findSupersedableHold(
  db: DbClient,
  opts: {
    headers: Headers;
    businessId: string;
    discountCodeId: string;
    deadline?: Deadline;
  },
): Promise<string | null> {
  const sessionId = readPendingSessionId(opts.headers, opts.businessId);
  if (!sessionId) return null;
  const deadline = opts.deadline ?? createDeadline(LOOKUP_BUDGET_MS);
  try {
    const hold = await lookupSupersedableHold(db, {
      sessionId,
      businessId: opts.businessId,
      discountCodeId: opts.discountCodeId,
      deadline,
    });
    return hold?.reservationId ?? null;
  } catch (err) {
    reportHoldFailure(err, {
      route: "discount.validate",
      step: "find-supersedable-hold",
      businessId: opts.businessId,
    });
    return null;
  }
}

/**
 * Usage of a discount code as a new checkout should see it — the inputs to
 * `validateAndComputeDiscount`:
 *
 * - `usageCount`: the row's count (final uses + uses held by open checkouts),
 *   minus the hold of `excludeReservationId` when that reservation is still
 *   active (the shopper's own checkout that is about to be superseded).
 * - `customerUsageCount` (only when the code has a per-customer limit and the
 *   email is known): this shopper's non-cancelled orders with the code plus
 *   their uses held by open checkouts, minus the same excluded hold.
 */
export async function discountUsageForCheckout(
  db: DbClient,
  opts: {
    businessId: string;
    discount: {
      id: string;
      usageCount: number;
      perCustomerLimit: number | null;
    };
    /** Normalized shopper email, when known. */
    customerEmail?: string;
    excludeReservationId?: string | null;
  },
): Promise<{ usageCount: number; customerUsageCount: number | undefined }> {
  const { businessId, discount, customerEmail } = opts;

  let excludedTotal = 0;
  let excludedCustomer = 0;
  if (opts.excludeReservationId) {
    const excluded = await db.inventoryReservation.findFirst({
      where: { id: opts.excludeReservationId, businessId, status: "active" },
      select: { items: true },
    });
    for (const entry of (excluded?.items ?? []) as ReservationEntry[]) {
      if (entry.discountCodeId !== discount.id) continue;
      excludedTotal += entry.qty;
      if (customerEmail !== undefined && entry.customerEmail === customerEmail)
        excludedCustomer += entry.qty;
    }
  }

  let customerUsageCount: number | undefined;
  if (discount.perCustomerLimit != null && customerEmail !== undefined) {
    const [orderUses, heldUses] = await Promise.all([
      db.order.count({
        where: {
          businessId,
          discountCodeId: discount.id,
          customerEmail,
          status: { not: "cancelled" },
        },
      }),
      countHeldDiscountUses(db, {
        businessId,
        discountCodeIds: [discount.id],
        customerEmail,
      }),
    ]);
    customerUsageCount = Math.max(
      0,
      orderUses + (heldUses.get(discount.id) ?? 0) - excludedCustomer,
    );
  }

  return {
    usageCount: Math.max(0, discount.usageCount - excludedTotal),
    customerUsageCount,
  };
}
