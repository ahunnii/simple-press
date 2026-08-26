import type { Prisma, Subscription } from "generated/prisma";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";

import type { DbClient } from "~/server/db";
import { stripeClient } from "~/lib/stripe/client";

import { processPaidInvoice } from "./order-from-invoice";
import { getInvoicePaymentIntentId } from "./stripe-invoice";
import { applyStripeSubscriptionState } from "./webhook";

/**
 * Cron reconciler for `Subscription` rows — the self-healing backstop behind
 * the webhook (plan §9).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS ALONGSIDE THE WEBHOOK
 * ────────────────────────────────────────────────────────────────────────────
 * The webhook is the fast path: every subscription state change and every
 * paid invoice should already be reflected locally within seconds. This sweep
 * exists for the two ways that can silently fail — a webhook delivery Stripe
 * gave up retrying, or an event that arrived before the platform's Connect
 * webhook had the five subscription event types added to it (see the plan's
 * go-live checklist). Every eligible row gets its Stripe state re-derived
 * from scratch (`applyStripeSubscriptionState`, the same idempotent function
 * the webhook uses), and if the subscription's `latest_invoice` turns out to
 * be paid with no local Order for it, `processPaidInvoice` creates the missed
 * order exactly as the `invoice.paid` handler would have.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NOT GATED ON THE `subscriptions` FLAG
 * ────────────────────────────────────────────────────────────────────────────
 * A live subscription keeps billing at Stripe regardless of whether the owner
 * has since turned the storefront feature off — Stripe does not know or care
 * about a SimplePress feature flag. If this sweep stopped reconciling a
 * flag-off business, its renewals would keep collecting money at Stripe while
 * the local `Subscription` row silently drifted out of sync (wrong status,
 * missing renewal Orders, no fulfillment). The only gate here is whether the
 * business has a connected Stripe account at all — with none, there is
 * nothing to call and no state to reconcile.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * STEADY-STATE COST + THROTTLE
 * ────────────────────────────────────────────────────────────────────────────
 * One indexed SELECT (`@@index([status, lastSyncedAt])`) for subscriptions due
 * a poll; an empty result returns before a single business row loads or a
 * single Stripe socket opens. `SYNC_THROTTLE_MS` (6h) keeps a healthy
 * subscription from being re-polled every tick; `ignoreInterval` (the admin
 * "Sync now" action) bypasses only that throttle, never the connection check.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ISOLATION
 * ────────────────────────────────────────────────────────────────────────────
 * Each row is synced inside its own try/catch: a Stripe outage or a malformed
 * response for one subscription must never stop the rest of the batch. A
 * failed row is NOT stamped with `lastSyncedAt`, so it stays eligible and
 * retries on the very next tick instead of being benched for
 * `SYNC_THROTTLE_MS` by a failure it didn't cause.
 */

// Freshness throttle — a subscription synced more recently than this is
// skipped unless `ignoreInterval` is set.
const SYNC_THROTTLE_MS = 6 * 60 * 60 * 1000;

// A signup that never completed Stripe Checkout (still `incomplete`, no
// `stripeSubscriptionId`) older than this is abandoned, not just slow —
// nothing was ever created at Stripe to reconcile against, so the row is
// deleted rather than synced.
const STALE_INCOMPLETE_MS = 25 * 60 * 60 * 1000;

// One sweep processes at most this many rows, oldest-`lastSyncedAt`-first —
// a large backlog drains across ticks rather than in one long request.
const SYNC_BATCH = 50;

/** Statuses worth reconciling. `cancelled` is terminal — nothing left to sync. */
const SYNCABLE_STATUSES = ["active", "past_due", "paused", "incomplete"];

const SYNC_BUSINESS_SELECT = {
  id: true,
  name: true,
  ownerEmail: true,
  subdomain: true,
  customDomain: true,
  domainStatus: true,
  pickupLocation: true,
  pickupInstructions: true,
  businessAddress: true,
  stripeAccountId: true,
  siteContent: { select: { logoUrl: true } },
} satisfies Prisma.BusinessSelect;

type SyncBusiness = Prisma.BusinessGetPayload<{
  select: typeof SYNC_BUSINESS_SELECT;
}>;

export interface SyncSubscriptionsOptions {
  /** Injectable clock — every timestamp this run writes is this exact instant. */
  now?: Date;
  /** Restrict the sweep to a single business (the admin "Sync now" action). */
  businessId?: string;
  /** Bypass the `SYNC_THROTTLE_MS` freshness throttle — not the connection check. */
  ignoreInterval?: boolean;
}

/**
 * Sweep due `Subscription` rows and reconcile them against Stripe.
 *
 * Returns the number of rows successfully synced against Stripe — mirroring
 * `syncQuickBooksInvoices`'s counting convention: administrative housekeeping
 * (deleting a stale `incomplete` signup) is not a "sync" and is not counted,
 * and a row whose Stripe call failed is not counted either (see the module
 * docblock on isolation).
 */
export async function syncSubscriptions(
  db: DbClient,
  opts: SyncSubscriptionsOptions = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - SYNC_THROTTLE_MS);

  const rows = await db.subscription.findMany({
    where: {
      status: { in: SYNCABLE_STATUSES },
      ...(opts.businessId ? { businessId: opts.businessId } : {}),
      ...(opts.ignoreInterval
        ? {}
        : { OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }] }),
    },
    // Stalest (never-synced first) so a capped batch drains oldest-first.
    orderBy: [{ lastSyncedAt: { sort: "asc", nulls: "first" } }],
    take: SYNC_BATCH,
  });
  if (rows.length === 0) return 0;

  const businessIds = [...new Set(rows.map((row) => row.businessId))];
  const businesses = await db.business.findMany({
    where: { id: { in: businessIds } },
    select: SYNC_BUSINESS_SELECT,
  });
  const businessById = new Map(businesses.map((b) => [b.id, b]));

  let synced = 0;

  for (const row of rows) {
    const business = businessById.get(row.businessId);

    // No connected Stripe account: nothing at Stripe to reconcile against,
    // and no local write is safe to make on its behalf either. Left
    // completely untouched — see the module docblock.
    if (!business?.stripeAccountId) continue;

    // Abandoned signup — checkout was never finished, so Stripe never told us
    // a subscription id. There is nothing to retrieve; clean it up instead.
    if (
      row.status === "incomplete" &&
      !row.stripeSubscriptionId &&
      now.getTime() - row.createdAt.getTime() > STALE_INCOMPLETE_MS
    ) {
      await db.subscription.delete({ where: { id: row.id } }).catch(() => {
        // Already gone (concurrently cancelled/expired) — fine either way.
      });
      continue;
    }

    // An `incomplete` row that hasn't reached Stripe yet and isn't stale
    // enough to give up on: there is no id to call `retrieve` with. Leave it
    // for a later sweep rather than guessing.
    if (!row.stripeSubscriptionId) continue;

    try {
      const stripeSub = await stripeClient.subscriptions.retrieve(
        row.stripeSubscriptionId,
        // `latest_invoice.payments` is not optional detail: it is the only
        // place the PaymentIntent id lives in API 2026-01-28 (`invoice.
        // payment_intent` is gone), and `Order.stripePaymentIntentId` is what
        // `order.refund` issues against. Expanding only `latest_invoice` would
        // make every self-healed renewal order silently unrefundable.
        { expand: ["latest_invoice", "latest_invoice.payments"] },
        { stripeAccount: business.stripeAccountId },
      );

      await applyStripeSubscriptionState(db, row, stripeSub);
      await maybeSelfHealMissedInvoice(db, business, row, stripeSub);

      await db.subscription.update({
        where: { id: row.id },
        data: { lastSyncedAt: now },
      });
      synced++;
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          "cron.job": "subscription-sync",
          service: "stripe",
          businessId: row.businessId,
        },
      });
      // Deliberately NOT stamped: leaving `lastSyncedAt` untouched keeps this
      // row eligible for the very next tick instead of benching it for
      // `SYNC_THROTTLE_MS` on a failure it didn't cause.
    }
  }

  return synced;
}

/**
 * Missed-webhook self-heal: if Stripe's authoritative `latest_invoice` is
 * paid and no local `Order` carries that `stripeInvoiceId` yet, create it now
 * — exactly what the `invoice.paid` webhook handler would have done. A no-op
 * whenever an Order already exists (the normal case — the webhook already
 * handled it) or the latest invoice isn't paid.
 */
async function maybeSelfHealMissedInvoice(
  db: DbClient,
  business: SyncBusiness,
  subscription: Subscription,
  stripeSub: Stripe.Subscription,
): Promise<void> {
  const latestInvoice = stripeSub.latest_invoice;
  if (!latestInvoice || typeof latestInvoice === "string") return;
  if (latestInvoice.status !== "paid") return;

  const existingOrder = await db.order.findUnique({
    where: { stripeInvoiceId: latestInvoice.id },
    select: { id: true },
  });
  if (existingOrder) return;

  await processPaidInvoice(db, {
    business,
    subscription,
    invoice: latestInvoice,
    paymentIntentId: getInvoicePaymentIntentId(latestInvoice),
  });
}
