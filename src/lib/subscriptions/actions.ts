import type { Subscription } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";

import type { SubscriptionEmailBusiness } from "./emails";
import type { DbClient } from "~/server/db";
import { stripeClient } from "~/lib/stripe/client";

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
 */
export async function pauseSubscription(
  db: DbClient,
  input: ActionTarget,
): Promise<Subscription> {
  const { row, business } = await loadTarget(db, input);

  if (!PAUSABLE_STATUSES.has(row.status)) {
    throw new SubscriptionActionError(
      "invalid_state",
      `A ${row.status} subscription cannot be paused`,
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

  const updated = await db.subscription.update({
    where: { id: row.id },
    data: {
      status: "paused",
      // An indefinite pause supersedes any pending skip window.
      pauseResumesAt: null,
    },
  });

  await bestEffort("pause-email", business.id, () =>
    sendSubscriptionUpdatedEmail({
      business,
      subscription: updated,
      variant: "paused",
    }),
  );

  return updated;
}

/**
 * Resume a paused subscription.
 *
 * Stripe clears `pause_collection` with the EMPTY STRING, not `null` — a null
 * is rejected, and omitting the key leaves the pause in place.
 */
export async function resumeSubscription(
  db: DbClient,
  input: ActionTarget,
): Promise<Subscription> {
  const { row, business } = await loadTarget(db, input);

  if (row.status !== "paused") {
    throw new SubscriptionActionError(
      "invalid_state",
      `A ${row.status} subscription cannot be resumed`,
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

  const updated = await db.subscription.update({
    where: { id: row.id },
    data: { status: "active", pauseResumesAt: null },
  });

  await bestEffort("resume-email", business.id, () =>
    sendSubscriptionUpdatedEmail({
      business,
      subscription: updated,
      variant: "resumed",
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
 * Implemented as a *bounded* pause: `pause_collection` with a `resumes_at` one
 * hour past the current period end. Stripe still generates the next invoice on
 * schedule and voids it (no `invoice.paid` → no Order → no delivery), then
 * resumes normal collection for the cycle after. The one-hour buffer exists
 * because `resumes_at` set exactly at the period boundary races the invoice
 * Stripe is generating at that same instant.
 *
 * The row's local status becomes `paused` (Stripe's stays `active`, see
 * `pauseSubscription`), and `nextBillingAt` moves out by one cadence so the
 * manage page and the customer's email agree on when the next delivery lands.
 */
export async function skipNextDelivery(
  db: DbClient,
  input: ActionTarget & {
    /**
     * Reserved so callers (and tests) can pin the clock. The skip window is
     * anchored entirely to `currentPeriodEnd` — Stripe's own boundary — so it
     * does not enter the arithmetic today.
     */
    now?: Date;
  },
): Promise<Subscription> {
  const { row, business } = await loadTarget(db, input);

  if (row.status !== "active") {
    throw new SubscriptionActionError(
      "invalid_state",
      `A ${row.status} subscription has no next delivery to skip`,
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
      status: "paused",
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
    }),
  );

  return updated;
}
