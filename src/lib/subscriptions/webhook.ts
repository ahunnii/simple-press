import type { Prisma, Subscription } from "generated/prisma";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import type { DbClient } from "~/server/db";
import { stripeClient } from "~/lib/stripe/client";
import { db } from "~/server/db";

import {
  sendSubscriptionCancelledEmails,
  sendSubscriptionPaymentFailedEmail,
  sendSubscriptionStartedEmails,
  sendSubscriptionUpdatedEmail,
} from "./emails";
import { processPaidInvoice } from "./order-from-invoice";
import {
  deriveSubscriptionStatus,
  parseSubscriptionMetadata,
  periodFromStripe,
  subscriptionMetadataSchema,
} from "./status";
import {
  getInvoiceMetadata,
  getInvoicePaymentIntentId,
  getInvoiceSubscriptionId,
  isSubscriptionInvoice,
} from "./stripe-invoice";

/**
 * The seven subscription branches of the Stripe Connect webhook.
 *
 * Subscriptions are a parallel lane, not a branch inside the one-time payment
 * path: the route (`src/app/api/webhooks/stripe/route.ts`) dispatches here and
 * nothing in this module touches cart, checkout-session or one-time order code.
 *
 * Contract shared by all seven handlers:
 *
 *  - `(event: Stripe.Event) => Promise<NextResponse>`, **always 200
 *    `{ received: true }`**. A handler that throws makes Stripe retry the same
 *    event against a store that will keep failing the same way, for days.
 *    Failures are captured to Sentry and swallowed; the cron reconciler
 *    (`sync.ts`) is the safety net that repairs whatever a swallowed failure
 *    left half-done.
 *  - **Tenant rule** (the security spine, mirroring the one-time path at route
 *    l.134–158): metadata is attacker-controllable — any connected merchant can
 *    put another store's `businessId` in their own subscription's metadata — so
 *    a business is only ever bound to an event when it *owns the connected
 *    account the event came from*. A rejected event writes nothing and still
 *    answers 200.
 *
 * Metadata lives in a different place per event type and is deliberately NOT
 * unified: a Checkout Session carries `session.metadata`, a subscription event
 * carries `subscription.metadata`, and an invoice carries the immutable
 * snapshot at `invoice.parent.subscription_details.metadata`.
 *
 * **Retrieve first, gate second.** The object on `event.data.object` is
 * rendered at the *webhook endpoint's* pinned API version, which has nothing to
 * do with the version `stripeClient` is pinned to (`2026-01-28.clover`). An
 * endpoint pinned older than `2025-03-31.basil` sends an invoice with no
 * `parent` at all (subscription id at `invoice.subscription`, metadata at
 * `invoice.subscription_details.metadata`) and a subscription whose
 * `current_period_start`/`_end` sit on the subscription root rather than on
 * `items.data[0]`. Both shapes read as *empty* through the clover-shaped
 * accessors — the invoice handlers would return silently with zero telemetry
 * while the store takes money, and the subscription handlers would write
 * `Invalid Date`. So every handler that needs more than metadata re-reads its
 * object through the SDK (scoped to the connected account) and runs all
 * subsequent gates on THAT object. Only `*.metadata` — flat string map, stable
 * across every API version — is ever read off the raw payload.
 */

const BUSINESS_SELECT = {
  id: true,
  name: true,
  ownerEmail: true,
  subdomain: true,
  customDomain: true,
  domainStatus: true,
  stripeAccountId: true,
  pickupLocation: true,
  pickupInstructions: true,
  businessAddress: true,
  siteContent: { select: { logoUrl: true } },
} satisfies Prisma.BusinessSelect;

export type SubscriptionTenantBusiness = Prisma.BusinessGetPayload<{
  select: typeof BUSINESS_SELECT;
}>;

export type SubscriptionTenant = {
  /** `stripeAccountId` is non-null by construction — resolution rejects without it. */
  business: SubscriptionTenantBusiness & { stripeAccountId: string };
  subscription: Subscription;
};

/** Reference to a subscription row, recovered from event metadata. */
export type SubscriptionRef = {
  businessId: string;
  subscriptionId: string;
};

function received(): NextResponse {
  return NextResponse.json({ received: true });
}

function idOf(
  value: string | { id: string } | null | undefined,
): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.id;
}

/** Read a subscription from the connected account through the pinned SDK. */
function retrieveConnectedSubscription(
  stripeAccountId: string,
  stripeSubscriptionId: string,
): Promise<Stripe.Subscription> {
  return stripeClient.subscriptions.retrieve(
    stripeSubscriptionId,
    {},
    { stripeAccount: stripeAccountId },
  );
}

/**
 * Re-read an invoice through the pinned SDK so its shape is the one
 * `stripe-invoice.ts` knows how to read, whatever API version the receiving
 * webhook endpoint is pinned to (see the module doc comment).
 *
 * Scoped to `event.account`, i.e. the connected account Stripe itself says
 * emitted the event — which is why this can safely run *before*
 * `resolveSubscriptionTenant`. It reads one object out of the account that sent
 * us the event and writes nothing; the tenant check that actually binds a
 * business to the event (`event.account === business.stripeAccountId`) is
 * unchanged and still gates every write. A retrieve failure throws into
 * `respond()`, which reports it and still answers 200.
 *
 * `event.account` is absent only for a platform-account event, which this lane
 * should never see. Falling back to the raw payload there keeps the handler
 * total rather than exploding on a `retrieve` with no account.
 */
function retrieveInvoiceForEvent(
  event: Stripe.Event,
  rawInvoice: Stripe.Invoice,
  params: Stripe.InvoiceRetrieveParams = {},
): Promise<Stripe.Invoice> {
  if (!event.account) return Promise.resolve(rawInvoice);
  return stripeClient.invoices.retrieve(rawInvoice.id, params, {
    stripeAccount: event.account,
  });
}

/**
 * A retrieved invoice that isn't a subscription invoice is not an error: a
 * connected merchant can raise a one-off invoice in their own Stripe dashboard
 * and it is none of our business. Left as a breadcrumb, not a capture, so it
 * shows up as context if something *else* is reported for this account.
 */
function breadcrumbNonSubscriptionInvoice(
  event: Stripe.Event,
  invoice: Stripe.Invoice,
): void {
  Sentry.addBreadcrumb({
    category: "stripe.subscription",
    level: "info",
    message: `${event.type} ${invoice.id} is not a subscription invoice — ignored`,
  });
}

/**
 * Wrap a handler body so it can never reject and always answers 200. `ctx` lets
 * the body publish the tenant it resolved, so a late failure is still tagged
 * with the store it belongs to.
 */
async function respond(
  event: Stripe.Event,
  step: string,
  run: (ctx: { businessId?: string }) => Promise<void>,
): Promise<NextResponse> {
  const ctx: { businessId?: string } = {};
  try {
    await run(ctx);
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag("service", "stripe");
      scope.setTag("webhook.step", `subscription-${event.type}`);
      scope.setTag("subscription.step", step);
      if (ctx.businessId) scope.setTag("businessId", ctx.businessId);
      scope.setExtra("eventId", event.id);
      Sentry.captureException(error);
    });
  }
  return received();
}

/**
 * Load a business and bind it to the event, or `null`.
 *
 * The `event.account === business.stripeAccountId` check is the whole security
 * model for this lane: without it a connected merchant could stamp another
 * tenant's `businessId` onto their own subscription and drive orders, inventory
 * deductions and emails inside a store they don't own. Every tenant resolver —
 * metadata-based or id-based — goes through here.
 *
 * Never throws and never writes.
 */
async function loadBoundBusiness(
  dbc: DbClient,
  event: Stripe.Event,
  businessId: string,
): Promise<SubscriptionTenant["business"] | null> {
  const business = await dbc.business.findUnique({
    where: { id: businessId },
    select: BUSINESS_SELECT,
  });

  if (!business?.stripeAccountId) {
    Sentry.captureMessage(
      `[Subscription webhook] Business ${businessId} not found or has no connected Stripe account`,
      {
        level: "error",
        tags: {
          service: "stripe",
          "subscription.step": "business-not-found",
          businessId,
        },
      },
    );
    return null;
  }

  if (event.account !== business.stripeAccountId) {
    Sentry.captureMessage(
      `[Subscription webhook] businessId/account mismatch: business ${businessId} does not own connected account ${event.account ?? "(none)"}`,
      {
        level: "warning",
        tags: {
          service: "stripe",
          "subscription.step": "account-mismatch",
          businessId,
        },
      },
    );
    return null;
  }

  return { ...business, stripeAccountId: business.stripeAccountId };
}

/**
 * Resolve the `{ business, subscription }` pair an event's metadata refers to,
 * or `null`. The subscription row is loaded scoped to the bound business, so a
 * valid id belonging to a *different* tenant resolves to nothing.
 *
 * Never throws and never writes.
 */
export async function resolveSubscriptionTenant(
  dbc: DbClient,
  event: Stripe.Event,
  ref: SubscriptionRef,
): Promise<SubscriptionTenant | null> {
  const business = await loadBoundBusiness(dbc, event, ref.businessId);
  if (!business) return null;

  const subscription = await dbc.subscription.findFirst({
    where: { id: ref.subscriptionId, businessId: business.id },
  });

  if (!subscription) {
    Sentry.captureMessage(
      `[Subscription webhook] Subscription row ${ref.subscriptionId} not found for business ${ref.businessId} (event ${event.type})`,
      {
        level: "error",
        tags: {
          service: "stripe",
          "subscription.step": "row-not-found",
          businessId: ref.businessId,
        },
      },
    );
    return null;
  }

  return { business, subscription };
}

/**
 * The Stripe id an event object carries that can stand in for metadata: the
 * subscription's own id (subscription + invoice events) or the Checkout
 * Session id (session events, whose row has no `stripeSubscriptionId` yet).
 * Both columns are `@unique` on `Subscription`.
 */
type TenantFallback =
  | { kind: "stripeSubscriptionId"; id: string }
  | { kind: "stripeCheckoutSessionId"; id: string };

/**
 * Resolve the tenant from the object's own Stripe id, or `null`. Same binding
 * rule as the metadata path — the id only tells us WHICH row; the row's
 * business still has to own the connected account the event came from.
 */
async function resolveSubscriptionTenantByFallback(
  dbc: DbClient,
  event: Stripe.Event,
  fallback: TenantFallback,
): Promise<SubscriptionTenant | null> {
  const subscription = await dbc.subscription.findUnique({
    where:
      fallback.kind === "stripeSubscriptionId"
        ? { stripeSubscriptionId: fallback.id }
        : { stripeCheckoutSessionId: fallback.id },
  });
  if (!subscription) return null;

  const business = await loadBoundBusiness(dbc, event, subscription.businessId);
  if (!business) return null;

  return { business, subscription };
}

/**
 * Resolve the tenant for an event: metadata first (the designed path), then
 * the Stripe id on the object itself.
 *
 * Metadata is the intended carrier, but it is the one thing we read off the
 * raw event payload (see the module comment), and a subscription whose
 * metadata reaches us unparseable must not silently lose its lifecycle events
 * — a pause, a dunning failure, Stripe giving up and cancelling. The fallback
 * makes the handler total for every row SimplePress created; the report says
 * exactly which keys were unusable so the cause can be found, not guessed.
 */
async function resolveTenantForEvent(
  dbc: DbClient,
  event: Stripe.Event,
  params: {
    objectId: string;
    metadata: Stripe.Metadata | null | undefined;
    fallback: TenantFallback | null;
  },
): Promise<SubscriptionTenant | null> {
  const parsed = parseSubscriptionMetadata(params.metadata);
  if (parsed) return resolveSubscriptionTenant(dbc, event, parsed);

  const tenant = params.fallback
    ? await resolveSubscriptionTenantByFallback(dbc, event, params.fallback)
    : null;

  reportUnusableMetadata(event, {
    objectId: params.objectId,
    metadata: params.metadata,
    expectedKeys: SUBSCRIPTION_METADATA_KEYS,
    fallback: params.fallback,
    recovered: tenant !== null,
  });
  return tenant;
}

/**
 * Copy a Stripe subscription's authoritative state onto our row: ids, derived
 * status, billing period, pause window, `lastSyncedAt`.
 *
 * Idempotent and self-correcting — every field is written from the Stripe
 * object rather than patched relative to what we had, so a stale local row
 * (including a stale `pauseResumesAt` from a lifted pause) converges in one
 * call. The webhook and the cron reconciler share it for exactly that reason.
 */
export async function applyStripeSubscriptionState(
  dbc: DbClient,
  subscription: Pick<Subscription, "id">,
  stripeSub: Stripe.Subscription,
): Promise<Subscription> {
  return dbc.subscription.update({
    where: { id: subscription.id },
    data: stripeSubscriptionStateData(stripeSub),
  });
}

/**
 * The row fields `applyStripeSubscriptionState` writes, as data. Pure, so a
 * caller that needs to write them conditionally (`handleSubscriptionUpdated`'s
 * compare-and-set) shares one definition with the unconditional path.
 */
export function stripeSubscriptionStateData(stripeSub: Stripe.Subscription) {
  const period = periodFromStripe(stripeSub);
  const stripeCustomerId = idOf(stripeSub.customer);

  return {
    stripeSubscriptionId: stripeSub.id,
    ...(stripeCustomerId ? { stripeCustomerId } : {}),
    status: deriveSubscriptionStatus(stripeSub),
    currentPeriodStart: period.currentPeriodStart,
    currentPeriodEnd: period.currentPeriodEnd,
    nextBillingAt: period.nextBillingAt,
    pauseResumesAt: period.pauseResumesAt,
    lastSyncedAt: new Date(),
  };
}

/**
 * Mirror the Stripe Customer id onto the local `Customer` row — the billing
 * portal deep link ("update my card") needs it, and it is only known once
 * Stripe has created the subscription. Non-fatal: this is a convenience for a
 * later action, never a precondition for billing.
 */
async function persistCustomerStripeId(
  dbc: DbClient,
  subscription: Subscription,
): Promise<void> {
  if (!subscription.customerId || !subscription.stripeCustomerId) return;
  try {
    await dbc.customer.updateMany({
      where: {
        id: subscription.customerId,
        businessId: subscription.businessId,
      },
      data: { stripeCustomerId: subscription.stripeCustomerId },
    });
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag("service", "stripe");
      scope.setTag("subscription.step", "persist-stripe-customer");
      scope.setTag("businessId", subscription.businessId);
      Sentry.captureException(error);
    });
  }
}

/**
 * Apply Stripe state and, if this call is what moved the row out of
 * `incomplete`, send the one-time "welcome" pair.
 *
 * Stripe does not guarantee that `checkout.session.completed` arrives before
 * the first `invoice.paid`, so BOTH handlers route through here and the emails
 * are owed to whichever one observes the transition — the loser reloads a row
 * that is no longer `incomplete` and stays quiet. That, not an idempotency key,
 * is what makes the ordering race safe; the key is only a second line of
 * defence against a redelivered event.
 */
async function applyStateAndAnnounce(
  dbc: DbClient,
  params: {
    business: SubscriptionTenant["business"];
    subscription: Subscription;
    stripeSub: Stripe.Subscription;
  },
): Promise<Subscription> {
  const wasIncomplete = params.subscription.status === "incomplete";
  const updated = await applyStripeSubscriptionState(
    dbc,
    params.subscription,
    params.stripeSub,
  );

  await persistCustomerStripeId(dbc, updated);

  if (wasIncomplete && updated.status !== "incomplete") {
    try {
      await sendSubscriptionStartedEmails({
        business: params.business,
        subscription: updated,
      });
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag("service", "stripe");
        scope.setTag("subscription.step", "started-email");
        scope.setTag("businessId", params.business.id);
        Sentry.captureException(error);
      });
    }
  }

  return updated;
}

/**
 * A subscription Checkout Session carries only three metadata keys
 * (`businessId`, `subscriptionId`, `kind`) — it is not the full
 * `subscriptionMetadataSchema` payload that rides on the Subscription itself.
 */
function readSessionRef(
  session: Stripe.Checkout.Session,
): SubscriptionRef | null {
  const businessId = session.metadata?.businessId?.trim();
  const subscriptionId = session.metadata?.subscriptionId?.trim();
  if (!businessId || !subscriptionId) return null;
  return { businessId, subscriptionId };
}

/**
 * Session-event twin of `resolveTenantForEvent`: session metadata carries only
 * `businessId`/`subscriptionId`, and the row is found by
 * `stripeCheckoutSessionId` when that is unusable (the subscription id is not
 * on the row until `checkout.session.completed` itself writes it).
 */
async function resolveSessionTenant(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<SubscriptionTenant | null> {
  const ref = readSessionRef(session);
  if (ref) return resolveSubscriptionTenant(db, event, ref);

  const fallback: TenantFallback = {
    kind: "stripeCheckoutSessionId",
    id: session.id,
  };
  const tenant = await resolveSubscriptionTenantByFallback(db, event, fallback);
  reportUnusableMetadata(event, {
    objectId: session.id,
    metadata: session.metadata,
    expectedKeys: SESSION_METADATA_KEYS,
    fallback,
    recovered: tenant !== null,
  });
  return tenant;
}

const SUBSCRIPTION_METADATA_KEYS = Object.keys(
  subscriptionMetadataSchema.shape,
);
/**
 * The keys the schema refuses to do without — derived by asking it, so an
 * optional/defaulted key (`variantId`, which Stripe never stores when empty)
 * is never reported as "missing".
 */
const REQUIRED_SUBSCRIPTION_METADATA_KEYS = new Set(
  subscriptionMetadataSchema
    .safeParse({})
    .error?.issues.map((issue) => String(issue.path[0])) ?? [],
);
const SESSION_METADATA_KEYS = ["businessId", "subscriptionId"];

/**
 * Report metadata we could not use. Never the values — only which of the
 * expected keys were present, which zod refinement rejected them, and the
 * event's own envelope (`api_version` is the webhook ENDPOINT's pinned version,
 * the one that renders `event.data.object`).
 *
 * Two outcomes, two Sentry steps:
 *  - `metadata-unparseable` (warning): the id fallback found the row and the
 *    event was processed — a diagnostic, not a loss.
 *  - `metadata-missing` (warning): nothing bound the event to a row. Either it
 *    isn't ours (a dashboard-made or `stripe trigger` subscription) or a row
 *    of ours has lost its Stripe id.
 */
function reportUnusableMetadata(
  event: Stripe.Event,
  params: {
    objectId: string;
    metadata: Stripe.Metadata | null | undefined;
    expectedKeys: readonly string[];
    fallback: TenantFallback | null;
    recovered: boolean;
  },
): void {
  const raw = params.metadata ?? {};
  const rawKeys = Object.keys(raw);
  const present = params.expectedKeys.filter((key) => key in raw);
  const missing = params.expectedKeys.filter(
    (key) =>
      !(key in raw) &&
      (params.expectedKeys !== SUBSCRIPTION_METADATA_KEYS ||
        REQUIRED_SUBSCRIPTION_METADATA_KEYS.has(key)),
  );
  const issues =
    params.expectedKeys === SUBSCRIPTION_METADATA_KEYS
      ? (subscriptionMetadataSchema
          .safeParse(raw)
          .error?.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`,
          ) ?? [])
      : [];

  const step = params.recovered ? "metadata-unparseable" : "metadata-missing";
  const suffix = params.recovered
    ? `; resolved via ${params.fallback?.kind ?? "?"}`
    : "";

  Sentry.captureMessage(
    `[Subscription webhook] ${event.type} for ${params.objectId} carried no usable SimplePress metadata${suffix}`,
    {
      level: "warning",
      tags: {
        service: "stripe",
        "subscription.step": step,
        "subscription.fallback": params.fallback?.kind ?? "none",
      },
      extra: {
        eventId: event.id,
        apiVersion: event.api_version,
        account: event.account ?? null,
        livemode: event.livemode,
        metadataWasNull: params.metadata == null,
        metadataKeysPresent: present,
        metadataKeysMissing: missing,
        unexpectedKeyCount: rawKeys.length - present.length,
        issues,
        fallbackId: params.fallback?.id ?? null,
        recovered: params.recovered,
      },
    },
  );
}

/**
 * `checkout.session.completed` (subscription mode) — the customer finished
 * Checkout and Stripe created the subscription.
 *
 * Deliberately creates **no Order**: the first delivery's order comes from the
 * first `invoice.paid`, so there is exactly one code path that turns money into
 * an order and exactly one idempotency key protecting it.
 */
export async function handleSubscriptionCheckoutCompleted(
  event: Stripe.Event,
): Promise<NextResponse> {
  return respond(event, "checkout-completed", async (ctx) => {
    const session = event.data.object as Stripe.Checkout.Session;

    const tenant = await resolveSessionTenant(event, session);
    if (!tenant) return;
    ctx.businessId = tenant.business.id;

    const stripeSubscriptionId = idOf(session.subscription);
    if (!stripeSubscriptionId) {
      Sentry.captureMessage(
        `[Subscription webhook] Completed session ${session.id} has no subscription attached`,
        {
          level: "warning",
          tags: {
            service: "stripe",
            "subscription.step": "session-without-subscription",
            businessId: tenant.business.id,
          },
        },
      );
      return;
    }

    // Read the subscription from the connected account rather than trusting the
    // session: the session's `customer` can differ from the subscription's, the
    // billing period only exists on the subscription, and the retrieved copy is
    // SDK-shaped whatever version the endpoint is pinned to.
    const stripeSub = await retrieveConnectedSubscription(
      tenant.business.stripeAccountId,
      stripeSubscriptionId,
    );

    await applyStateAndAnnounce(db, {
      business: tenant.business,
      subscription: tenant.subscription,
      stripeSub,
    });
  });
}

/**
 * `checkout.session.expired` (subscription mode) — the shopper walked away.
 *
 * Deletes the placeholder row so an abandoned signup doesn't sit in the admin
 * list forever, but only while it is still `incomplete` with no Stripe
 * subscription attached: once Stripe has bound a subscription to it, the row is
 * a live billing record no matter what the session says.
 *
 * Never sends the abandoned-checkout recovery email, even for a store that has
 * opted into it — that email is written for a cart, and re-entering a
 * subscription signup is a different flow.
 */
export async function handleSubscriptionCheckoutExpired(
  event: Stripe.Event,
): Promise<NextResponse> {
  return respond(event, "checkout-expired", async (ctx) => {
    const session = event.data.object as Stripe.Checkout.Session;

    const tenant = await resolveSessionTenant(event, session);
    if (!tenant) return;
    ctx.businessId = tenant.business.id;

    const { subscription } = tenant;
    if (
      subscription.status === "incomplete" &&
      !subscription.stripeSubscriptionId
    ) {
      await db.subscription.delete({ where: { id: subscription.id } });
    }
  });
}

/**
 * `invoice.paid` — the money event. Creates the delivery's Order.
 *
 * Order of operations matters:
 *  1. **Re-retrieve the invoice through the pinned SDK before reading a single
 *     field off it**, with `expand: ["payments"]`. Two problems, one call:
 *     the event copy is shaped by the *endpoint's* API version, so on a
 *     pre-`basil` endpoint every clover-shaped accessor below reads as empty
 *     and this handler would return silently while the store takes money (see
 *     the module doc comment); and the event copy never carries `payments`,
 *     without which the order is recorded with no PaymentIntent — which is what
 *     refunds are issued against.
 *  2. Ignore anything that isn't a subscription invoice (a one-off invoice on
 *     the connected account is none of our business) — a breadcrumb, not a
 *     capture.
 *  3. Resolve the tenant. This now happens *after* one Stripe read rather than
 *     before, so a spoofed event costs a single retrieve against the account
 *     that sent it; it still binds no business and writes nothing.
 *  4. Bail if an Order already exists for this invoice — Stripe redelivers, and
 *     the cron reconciler replays.
 *  5. Refresh subscription state (this also covers the paid-before-completed
 *     ordering race, where the row is still `incomplete`), then create the
 *     order.
 */
export async function handleInvoicePaid(
  event: Stripe.Event,
): Promise<NextResponse> {
  return respond(event, "invoice-paid", async (ctx) => {
    const rawInvoice = event.data.object as Stripe.Invoice;

    const invoice = await retrieveInvoiceForEvent(event, rawInvoice, {
      expand: ["payments"],
    });
    if (!isSubscriptionInvoice(invoice)) {
      breadcrumbNonSubscriptionInvoice(event, invoice);
      return;
    }

    const invoiceSubscriptionId = getInvoiceSubscriptionId(invoice);
    const tenant = await resolveTenantForEvent(db, event, {
      objectId: invoice.id,
      metadata: getInvoiceMetadata(invoice),
      fallback: invoiceSubscriptionId
        ? { kind: "stripeSubscriptionId", id: invoiceSubscriptionId }
        : null,
    });
    if (!tenant) return;
    ctx.businessId = tenant.business.id;

    const { business } = tenant;
    let subscription = tenant.subscription;

    const alreadyOrdered = await db.order.findUnique({
      where: { stripeInvoiceId: invoice.id },
      select: { id: true },
    });
    if (alreadyOrdered) return;

    // Non-fatal: if Stripe is unreachable for the subscription read we still
    // owe the customer their order, and `sync.ts` will reconcile the row later.
    try {
      const stripeSubscriptionId =
        getInvoiceSubscriptionId(invoice) ?? subscription.stripeSubscriptionId;

      if (stripeSubscriptionId) {
        const stripeSub = await retrieveConnectedSubscription(
          business.stripeAccountId,
          stripeSubscriptionId,
        );
        subscription = await applyStateAndAnnounce(db, {
          business,
          subscription,
          stripeSub,
        });
      }
    } catch (refreshError) {
      Sentry.withScope((scope) => {
        scope.setTag("service", "stripe");
        scope.setTag("subscription.step", "refresh-on-invoice-paid");
        scope.setTag("businessId", business.id);
        Sentry.captureException(refreshError);
      });
    }

    await processPaidInvoice(db, {
      business,
      subscription,
      invoice,
      paymentIntentId: getInvoicePaymentIntentId(invoice),
    });

    // A paid invoice clears a dunning state. It never *demotes* a status Stripe
    // just gave us (a cancelled subscription's final invoice must not resurrect
    // the row), so "active" is only forced from the two states a payment
    // actually recovers from.
    const recovered =
      subscription.status === "past_due" ||
      subscription.status === "incomplete";

    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        lastInvoiceId: invoice.id,
        lastPaymentFailedAt: null,
        ...(recovered ? { status: "active" } : {}),
      },
    });
  });
}

/**
 * `invoice.payment_failed` — the card was declined. Marks the row `past_due`
 * and tells the customer to update their payment method. Stripe keeps its own
 * dunning schedule; every retry raises `attempt_count` and earns its own email.
 *
 * Retrieves the invoice first for the same reason `handleInvoicePaid` does —
 * the event copy's shape depends on the endpoint's API version, and reading the
 * clover accessors off a pre-`basil` payload silently drops the dunning notice
 * (see the module doc comment). No `expand` here: nothing but
 * `attempt_count` and the metadata snapshot is needed, and no order is created.
 */
export async function handleInvoicePaymentFailed(
  event: Stripe.Event,
): Promise<NextResponse> {
  return respond(event, "invoice-payment-failed", async (ctx) => {
    const rawInvoice = event.data.object as Stripe.Invoice;

    const invoice = await retrieveInvoiceForEvent(event, rawInvoice);
    if (!isSubscriptionInvoice(invoice)) {
      breadcrumbNonSubscriptionInvoice(event, invoice);
      return;
    }

    const invoiceSubscriptionId = getInvoiceSubscriptionId(invoice);
    const tenant = await resolveTenantForEvent(db, event, {
      objectId: invoice.id,
      metadata: getInvoiceMetadata(invoice),
      fallback: invoiceSubscriptionId
        ? { kind: "stripeSubscriptionId", id: invoiceSubscriptionId }
        : null,
    });
    if (!tenant) return;
    ctx.businessId = tenant.business.id;

    const subscription = await db.subscription.update({
      where: { id: tenant.subscription.id },
      data: { status: "past_due", lastPaymentFailedAt: new Date() },
    });

    try {
      await sendSubscriptionPaymentFailedEmail({
        business: tenant.business,
        subscription,
        invoiceId: invoice.id,
        attemptCount: invoice.attempt_count,
      });
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag("service", "stripe");
        scope.setTag("subscription.step", "payment-failed-email");
        scope.setTag("businessId", tenant.business.id);
        Sentry.captureException(error);
      });
    }
  });
}

/**
 * `customer.subscription.updated` — the catch-all state sync.
 *
 * The row is always reconciled; an email only goes out on a pause/resume
 * transition, which is the only kind the customer did not just perform in our
 * own UI (and even then the transition is what the customer asked for, so
 * confirming it is welcome). `past_due → active` is deliberately silent:
 * `invoice.paid` owns the recovery story, and duplicating it here would send
 * two emails for one event.
 *
 * Metadata is read off the raw payload (a flat string map is the same on every
 * API version), but the object handed to `applyStripeSubscriptionState` is
 * re-retrieved through the SDK: `periodFromStripe` reads
 * `items.data[0].current_period_start/_end`, which only live there from
 * `2025-03-31.basil` onwards — a pre-`basil` payload would write `Invalid Date`
 * into the row (see the module doc comment).
 */
export async function handleSubscriptionUpdated(
  event: Stripe.Event,
): Promise<NextResponse> {
  return respond(event, "subscription-updated", async (ctx) => {
    const rawSub = event.data.object as Stripe.Subscription;

    const tenant = await resolveTenantForEvent(db, event, {
      objectId: rawSub.id,
      metadata: rawSub.metadata,
      fallback: { kind: "stripeSubscriptionId", id: rawSub.id },
    });
    if (!tenant) return;
    ctx.businessId = tenant.business.id;

    const stripeSub = await retrieveConnectedSubscription(
      tenant.business.stripeAccountId,
      rawSub.id,
    );

    // Compare-and-set on the status we read: the write only lands if nobody
    // moved the row between our read and now. When it does not land, the
    // pause/resume action that made this Stripe change wrote first (and
    // emailed), or this is a redelivery — either way, converge the fields and
    // send nothing. This, not the idempotency key, is what keeps a pause to
    // exactly one email whichever side wins the race.
    const previousStatus = tenant.subscription.status;
    const { count } = await db.subscription.updateMany({
      where: { id: tenant.subscription.id, status: previousStatus },
      data: stripeSubscriptionStateData(stripeSub),
    });
    if (count === 0) {
      await applyStripeSubscriptionState(db, tenant.subscription, stripeSub);
      return;
    }
    const subscription = await db.subscription.findUniqueOrThrow({
      where: { id: tenant.subscription.id },
    });

    if (subscription.status === previousStatus) return;

    let variant: "paused" | "resumed" | null = null;
    if (subscription.status === "paused") {
      variant = "paused";
    } else if (
      previousStatus === "paused" &&
      subscription.status === "active"
    ) {
      variant = "resumed";
    }
    if (!variant) return;

    try {
      await sendSubscriptionUpdatedEmail({
        business: tenant.business,
        subscription,
        variant,
        // Stripe redelivers an event under the SAME id, so a retry of this
        // exact observation dedupes at Resend while a later, real transition
        // (a new event) never collides with it.
        transitionKey: event.id,
      });
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag("service", "stripe");
        scope.setTag("subscription.step", "updated-email");
        scope.setTag("businessId", tenant.business.id);
        Sentry.captureException(error);
      });
    }
  });
}

/**
 * `customer.subscription.deleted` — billing has ended, from whatever direction
 * (customer cancel, owner cancel, Stripe giving up after dunning).
 *
 * `cancelReason` is only stamped `"stripe"` when SimplePress hasn't already
 * recorded who did it: our own cancel actions write `"customer"`/`"owner"`
 * before calling Stripe, and this event must not overwrite that attribution.
 * An already-cancelled row is left completely alone so a redelivered event
 * can't re-date the cancellation or re-send the goodbye email — and that check
 * runs before the Stripe read, so a redelivery costs nothing.
 *
 * Like `handleSubscriptionUpdated`, metadata comes off the raw payload and
 * `canceled_at` comes off an SDK re-retrieve (a cancelled subscription stays
 * retrievable indefinitely). Reading a timestamp that a pre-`basil` endpoint
 * happens to render identically would be luck, not a contract.
 */
export async function handleSubscriptionDeleted(
  event: Stripe.Event,
): Promise<NextResponse> {
  return respond(event, "subscription-deleted", async (ctx) => {
    const rawSub = event.data.object as Stripe.Subscription;

    const tenant = await resolveTenantForEvent(db, event, {
      objectId: rawSub.id,
      metadata: rawSub.metadata,
      fallback: { kind: "stripeSubscriptionId", id: rawSub.id },
    });
    if (!tenant) return;
    ctx.businessId = tenant.business.id;

    if (tenant.subscription.status === "cancelled") return;

    const stripeSub = await retrieveConnectedSubscription(
      tenant.business.stripeAccountId,
      rawSub.id,
    );

    const cancelledAt =
      tenant.subscription.cancelledAt ??
      (stripeSub.canceled_at
        ? new Date(stripeSub.canceled_at * 1000)
        : new Date());

    const subscription = await db.subscription.update({
      where: { id: tenant.subscription.id },
      data: {
        status: "cancelled",
        cancelledAt,
        cancelReason: tenant.subscription.cancelReason ?? "stripe",
        nextBillingAt: null,
        pauseResumesAt: null,
        lastSyncedAt: new Date(),
      },
    });

    try {
      await sendSubscriptionCancelledEmails({
        business: tenant.business,
        subscription,
        cancelledAt,
      });
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag("service", "stripe");
        scope.setTag("subscription.step", "cancelled-email");
        scope.setTag("businessId", tenant.business.id);
        Sentry.captureException(error);
      });
    }
  });
}

/**
 * `invoice.voided` — expected and harmless: a skipped delivery or a pause is
 * implemented as `pause_collection: { behavior: "void" }`, so Stripe still
 * generates the invoice and immediately voids it. No money moved, so there is
 * no order, no status change and no email. A breadcrumb only, so the void shows
 * up as context if something *else* on this subscription is reported later.
 */
export function handleInvoiceVoided(
  event: Stripe.Event,
): Promise<NextResponse> {
  const invoice = event.data.object as Stripe.Invoice;
  Sentry.addBreadcrumb({
    category: "stripe.subscription",
    level: "info",
    message: `invoice.voided ${invoice.id} (skipped or paused delivery)`,
  });
  return Promise.resolve(received());
}
