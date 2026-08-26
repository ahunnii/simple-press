import type { Subscription } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";

import type { SubscriptionEmailBusiness } from "./emails";
import type { DbClient } from "~/server/db";
import { stripeClient } from "~/lib/stripe/client";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";

import {
  sendSubscriptionCancelledEmails,
  sendSubscriptionUpdatedEmail,
} from "./emails";
import { addBillingInterval } from "./status";

/**
 * Cancel / pause / resume / skip — the four state changes a subscription can
 * take outside the Stripe webhook.
 *
 * All four are shared verbatim by three callers with very different trust
 * levels: the token-scoped storefront manage page, the signed-in account page,
 * and the admin. That is why every one of them takes a `businessId` and scopes
 * its lookup by it: a row belonging to another tenant must be indistinguishable
 * from a row that does not exist. Callers translate `not_found` into their own
 * 404 / `NOT_FOUND` rather than leaking which of the two it was.
 *
 * Every Stripe call passes `{ stripeAccount }`. Without it the SDK operates on
 * the PLATFORM's account — the failure mode that is hardest to notice and
 * worst to discover in production.
 */

/** Business fields the actions read (billing + email chrome). */
const BUSINESS_SELECT = {
  id: true,
  name: true,
  ownerEmail: true,
  subdomain: true,
  customDomain: true,
  domainStatus: true,
  stripeAccountId: true,
  siteContent: { select: { logoUrl: true } },
} as const;

type ActionBusiness = SubscriptionEmailBusiness & {
  stripeAccountId: string | null;
};

export type SubscriptionActionErrorCode =
  /** No such row for this business — or a row belonging to another tenant. */
  | "not_found"
  /** The row's current `status` does not allow this transition. */
  | "invalid_state"
  /** The store has no connected Stripe account, so the change cannot reach Stripe. */
  | "not_connected";

export class SubscriptionActionError extends Error {
  readonly code: SubscriptionActionErrorCode;

  constructor(code: SubscriptionActionErrorCode, message: string) {
    super(message);
    this.name = "SubscriptionActionError";
    this.code = code;
  }
}

export type CancelReason =
  | "customer"
  | "owner"
  | "stripe"
  | "payment_failed"
  | "checkout_expired";

interface ActionTarget {
  businessId: string;
  subscriptionId: string;
}

/**
 * The customer-facing name of a row's status, for the message on an
 * `invalid_state` error. Raw column values (`past_due`, `incomplete`) reach the
 * storefront manage page verbatim through `mapActionError`, so they go through
 * the same label map the pills and badges use.
 */
function statusLabel(status: string): string {
  return (
    SUBSCRIPTION_STATUS_LABELS[
      status as keyof typeof SUBSCRIPTION_STATUS_LABELS
    ] ?? status
  );
}

/**
 * Is this row mid-skip? A skip is a BOUNDED `pause_collection` — the row stays
 * `active` (see `deriveSubscriptionStatus`) and `pauseResumesAt` holds the
 * moment Stripe resumes collecting. An indefinite pause never sets it, so a
 * future `pauseResumesAt` on an active row means exactly one thing.
 */
function hasPendingSkip(
  row: Pick<Subscription, "pauseResumesAt">,
  now: Date = new Date(),
): boolean {
  return row.pauseResumesAt !== null && row.pauseResumesAt > now;
}

/**
 * Load the row and its business together, scoped by `businessId`.
 *
 * Deliberately one function: every action needs both, and every action must
 * fail the same indistinguishable way when either is missing.
 */
async function loadTarget(
  db: DbClient,
  { businessId, subscriptionId }: ActionTarget,
): Promise<{ row: Subscription; business: ActionBusiness }> {
  const row = await db.subscription.findFirst({
    where: { id: subscriptionId, businessId },
  });
  if (!row) {
    throw new SubscriptionActionError(
      "not_found",
      "Subscription not found for this store",
    );
  }

  const business = await db.business.findUnique({
    where: { id: businessId },
    select: BUSINESS_SELECT,
  });
  if (!business) {
    throw new SubscriptionActionError("not_found", "Business not found");
  }

  return { row, business };
}

/** Stripe account id, or `not_connected` — never a silent local-only change. */
function requireStripeAccount(business: ActionBusiness): string {
  if (!business.stripeAccountId) {
    throw new SubscriptionActionError(
      "not_connected",
      "This store is not connected to Stripe",
    );
  }
  return business.stripeAccountId;
}

/**
 * Email is best-effort. Every caller has already committed the state change
 * (and the Stripe call) by the time this runs, so a Resend outage must not
 * turn a successful cancellation into a 500 that invites the customer to try
 * again — `sendEmail` itself never throws and reports its own failures to
 * Sentry; this catch only covers the template/override lookup around it.
 * Same convention as the webhook path (`webhook.ts`'s `respond()`): tagged
 * `service: "stripe"` + `subscription.step` + `businessId`, never thrown.
 */
async function bestEffort(
  step: string,
  businessId: string,
  send: () => Promise<unknown>,
): Promise<void> {
  try {
    await send();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { service: "stripe", "subscription.step": step, businessId },
    });
  }
}

/**
 * Write a status transition only if the row still carries the status the action
 * read, then reload it. Returns `transitioned: false` when the row moved in the
 * meantime — in practice the `customer.subscription.updated` webhook for the
 * Stripe call the action just made, which reached the DB first and, having
 * observed the transition itself, already sent the customer's email. The action
 * then keeps the (correct) row and stays quiet, so a pause or resume produces
 * exactly one email whichever side wins the race.
 */
async function transitionIfStatus(
  db: DbClient,
  row: Pick<Subscription, "id" | "status">,
  data: Parameters<DbClient["subscription"]["updateMany"]>[0]["data"],
): Promise<{ updated: Subscription; transitioned: boolean }> {
  const { count } = await db.subscription.updateMany({
    where: { id: row.id, status: row.status },
    data,
  });
  const updated = await db.subscription.findUniqueOrThrow({
    where: { id: row.id },
  });
  return { updated, transitioned: count === 1 };
}

/**
 * The idempotency anchor for an email about a transition this action wrote:
 * `updatedAt` is stamped by that write, so it is unique per transition and
 * stable for this call — unlike `nextBillingAt`, which pause/resume never move.
 */
function transitionKeyOf(row: Pick<Subscription, "updatedAt">): string {
  return String(row.updatedAt.getTime());
}

/**
 * Cancel immediately, with no proration or refund — an already-paid delivery
 * still ships (the plan's locked decision).
 *
 * Two shapes reach here. A row that never got past `incomplete` has no
 * `stripeSubscriptionId`, so there is nothing at Stripe to cancel and the row
 * is closed locally with no API call. A live row is cancelled at Stripe first:
 * if that throws, the local row is left alone rather than claiming a
 * cancellation that never happened.
 *
 * A live row on a store with no `stripeAccountId` throws `not_connected`
 * rather than cancelling locally. A local-only cancel would tell the customer
 * they are unsubscribed while Stripe keeps billing them on the old account —
 * the one failure mode of this feature that costs a shopper real money. The
 * owner must reconnect (or cancel in Stripe) first.
 */
export async function cancelSubscription(
  db: DbClient,
  input: ActionTarget & { reason: CancelReason },
): Promise<Subscription> {
  const { row, business } = await loadTarget(db, input);

  if (row.status === "cancelled") {
    throw new SubscriptionActionError(
      "invalid_state",
      "This subscription is already cancelled",
    );
  }

  if (row.stripeSubscriptionId) {
    const stripeAccount = requireStripeAccount(business);
    await stripeClient.subscriptions.cancel(
      row.stripeSubscriptionId,
      {},
      { stripeAccount },
    );
  }

  const cancelledAt = new Date();
  const updated = await db.subscription.update({
    where: { id: row.id },
    data: {
      status: "cancelled",
      cancelledAt,
      cancelReason: input.reason,
      // A cancelled subscription can never resume; leaving a skip date behind
      // would make the admin row read as "paused until…".
      pauseResumesAt: null,
    },
  });

  await bestEffort("cancel-email", business.id, () =>
    sendSubscriptionCancelledEmails({
      business,
      subscription: updated,
      cancelledAt,
    }),
  );

  return updated;
}

/** Statuses a pause may start from — a live subscription, healthy or in dunning. */
const PAUSABLE_STATUSES = new Set(["active", "past_due"]);

/**
 * Pause indefinitely.
 *
 * `pause_collection: { behavior: "void" }` keeps Stripe generating invoices on
 * schedule but voids each one, so there is no `invoice.paid`, therefore no
 * Order and no delivery. Stripe's own `status` stays `"active"` throughout —
 * `pause_collection` is the only thing that distinguishes the two, which is
 * why `deriveSubscriptionStatus` reads it.
 *
 * Note the deliberate absence of `resumes_at`: an OPEN-ENDED pause is what
 * makes this a pause rather than a skip. `skipNextDelivery` sets one, and
 * `deriveSubscriptionStatus` uses exactly that to tell the two apart — never
 * add a `resumes_at` here.
 */
export async function pauseSubscription(
  db: DbClient,
  input: ActionTarget,
): Promise<Subscription> {
  const { row, business } = await loadTarget(db, input);

  if (!PAUSABLE_STATUSES.has(row.status)) {
    throw new SubscriptionActionError(
      "invalid_state",
      `A ${statusLabel(row.status).toLowerCase()} subscription cannot be paused`,
    );
  }

  const stripeAccount = requireStripeAccount(business);
  if (!row.stripeSubscriptionId) {
    throw new SubscriptionActionError(
      "invalid_state",
      "This subscription has not reached Stripe yet",
    );
  }

  await stripeClient.subscriptions.update(
    row.stripeSubscriptionId,
    { pause_collection: { behavior: "void" } },
    { stripeAccount },
  );

  const { updated, transitioned } = await transitionIfStatus(db, row, {
    status: "paused",
    // An indefinite pause supersedes any pending skip window.
    pauseResumesAt: null,
  });
  // The webhook got there first and has already emailed — see `transitionIfStatus`.
  if (!transitioned) return updated;

  await bestEffort("pause-email", business.id, () =>
    sendSubscriptionUpdatedEmail({
      business,
      subscription: updated,
      variant: "paused",
      transitionKey: transitionKeyOf(updated),
    }),
  );

  return updated;
}

/**
 * Resume a paused subscription — or UNDO a pending skip.
 *
 * Both are the same Stripe call, because both are the same Stripe state: a
 * `pause_collection` that needs clearing. The only difference is which shape
 * put it there (see `deriveSubscriptionStatus`), so this accepts two rows:
 *
 * - `status: "paused"` — an indefinite pause, resumed on request.
 * - `status: "active"` with a FUTURE `pauseResumesAt` — a skip the customer
 *   has changed their mind about. Clearing the pause puts the skipped delivery
 *   back on, so `nextBillingAt` is restored to `currentPeriodEnd` (the
 *   boundary `skipNextDelivery` had moved it past).
 *
 * Stripe clears `pause_collection` with the EMPTY STRING, not `null` — a null
 * is rejected, and omitting the key leaves the pause in place.
 */
export async function resumeSubscription(
  db: DbClient,
  input: ActionTarget & { now?: Date },
): Promise<Subscription> {
  const { row, business } = await loadTarget(db, input);

  const now = input.now ?? new Date();
  const undoSkip = row.status === "active" && hasPendingSkip(row, now);

  if (row.status !== "paused" && !undoSkip) {
    throw new SubscriptionActionError(
      "invalid_state",
      `A ${statusLabel(row.status).toLowerCase()} subscription cannot be resumed`,
    );
  }

  const stripeAccount = requireStripeAccount(business);
  if (!row.stripeSubscriptionId) {
    throw new SubscriptionActionError(
      "invalid_state",
      "This subscription has not reached Stripe yet",
    );
  }

  await stripeClient.subscriptions.update(
    row.stripeSubscriptionId,
    { pause_collection: "" },
    { stripeAccount },
  );

  const { updated, transitioned } = await transitionIfStatus(db, row, {
    status: "active",
    pauseResumesAt: null,
    // Undoing a skip puts the delivery at the current period boundary back
    // on, so `nextBillingAt` returns to it. A plain resume leaves whatever
    // the row already carried — the next sync/webhook re-derives it from
    // Stripe anyway.
    ...(undoSkip && row.currentPeriodEnd
      ? { nextBillingAt: row.currentPeriodEnd }
      : {}),
  });
  // A plain resume the webhook applied first has already been emailed. (An
  // undo-skip is `active` → `active`, so the CAS always succeeds and the
  // webhook — which only emails on a status change — leaves it to us.)
  if (!transitioned) return updated;

  // An undo-skip gets its own heading ("Your next delivery is back on");
  // a plain resume keeps the generic "back on" copy.
  await bestEffort("resume-email", business.id, () =>
    sendSubscriptionUpdatedEmail({
      business,
      subscription: updated,
      variant: "resumed",
      undoSkip,
      transitionKey: transitionKeyOf(updated),
    }),
  );

  return updated;
}

/**
 * How far past the current period end a skip's `resumes_at` is placed.
 *
 * The window has to clear Stripe's own invoice pipeline: a subscription
 * invoice is created at the period boundary as a DRAFT and finalized roughly
 * an hour later, and `pause_collection` is what decides, at finalization,
 * whether that invoice is voided. A one-hour buffer is therefore exactly the
 * width of the race it is meant to avoid — collection could resume in the same
 * minute Stripe finalizes the invoice, and the delivery the customer asked to
 * skip gets charged and shipped anyway.
 *
 * Twelve hours clears the draft window with room to spare while staying far
 * inside the shortest cadence SimplePress offers (one week), so exactly one
 * invoice — the skipped one — is ever voided. Still worth confirming against a
 * Stripe test clock before go-live; see the feature doc's sandbox QA script.
 */
const SKIP_RESUME_BUFFER_MS = 12 * 60 * 60 * 1000;

/**
 * Skip exactly one delivery.
 *
 * Implemented as a *bounded* pause: `pause_collection` with a `resumes_at`
 * `SKIP_RESUME_BUFFER_MS` past the current period end. Stripe still generates
 * the next invoice on schedule and voids it (no `invoice.paid` → no Order → no
 * delivery), then resumes normal collection for the cycle after. The buffer
 * exists because `resumes_at` set exactly at the period boundary races the
 * invoice Stripe is generating at that same instant.
 *
 * **The row stays `active`.** A skip is not a pause: Stripe resumes collecting
 * by itself at `resumes_at`, nobody has to do anything, and the customer's
 * email says "skipped". Writing `paused` here (as this used to) contradicted
 * that email on the manage page, hid the Skip button behind a Resume that
 * silently cancelled the skip, and made `handleSubscriptionUpdated` fire a
 * second "paused" email on the way in and a "back on" one on the way out.
 * `pauseResumesAt` carries the window and `nextBillingAt` moves out by one
 * cadence, so the manage page, the admin table and the email all agree on when
 * the next delivery lands.
 */
export async function skipNextDelivery(
  db: DbClient,
  input: ActionTarget & {
    /**
     * Pins the clock for the already-skipped guard below. The skip WINDOW is
     * anchored entirely to `currentPeriodEnd` — Stripe's own boundary — so it
     * does not enter that arithmetic.
     */
    now?: Date;
  },
): Promise<Subscription> {
  const { row, business } = await loadTarget(db, input);

  if (row.status !== "active") {
    throw new SubscriptionActionError(
      "invalid_state",
      `A ${statusLabel(row.status).toLowerCase()} subscription has no next delivery to skip`,
    );
  }
  // Already mid-skip. Without this, a second click would move `resumes_at` to
  // the SAME boundary (it is derived from `currentPeriodEnd`, which the first
  // skip did not move) while pushing `nextBillingAt` another cadence out —
  // quietly telling the customer they skipped two deliveries when Stripe voids
  // exactly one.
  if (hasPendingSkip(row, input.now ?? new Date())) {
    throw new SubscriptionActionError(
      "invalid_state",
      "The next delivery is already skipped",
    );
  }
  if (!row.currentPeriodEnd) {
    // Checkout completed but the webhook hasn't filled in the period yet;
    // without it there is no boundary to pause until.
    throw new SubscriptionActionError(
      "invalid_state",
      "This subscription has no billing period yet",
    );
  }

  const stripeAccount = requireStripeAccount(business);
  if (!row.stripeSubscriptionId) {
    throw new SubscriptionActionError(
      "invalid_state",
      "This subscription has not reached Stripe yet",
    );
  }

  const resumesAt = new Date(
    row.currentPeriodEnd.getTime() + SKIP_RESUME_BUFFER_MS,
  );

  await stripeClient.subscriptions.update(
    row.stripeSubscriptionId,
    {
      pause_collection: {
        behavior: "void",
        resumes_at: Math.floor(resumesAt.getTime() / 1000),
      },
    },
    { stripeAccount },
  );

  const updated = await db.subscription.update({
    where: { id: row.id },
    data: {
      // Stays active — see this function's doc comment.
      status: "active",
      pauseResumesAt: resumesAt,
      nextBillingAt: addBillingInterval(
        row.currentPeriodEnd,
        row.interval,
        row.intervalCount,
      ),
    },
  });

  await bestEffort("skip-email", business.id, () =>
    sendSubscriptionUpdatedEmail({
      business,
      subscription: updated,
      variant: "skipped",
      transitionKey: transitionKeyOf(updated),
    }),
  );

  return updated;
}
