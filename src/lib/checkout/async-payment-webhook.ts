import type Stripe from "stripe";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import type { AbandonedCheckoutItem } from "~/emails/abandoned-checkout";
import type { ReservationEntry } from "~/lib/inventory/reservation";
import type { TxClient } from "~/server/db";
import { listCheckoutSessionEmailItems } from "~/lib/checkout/session-email-items";
import { sessionShopperEmail } from "~/lib/checkout/session-shopper-email";
import { getBusinessAlertRecipients } from "~/lib/email/alert-recipients";
import {
  sendOrderPaymentFailed,
  sendOrderPaymentFailedOwnerAlert,
  sendOrderPaymentProcessing,
} from "~/lib/email/templates";
import {
  ASYNC_PAYMENT_HOLD_MS,
  releaseReservation,
} from "~/lib/inventory/reservation";
import { db } from "~/server/db";

/**
 * Delayed ("async") payment methods on the CART lane of the Stripe Connect
 * webhook — ACH "US bank account" debit, bank transfers, vouchers.
 *
 * Such a checkout completes before the money moves:
 *
 *  1. `checkout.session.completed` with `payment_status: "unpaid"` →
 *     {@link handleCheckoutAwaitingPayment}: no Order, no Customer row — the
 *     stock hold is stretched to {@link ASYNC_PAYMENT_HOLD_MS} and the shopper
 *     is told their payment is processing.
 *  2. Days later, one of:
 *     - `checkout.session.async_payment_succeeded` (session now "paid") — the
 *       route runs the ordinary completed-session order path for it (order,
 *       metrics, loyalty, discount usage, inventory deduction, reservation
 *       consumed, confirmation + owner emails). Nothing in this module.
 *     - `checkout.session.async_payment_failed` →
 *       {@link handleCartAsyncPaymentFailed}: the hold is released and the
 *       shopper + owner/managers are told.
 *
 * Design decision: there is no "awaiting payment" Order. An Order exists only
 * once money clears, so nothing downstream (fulfillment, reports, metrics,
 * loyalty) has to learn a new pending state.
 *
 * Subscription and donation sessions never reach this module — the route acks
 * their async events as no-ops (see there).
 *
 * Tenant rule, same as the rest of the webhook: `metadata.businessId` and
 * `metadata.reservationId` are attacker-controllable by any connected
 * merchant, so a business is only bound to an event when it owns the
 * connected account the event came from, and reservation lookups are scoped
 * to that business.
 */

/** The business fields both handlers read (a subset of the route's select). */
export type AsyncPaymentBusiness = {
  id: string;
  name: string;
  ownerEmail: string;
  subdomain: string;
  customDomain: string | null;
  domainStatus: string | null;
  siteContent: { logoUrl: string | null } | null;
};

function received(): NextResponse {
  return NextResponse.json({ received: true });
}

/**
 * The session's reservation in the given status (default ACTIVE), found the
 * same tenant-safe way the completed-session path finds the one it consumes:
 * by `stripeSessionId`, or by `metadata.reservationId` as a fallback — both
 * scoped to the bound business. When `step` is given, a
 * `metadata.reservationId` that belongs to another business is left untouched
 * and logged as a warning under that step.
 */
async function findSessionReservation(
  client: TxClient,
  params: {
    businessId: string;
    session: Stripe.Checkout.Session;
    status?: "active" | "released";
    step?: string;
  },
) {
  const { businessId, session } = params;
  const reservationId = session.metadata?.reservationId;
  const reservation = await client.inventoryReservation.findFirst({
    where: {
      businessId,
      OR: [
        { stripeSessionId: session.id },
        ...(reservationId ? [{ id: reservationId }] : []),
      ],
      status: params.status ?? "active",
    },
  });
  if (params.step && reservationId && reservation?.id !== reservationId) {
    const other = await client.inventoryReservation.findUnique({
      where: { id: reservationId },
      select: { businessId: true },
    });
    if (other && other.businessId !== businessId) {
      Sentry.captureMessage(
        `[Webhook] metadata.reservationId ${reservationId} belongs to business ${other.businessId}, not ${businessId}; reservation left untouched`,
        {
          level: "warning",
          tags: { "webhook.step": params.step, businessId },
        },
      );
    }
  }
  return reservation;
}

/** Line items for the email, or undefined (email goes out without them). */
async function emailItemsOrUndefined(params: {
  session: Stripe.Checkout.Session;
  stripeAccountId: string;
  business: AsyncPaymentBusiness;
  step: string;
}): Promise<AbandonedCheckoutItem[] | undefined> {
  try {
    return await listCheckoutSessionEmailItems({
      sessionId: params.session.id,
      stripeAccount: params.stripeAccountId,
      logoUrl: params.business.siteContent?.logoUrl,
    });
  } catch (lineItemsErr) {
    Sentry.captureException(lineItemsErr, {
      tags: { "webhook.step": params.step, businessId: params.business.id },
    });
    return undefined;
  }
}

function emailBusiness(business: AsyncPaymentBusiness) {
  return {
    name: business.name,
    ownerEmail: business.ownerEmail,
    siteContent: business.siteContent,
    subdomain: business.subdomain,
    customDomain: business.customDomain,
    domainStatus: business.domainStatus,
  };
}

/**
 * `checkout.session.completed` with `payment_status: "unpaid"` on the cart
 * lane. The route calls this AFTER its idempotency guard (no Order yet for the
 * session — if `async_payment_succeeded` was processed first, the guard
 * already returned and no "processing" email goes out) and AFTER binding the
 * business to the event's connected account, but BEFORE any customer,
 * address or order write: none of those exist until the money clears.
 *
 * Answers 500 when the hold extension throws, BEFORE any email, so Stripe
 * retries and the hold is not left to lapse at its ~30-minute checkout window
 * (the processing email only goes out after the hold step succeeds, so a
 * retry needs no dedupe beyond the email's Resend idempotency key). Email
 * failures stay non-fatal.
 *
 * If the session's reservation was already RELEASED, the payment is treated
 * as already failed (`async_payment_failed` was processed first — out-of-order
 * delivery, or this event is a retry landing after the failure): ack, no
 * extension, no email. Caveat: the stale sweeper also marks a lapsed hold
 * "released", so a completed event retried past the 30-minute window looks
 * the same and skips the email too — harmless, the outcome event still
 * produces the order (and its confirmation) or the failure email. Residual
 * edge: a cart with NO reservation (no tracked stock) has no state to tell a
 * failed payment apart, so a completed event arriving after the failure
 * still sends the processing email — fixing that needs a schema change.
 */
export async function handleCheckoutAwaitingPayment(params: {
  session: Stripe.Checkout.Session;
  business: AsyncPaymentBusiness;
  stripeAccountId: string;
}): Promise<NextResponse> {
  const { session, business, stripeAccountId } = params;

  // Keep the stock held while the bank payment settles. The reservation was
  // created at checkout with `expiresAt` aligned to the ~30-minute session
  // window, so without this the stale sweeper would hand the stock to another
  // shopper long before the money arrives. Status stays "active"; only ever
  // pushes the expiry later (a replayed event never shortens the hold).
  let alreadyFailed = false;
  try {
    const reservation = await findSessionReservation(db, {
      businessId: business.id,
      session,
      step: "async-payment-hold-business-mismatch",
    });
    if (reservation) {
      const holdUntil = new Date(Date.now() + ASYNC_PAYMENT_HOLD_MS);
      const extended = await db.inventoryReservation.updateMany({
        where: {
          id: reservation.id,
          status: "active",
          expiresAt: { lt: holdUntil },
        },
        data: { expiresAt: holdUntil },
      });
      if (extended.count === 0) {
        // Either a replay (already extended) or the hold was settled between
        // the read and the update (a concurrent failure released it).
        const current = await db.inventoryReservation.findUnique({
          where: { id: reservation.id },
          select: { status: true },
        });
        alreadyFailed = current?.status === "released";
      }
    } else {
      alreadyFailed = !!(await findSessionReservation(db, {
        businessId: business.id,
        session,
        status: "released",
      }));
    }
  } catch (holdErr) {
    Sentry.withScope((scope) => {
      scope.setTag("webhook.step", "async-payment-hold-extend");
      scope.setTag("businessId", business.id);
      Sentry.captureException(holdErr);
    });
    return NextResponse.json(
      { error: "Could not extend the stock hold" },
      { status: 500 },
    );
  }

  if (alreadyFailed) {
    Sentry.captureMessage(
      `[Webhook] checkout.session.completed (unpaid) for session ${session.id} after its reservation was released; treated as already failed, no processing email`,
      {
        level: "info",
        tags: {
          "webhook.step": "async-payment-completed-after-release",
          businessId: business.id,
        },
      },
    );
    return received();
  }

  // Tell the shopper their payment is processing — the real order
  // confirmation follows once it clears. Keyed on the session so a
  // redelivered event is deduped by Resend.
  const shopperEmail = sessionShopperEmail(session);
  if (shopperEmail) {
    try {
      const items = await emailItemsOrUndefined({
        session,
        stripeAccountId,
        business,
        step: "async-payment-processing-line-items",
      });
      await sendOrderPaymentProcessing({
        to: shopperEmail,
        customerName: session.customer_details?.name ?? undefined,
        business: emailBusiness(business),
        items,
        amountTotal: session.amount_total ?? 0,
        idempotencyKey: `order-payment-processing-${session.id}`,
      });
    } catch (emailErr) {
      Sentry.withScope((scope) => {
        scope.setTag("webhook.step", "async-payment-processing-email");
        scope.setTag("businessId", business.id);
        Sentry.captureException(emailErr);
      });
    }
  }

  return received();
}

/**
 * `checkout.session.async_payment_failed` on the cart lane (the route has
 * already acked subscription and donation sessions). The bank payment did not
 * complete: release the stock hold, tell the shopper, alert the owner and
 * managers. No Order exists for such a session — there is nothing to cancel.
 *
 * Idempotent against duplicate deliveries: the release flips the reservation
 * `active → released` with a conditional update inside the transaction, so a
 * second (even concurrent) delivery finds nothing to release and reservedQty
 * is never decremented twice. The emails carry session-keyed idempotency keys.
 *
 * Answers 200 for every rejected/no-op case; an unexpected error before the
 * emails answers 500 so Stripe retries (safe — see above).
 */
export async function handleCartAsyncPaymentFailed(
  event: Stripe.Event,
): Promise<NextResponse> {
  const session = event.data.object as Stripe.Checkout.Session;
  const businessId = session.metadata?.businessId;

  try {
    if (!businessId) {
      Sentry.captureMessage(
        `[Webhook] Missing businessId in async-payment-failed session metadata: ${session.id}`,
        {
          level: "warning",
          tags: { "webhook.step": "async-payment-failed-metadata-check" },
        },
      );
      return received();
    }

    const business = await db.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        ownerEmail: true,
        subdomain: true,
        customDomain: true,
        domainStatus: true,
        stripeAccountId: true,
        siteContent: { select: { logoUrl: true } },
      },
    });

    // Bind the business to the account that actually processed the payment —
    // see the completed-session path. A mismatch touches nothing: no release
    // (another tenant's hold), no emails (another tenant's customers/owner).
    const stripeAccountId = event.account;
    if (
      !business?.stripeAccountId ||
      !stripeAccountId ||
      business.stripeAccountId !== stripeAccountId
    ) {
      Sentry.captureMessage(
        `[Webhook] businessId/account mismatch on async-payment-failed session: metadata business ${businessId} does not own connected account ${stripeAccountId ?? "(none)"}`,
        {
          level: "error",
          tags: {
            "webhook.step": "async-payment-failed-account-mismatch",
            businessId,
          },
        },
      );
      return received();
    }

    // An Order only exists once money clears, so one here means Stripe told
    // us the payment both succeeded and failed. Leave the order (and the stock
    // it already deducted) alone and flag it for a human — and don't email
    // the shopper that their order was cancelled when it wasn't.
    const existingOrder = await db.order.findUnique({
      where: { stripeSessionId: session.id },
      select: { id: true, orderNumber: true },
    });
    if (existingOrder) {
      Sentry.captureMessage(
        `[Webhook] async_payment_failed for session ${session.id} but order #${existingOrder.orderNumber} (${existingOrder.id}) exists; order left untouched`,
        {
          level: "warning",
          tags: {
            "webhook.step": "async-payment-failed-order-exists",
            businessId,
          },
        },
      );
      return received();
    }

    // Release the stock hold. The conditional `active → released` flip is the
    // idempotency gate: only the delivery that wins it decrements reservedQty.
    await db.$transaction(async (tx) => {
      const reservation = await findSessionReservation(tx, {
        businessId,
        session,
        step: "async-payment-failed-business-mismatch",
      });
      if (!reservation) return;
      const flipped = await tx.inventoryReservation.updateMany({
        where: { id: reservation.id, status: "active" },
        data: { status: "released" },
      });
      if (flipped.count === 0) return;
      // The payment failed: stock AND any held discount use go back.
      await releaseReservation(
        tx,
        { items: reservation.items as ReservationEntry[] },
        { mode: "release" },
      );
    });

    const items = await emailItemsOrUndefined({
      session,
      stripeAccountId,
      business,
      step: "async-payment-failed-line-items",
    });
    const amountTotal = session.amount_total ?? 0;
    const customerName = session.customer_details?.name ?? undefined;
    const shopperEmail = sessionShopperEmail(session);

    if (shopperEmail) {
      try {
        await sendOrderPaymentFailed({
          to: shopperEmail,
          customerName,
          business: emailBusiness(business),
          items,
          amountTotal,
          idempotencyKey: `order-payment-failed-${session.id}`,
        });
      } catch (emailErr) {
        Sentry.withScope((scope) => {
          scope.setTag("webhook.step", "async-payment-failed-email");
          scope.setTag("businessId", businessId);
          Sentry.captureException(emailErr);
        });
      }
    }

    // Owner plus OWNER/MANAGER members, one email each so addresses aren't
    // exposed to one another, and one failure can't stop the rest. Keyed per
    // recipient address (stable even if membership order changes). The alert
    // replies to the shopper; Stripe Checkout always collects an email, but if
    // one is somehow missing the owner's own address stands in so the
    // reply-to stays valid and the alert still goes out.
    const recipients = await getBusinessAlertRecipients(
      db,
      businessId,
      business.ownerEmail,
    );
    for (const to of recipients) {
      try {
        await sendOrderPaymentFailedOwnerAlert({
          to,
          customerName,
          customerEmail: shopperEmail ?? business.ownerEmail,
          stripeSessionId: session.id,
          business: emailBusiness(business),
          items,
          amountTotal,
          idempotencyKey: `order-payment-failed-owner-${session.id}-${to.toLowerCase()}`,
        });
      } catch (emailErr) {
        Sentry.withScope((scope) => {
          scope.setTag("webhook.step", "async-payment-failed-owner-email");
          scope.setTag("businessId", businessId);
          Sentry.captureException(emailErr);
        });
      }
    }

    return received();
  } catch (err: unknown) {
    Sentry.withScope((scope) => {
      scope.setTag("webhook.step", "async-payment-failed");
      if (businessId) scope.setTag("businessId", businessId);
      Sentry.captureException(err);
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
