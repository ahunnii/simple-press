import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";

import { getBusinessUrl } from "~/lib/business-url";
import { resolveDonationLabel } from "~/lib/donations/label";
import { sendOwnerDonationNotification } from "~/lib/email/templates";
import { db } from "~/server/db";

/**
 * The donation branch of the Stripe Connect webhook.
 *
 * Donations are a parallel lane, not a branch inside the one-time payment path:
 * the route (`src/app/api/webhooks/stripe/route.ts`) dispatches here on
 * `session.metadata.kind === "donation"` and nothing in this module touches
 * cart, reservation or order code. There is exactly one event to handle —
 * `checkout.session.completed` — because a donation is a single charge with no
 * lifecycle after it.
 *
 * Contract, shared with `src/lib/subscriptions/webhook.ts`:
 *
 *  - `(event: Stripe.Event) => Promise<NextResponse>`, **always 200
 *    `{ received: true }`**. A handler that throws makes Stripe retry the same
 *    event against a store that will keep failing the same way, for days.
 *    Failures are captured to Sentry and swallowed.
 *  - **Tenant rule** (the security spine, mirroring the one-time path at
 *    route.ts l.150–174): `session.metadata.businessId` is
 *    attacker-controllable — any connected merchant can put another store's id
 *    in the metadata of their own Checkout Session — so a business is only ever
 *    bound to an event when it *owns the connected account the event came
 *    from*. A rejected event writes nothing and still answers 200.
 *
 * Unlike the subscription lane, the `Donation` row is created HERE and only
 * here: the route pre-creates nothing, so there is no placeholder to attach to,
 * reconcile, or clean up. `Donation.stripeSessionId` is `@unique`, which makes
 * this handler idempotent by construction.
 */

const BUSINESS_SELECT = {
  id: true,
  name: true,
  ownerEmail: true,
  subdomain: true,
  customDomain: true,
  domainStatus: true,
  stripeAccountId: true,
  donationLabel: true,
  siteContent: { select: { logoUrl: true } },
} satisfies Prisma.BusinessSelect;

type DonationTenantBusiness = Prisma.BusinessGetPayload<{
  select: typeof BUSINESS_SELECT;
}>;

function received(): NextResponse {
  return NextResponse.json({ received: true });
}

/** Trim a donor-supplied metadata value to `null` unless it has real content. */
function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/** `session.payment_intent` is `string | PaymentIntent | null` depending on expansion. */
function paymentIntentIdOf(
  value: string | Stripe.PaymentIntent | null | undefined,
): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.id;
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
      scope.setTag("webhook.step", `donation-${event.type}`);
      scope.setTag("donation.step", step);
      if (ctx.businessId) scope.setTag("businessId", ctx.businessId);
      scope.setExtra("eventId", event.id);
      Sentry.captureException(error);
    });
  }
  return received();
}

/**
 * Load the business the session's metadata names and bind it to the event, or
 * `null`.
 *
 * The `event.account === business.stripeAccountId` check is the whole security
 * model for this lane. `metadata.businessId` is attacker-controllable by any
 * connected merchant (they can set arbitrary metadata on their own checkout
 * sessions), so without this a merchant could inject donations — and owner
 * notification emails — into another tenant's store. Reject when the metadata
 * business isn't the one that owns the connected account this event came from.
 *
 * Never throws and never writes.
 */
async function loadBoundBusiness(
  event: Stripe.Event,
  businessId: string,
): Promise<DonationTenantBusiness | null> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: BUSINESS_SELECT,
  });

  if (!business?.stripeAccountId) {
    Sentry.captureMessage(
      `[Donation webhook] Business ${businessId} not found or has no connected Stripe account`,
      {
        level: "error",
        tags: {
          service: "stripe",
          "donation.step": "business-not-found",
          businessId,
        },
      },
    );
    return null;
  }

  if (!event.account || business.stripeAccountId !== event.account) {
    Sentry.captureMessage(
      `[Donation webhook] businessId/account mismatch: metadata business ${businessId} does not own connected account ${event.account ?? "(none)"}`,
      {
        level: "error",
        tags: {
          service: "stripe",
          "donation.step": "account-mismatch",
          businessId,
        },
      },
    );
    return null;
  }

  return business;
}

/**
 * `checkout.session.completed` where `metadata.kind === "donation"` — the money
 * event, and the only one this lane has.
 *
 * Order of operations matters:
 *  1. Ignore anything that isn't actually paid. Checkout can complete a session
 *     whose asynchronous payment method has not settled; a `Donation` row means
 *     "money arrived".
 *  2. Bail if a row already exists for this session — Stripe redelivers.
 *  3. Resolve the tenant and bind it to `event.account` (see
 *     `loadBoundBusiness`). Nothing is written before this passes.
 *  4. Create the row. `stripeSessionId` is `@unique`, so a concurrent
 *     redelivery that slipped past step 2 lands on P2002 and is treated as the
 *     same success rather than an error.
 *  5. Email the owner — AFTER the row, and never fatally. The money is already
 *     captured on the connected account, so nothing past step 4 may throw:
 *     same contract `src/lib/subscriptions/emails.ts` documents.
 */
export async function handleDonationCheckoutCompleted(
  event: Stripe.Event,
): Promise<NextResponse> {
  return respond(event, "checkout-completed", async (ctx) => {
    const session = event.data.object as Stripe.Checkout.Session;

    // `unpaid` (a delayed-notification method still settling) and
    // `no_payment_required` (a $0 session, which this lane cannot produce —
    // the amount is floored at $1.00 server-side) are both acked and ignored.
    // If the payment later settles, Stripe sends
    // `checkout.session.async_payment_succeeded`, which this lane deliberately
    // does not handle: donations are card-only in the UI today, so a row for
    // money that never arrives is the worse failure.
    if (session.payment_status !== "paid") return;

    // Cheap idempotency guard, ahead of any DB write and any tenant lookup.
    const existing = await db.donation.findUnique({
      where: { stripeSessionId: session.id },
      select: { id: true },
    });
    if (existing) return;

    const businessId = session.metadata?.businessId?.trim();
    if (!businessId) {
      Sentry.captureMessage(
        `[Donation webhook] Missing businessId in donation session metadata: ${session.id}`,
        {
          level: "warning",
          tags: { service: "stripe", "donation.step": "metadata-check" },
        },
      );
      return;
    }

    const business = await loadBoundBusiness(event, businessId);
    if (!business) return;
    ctx.businessId = business.id;

    // `amount_total` is nullable on the Stripe type. A paid session always has
    // one, so this is a "the world changed" report rather than a real branch —
    // but a row with a null amount is worse than no row at all.
    if (session.amount_total == null) {
      Sentry.captureMessage(
        `[Donation webhook] Paid donation session ${session.id} has no amount_total`,
        {
          level: "error",
          tags: {
            service: "stripe",
            "donation.step": "amount-missing",
            businessId: business.id,
          },
        },
      );
      return;
    }

    // NULL, never "": the builder already omits an absent donor field rather
    // than sending an empty string, and Stripe would strip one anyway — but a
    // whitespace-only value that survived both would otherwise land in the row
    // as "" and read as "the donor left a blank message" in the admin list.
    const donorName = nullIfBlank(session.metadata?.donorName);
    const message = nullIfBlank(session.metadata?.donorMessage);
    // Collected by Stripe Checkout itself — there is no pre-payment form on
    // this lane, so this is the only place a donor email ever comes from.
    const donorEmail = session.customer_details?.email ?? null;

    try {
      await db.donation.create({
        data: {
          businessId: business.id,
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentIdOf(session.payment_intent),
          amountCents: session.amount_total,
          currency: session.currency ?? "usd",
          // All three are `@encrypted` at rest by the Prisma extension; they
          // are written and read back as plain strings here.
          donorName,
          donorEmail,
          message,
        },
      });
    } catch (error) {
      // Belt and braces with the `findUnique` above: two redeliveries in flight
      // at once can both pass that read, and only the unique index separates
      // them. P2002 means the other one won — the donation IS recorded, so this
      // is a success, not a failure, and the loser must not also email.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        Sentry.addBreadcrumb({
          category: "stripe.donation",
          level: "info",
          message: `Donation for session ${session.id} already recorded (concurrent redelivery)`,
        });
        return;
      }
      throw error;
    }

    // Past the point of no return: the money is captured and the row is
    // committed. `sendEmail()` never throws by contract, but the template
    // helper renders a React component, which can — and a render failure must
    // not turn a recorded donation into a 500 that Stripe then retries.
    try {
      await sendOwnerDonationNotification({
        label: resolveDonationLabel(business.donationLabel),
        amountCents: session.amount_total,
        donorName,
        donorEmail,
        message,
        adminUrl: `${getBusinessUrl(business)}/admin/donations`,
        business,
        // Guards a webhook retry that raced the DB check above — Resend
        // remembers the key for 24h, which comfortably outlives Stripe's
        // redelivery window for a single event.
        idempotencyKey: `donation-owner-${session.id}`,
      });
    } catch (emailError) {
      Sentry.withScope((scope) => {
        scope.setTag("service", "stripe");
        scope.setTag("donation.step", "owner-email");
        scope.setTag("businessId", business.id);
        scope.setExtra("stripeSessionId", session.id);
        Sentry.captureException(emailError);
      });
    }
  });
}
