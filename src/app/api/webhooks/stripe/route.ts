// app/api/webhooks/stripe/route.ts
import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";

import type { AbandonedCheckoutItem } from "~/emails/abandoned-checkout";
import type { PoolDeductionResult } from "~/lib/inventory";
import type { ReservationEntry } from "~/lib/inventory/reservation";
import type { OrderEarnResult } from "~/lib/loyalty/order-hooks";
import type { TxClient } from "~/server/db";
import { findOrCreateShippingAddress } from "~/lib/address-utils";
import { resolvePickupLocation } from "~/lib/address/pickup";
import { getBusinessUrl } from "~/lib/business-url";
import {
  handleCartAsyncPaymentFailed,
  handleCheckoutAwaitingPayment,
} from "~/lib/checkout/async-payment-webhook";
import {
  createOrderFromCheckout,
  hasConfiguredLines,
  loadCheckoutLineConfigs,
} from "~/lib/checkout/create-order";
import { SUPERSEDED_METADATA_KEY } from "~/lib/checkout/discount-holds";
import { listAllSessionLineItems } from "~/lib/checkout/list-session-line-items";
import { listCheckoutSessionEmailItems } from "~/lib/checkout/session-email-items";
import { sessionShopperEmail } from "~/lib/checkout/session-shopper-email";
import { resolveCheckoutShipping } from "~/lib/checkout/shipping";
import { splitCustomerName } from "~/lib/customer-name";
import { expandOrderItemsForInventory } from "~/lib/customizer/inventory";
import { handleDonationCheckoutCompleted } from "~/lib/donations/webhook";
import { getBusinessAlertRecipients } from "~/lib/email/alert-recipients";
import {
  sendAbandonedCheckoutEmail,
  sendBackorderAlert,
  sendDisputeAlert,
  sendLowInventoryAlert,
  sendNewOrderNotification,
  sendOrderConfirmation,
  sendOrderRefunded,
  sendOutOfStockAlert,
  sendPaymentsDisabledAlert,
  sendPoolLowInventoryAlert,
  sendPoolOutOfStockAlert,
} from "~/lib/email/templates";
import { deductPoolInventory } from "~/lib/inventory";
import { releaseReservation } from "~/lib/inventory/reservation";
import { PLATFORM_TERMS_VERSION } from "~/lib/legal/policy-versions";
import { awardPointsForPaidOrder } from "~/lib/loyalty/order-hooks";
import { stripeClient } from "~/lib/stripe/client";
import {
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleInvoiceVoided,
  handleSubscriptionCheckoutCompleted,
  handleSubscriptionCheckoutExpired,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "~/lib/subscriptions/webhook";
import { db } from "~/server/db";

type NotificationCandidate = {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  newQty: number;
  previousQty: number;
  allowBackorders: boolean;
  lowInventoryThreshold: number | null;
};

/**
 * Settles the checkout session's active stock/discount hold once its order
 * exists: the conditional `active → consumed` flip, then reservedQty drops and
 * the discount use counted at checkout start becomes final. Returns the
 * discount code ids it consumed (empty if no active reservation / flip lost).
 *
 * Must run inside a db.$transaction.
 */
async function consumeCheckoutReservation(
  tx: TxClient,
  {
    businessId,
    session,
  }: { businessId: string; session: Stripe.Checkout.Session },
): Promise<Set<string>> {
  const consumed = new Set<string>();
  // Look up by stripeSessionId first, fall back to metadata.reservationId.
  // metadata.reservationId is attacker-controllable by any connected merchant
  // (they can set arbitrary metadata on their own checkout sessions), so the
  // lookup is scoped to the verified business — otherwise a merchant could
  // consume another tenant's active stock hold. A reservationId that belongs
  // to a different business is left untouched and logged as a warning.
  const reservationId = session.metadata?.reservationId;
  const reservation = await tx.inventoryReservation.findFirst({
    where: {
      businessId,
      OR: [
        { stripeSessionId: session.id },
        ...(reservationId ? [{ id: reservationId }] : []),
      ],
      status: "active",
    },
  });
  if (reservationId && reservation?.id !== reservationId) {
    const other = await tx.inventoryReservation.findUnique({
      where: { id: reservationId },
      select: { businessId: true },
    });
    if (other && other.businessId !== businessId) {
      Sentry.captureMessage(
        `[Webhook] metadata.reservationId ${reservationId} belongs to business ${other.businessId}, not ${businessId}; reservation left untouched`,
        {
          level: "warning",
          tags: {
            "webhook.step": "reservation-release-business-mismatch",
            businessId,
          },
        },
      );
    }
  }
  if (reservation) {
    // Conditional `active → consumed` flip first: if the stale
    // sweeper or an expired/failed event released the hold
    // between the read above and here, it already decremented
    // reservedQty — releasing again would double-decrement.
    const flipped = await tx.inventoryReservation.updateMany({
      where: { id: reservation.id, status: "active" },
      data: { status: "consumed" },
    });
    if (flipped.count === 1) {
      const entries = reservation.items as ReservationEntry[];
      // "consume": drop reservedQty (the real deduction happened
      // above) but keep the discount use counted at checkout
      // start — the order makes it final.
      await releaseReservation(tx, { items: entries }, { mode: "consume" });
      for (const entry of entries) {
        if (entry.discountCodeId) consumed.add(entry.discountCodeId);
      }
    }
  }
  return consumed;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    let event: Stripe.Event;

    try {
      event = stripeClient.webhooks.constructEvent(
        body,
        signature,
        webhookSecret,
      );
    } catch (err: unknown) {
      Sentry.captureException(err, {
        tags: { "webhook.step": "signature-verification" },
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle checkout.session.completed — and its delayed-payment twin,
    // checkout.session.async_payment_succeeded.
    //
    // A delayed payment method (ACH bank debit, bank transfer, voucher)
    // completes the session as "unpaid" and settles days later: the completed
    // event only stretches the stock hold and tells the shopper (see
    // `handleCheckoutAwaitingPayment` below), and `async_payment_succeeded`
    // (session now "paid") runs this exact cart-order path to create the
    // order. Both are keyed on the same `stripeSessionId`, so the idempotency
    // guard + P2002 catch below cover duplicate deliveries of either event.
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;

      // Subscription sessions are a parallel lane, not a branch inside this one:
      // they create no order here (`invoice.paid` does, once per paid invoice) and
      // hold no inventory reservation, and the one-time idempotency guard keyed on
      // `stripeSessionId` must never see them. For the same reason a delayed
      // first payment settling on a subscription is a no-op here — its
      // `invoice.paid` is what creates the order.
      if (session.mode === "subscription") {
        if (event.type === "checkout.session.async_payment_succeeded")
          return NextResponse.json({ received: true });
        return handleSubscriptionCheckoutCompleted(event);
      }

      // Donations are a third parallel lane. Same `mode: "payment"` as a cart
      // checkout, so the discriminator is metadata rather than mode — and the
      // guard must sit ABOVE the `metadata.businessId` read below, because a
      // donation session carries that key too but has no cart, no line items to
      // turn into an Order and no reservation to settle. Donations are
      // card-only (delayed methods are out of scope; the donation handler
      // ignores an unpaid session), so an async outcome event is acked as a
      // no-op.
      if (session.metadata?.kind === "donation") {
        if (event.type === "checkout.session.async_payment_succeeded")
          return NextResponse.json({ received: true });
        return handleDonationCheckoutCompleted(event);
      }

      try {
        // Get business ID from metadata
        const businessId = session.metadata?.businessId;
        const discountCodeId = session.metadata?.discountCodeId;

        if (!businessId) {
          Sentry.captureMessage(
            `[Webhook] Missing businessId in checkout session metadata: ${session.id}`,
            { level: "warning", tags: { "webhook.step": "metadata-check" } },
          );
          return NextResponse.json({ received: true });
        }

        // Idempotency guard — Stripe may retry the same event
        const existingOrder = await db.order.findUnique({
          where: { stripeSessionId: session.id },
          select: { id: true },
        });
        if (existingOrder) {
          return NextResponse.json({ received: true });
        }

        // 🔑 Get business with Stripe account
        const business = await db.business.findUnique({
          where: { id: businessId },
          select: {
            id: true,
            stripeAccountId: true,
            subdomain: true,
            customDomain: true,
            domainStatus: true,
            name: true,
            ownerEmail: true,
            pickupLocation: true,
            pickupInstructions: true,
            businessAddress: true,
            addressStreet: true,
            addressCity: true,
            addressState: true,
            addressPostalCode: true,
            siteContent: {
              select: {
                logoUrl: true,
              },
            },
          },
        });

        if (!business?.stripeAccountId) {
          Sentry.captureMessage(
            `[Webhook] Business ${businessId} not found or missing Stripe account`,
            {
              level: "error",
              tags: {
                "webhook.step": "business-lookup",
                businessId,
              },
            },
          );
          return NextResponse.json({ received: true });
        }

        const stripeAccountId = event.account;

        if (!stripeAccountId) {
          throw new Error("Missing Stripe connected account on event");
        }

        // 🔑 Bind the order to the account that actually processed the payment.
        // metadata.businessId is attacker-controllable by any connected merchant
        // (they can set arbitrary metadata on their own checkout sessions), so a
        // merchant could otherwise inject orders / decrement inventory in another
        // tenant's store. Reject when the metadata business isn't the one that
        // owns the connected account this event came from.
        if (business.stripeAccountId !== stripeAccountId) {
          Sentry.captureMessage(
            `[Webhook] businessId/account mismatch: metadata business ${businessId} does not own connected account ${stripeAccountId}`,
            {
              level: "error",
              tags: {
                "webhook.step": "account-mismatch",
                businessId,
              },
            },
          );
          return NextResponse.json({ received: true });
        }

        // Delayed payment method: checkout completed but the money hasn't
        // moved yet. No order, no customer row, no address — nothing is
        // written until `async_payment_succeeded` arrives (it carries "paid"
        // and runs this path in full). Here we only keep the stock held and
        // tell the shopper their payment is processing. Sits after the
        // idempotency guard on purpose: if the success was processed first
        // (out-of-order delivery), the guard already returned and no
        // "processing" email goes out. Scoped to the completed event — an
        // `async_payment_succeeded` that still says "unpaid" would be a Stripe
        // contract break and falls through to create-order's own gate.
        if (
          event.type === "checkout.session.completed" &&
          session.payment_status === "unpaid"
        ) {
          return handleCheckoutAwaitingPayment({
            session,
            business,
            stripeAccountId,
          });
        }

        // 🔑 Retrieve full session using business's Stripe account
        const retrievedSession = await stripeClient.checkout.sessions.retrieve(
          session.id,
          {
            expand: ["total_details", "payment_intent"],
          },
          {
            stripeAccount: stripeAccountId,
          },
        );

        // An expanded `line_items` carries only the first page (10 items), so
        // the full list is paged in separately and set on the session that
        // create-order reads. A listing failure throws here (500 → Stripe
        // retries) before anything is written — never a partial order.
        const allLineItems = await listAllSessionLineItems({
          sessionId: session.id,
          stripeAccount: stripeAccountId,
        });
        const fullSession: Stripe.Checkout.Session = {
          ...retrievedSession,
          line_items: {
            object: "list",
            data: allLineItems,
            has_more: false,
            url: `/v1/checkout/sessions/${session.id}/line_items`,
          },
        };

        // Calculate discount amount
        const discountAmount = fullSession.total_details?.amount_discount ?? 0;

        // Get or create customer
        let customer = null;
        const customerEmail =
          sessionShopperEmail(session) ?? "unknown@example.com";

        if (customerEmail === "unknown@example.com") {
          Sentry.withScope((scope) => {
            scope.setTag("webhook.step", "customer-email-missing");
            scope.setTag("businessId", businessId);
            scope.setExtra("stripeSessionId", session.id);
            Sentry.captureMessage(
              "Stripe checkout session completed with no customer email — order created without customer record or confirmation email",
              "warning",
            );
          });
        }

        if (customerEmail !== "unknown@example.com") {
          // Parse customer name from Stripe (use 'name' field, not 'individual_name')
          // BOTH names land as NULL rather than "" or a placeholder when Stripe
          // sent nothing — `lastName` for a mononym ("Cher"), `firstName` for a
          // checkout that carried no name at all. See splitCustomerName: the
          // admin customer list sorts names `nulls: "last"`, so a real null
          // sinks a nameless customer to the end of the list, while the old
          // "Guest" fallback sorted as an ordinary G-name and — worse — read as
          // if the shopper were actually called Guest. The admin table already
          // falls back to the email address for display.
          //
          // The shipping-address block below deliberately does NOT use this
          // helper: those columns are non-nullable and get printed on a label,
          // so "" is the correct empty there.
          const parsedName = splitCustomerName(
            fullSession.customer_details?.name,
          );
          const firstName = parsedName.firstName;
          const lastName = parsedName.lastName;

          // Check if there's a user with this email in the business
          const existingUser = await db.user.findFirst({
            where: {
              email: customerEmail,
              emailVerified: true,
            },
            select: { id: true },
          });

          customer = await db.customer.upsert({
            where: {
              businessId_email: {
                email: customerEmail,
                businessId: business.id,
              },
            },
            create: {
              email: customerEmail,
              firstName,
              lastName,
              phone: fullSession.customer_details?.phone ?? null,
              businessId: business.id,
              userId: existingUser?.id ?? null, // Link to user if exists
            },
            update: {
              // firstName, lastName, phone intentionally not updated on repeat orders.
              // A customer may purchase on behalf of someone else and provide the
              // recipient's name/phone at Stripe checkout while using their own email.
              // Overwriting those fields would corrupt the primary customer record.
              // Only the userId link is kept current.
              userId: existingUser?.id ?? undefined,
            },
          });
        }

        // Create or reuse shipping address if provided (see resolveCheckoutShipping)
        let shippingAddressId: string | null = null;

        const resolved = resolveCheckoutShipping(fullSession);

        if (resolved.addressLine1 && customer) {
          const customerName = resolved.nameForAddress ?? "";
          const nameParts = customerName.split(" ").filter((p) => p.length > 0);
          const firstName = nameParts[0] ?? "Guest";
          const lastName = nameParts.slice(1).join(" ") || "";

          shippingAddressId = await findOrCreateShippingAddress({
            customerId: customer.id,
            firstName,
            lastName,
            address1: resolved.addressLine1,
            address2: resolved.addressLine2,
            city: resolved.city,
            province: resolved.province,
            zip: resolved.zip,
            country: resolved.country,
            phone: resolved.phone,
          });
        }

        const rawMetaDiscountId =
          typeof discountCodeId === "string" ? discountCodeId.trim() : "";
        let verifiedDiscountCodeId: string | null = null;
        if (rawMetaDiscountId.length > 0) {
          const dc = await db.discountCode.findFirst({
            where: {
              id: rawMetaDiscountId,
              businessId: business.id,
            },
            select: { id: true },
          });
          verifiedDiscountCodeId = dc?.id ?? null;
        }

        const deliveryMethod =
          session.metadata?.deliveryMethod === "pickup" ? "pickup" : "ship";

        // Terms are agreed when the shopper starts checkout, which for a
        // delayed (bank) payment is days before this order is written. So
        // acceptance is dated from `session.created` — set by Stripe, unlike
        // session metadata, which the merchant can edit. (Falls back to now
        // only if Stripe ever omitted it.)
        const checkoutStartedAt =
          typeof session.created === "number"
            ? new Date(session.created * 1000)
            : new Date();

        // Merchant-terms acceptance is agreed at checkout (see the Order
        // model docblock) — `merchantTermsUpdatedAt` snapshots the
        // terms-of-service Page's `updatedAt` so we can later tell which
        // wording was actually in force. Only a page last edited at or before
        // checkout start is the wording the shopper saw; one edited since
        // (possible during a days-long bank payment) means we no longer know
        // which version they agreed to, so null ("unknown") is recorded rather
        // than the wrong version. Isolated in its own try/catch, same
        // convention as the other non-critical steps in this handler (e.g.
        // customer-metrics below): a lookup failure must never block order
        // creation, it just means this order records no `merchantTermsUpdatedAt`.
        let merchantTermsUpdatedAt: Date | null = null;
        try {
          const merchantTermsPage = await db.page.findUnique({
            where: {
              businessId_slug: {
                businessId: business.id,
                slug: "terms-of-service",
              },
              published: true,
            },
            select: { updatedAt: true },
          });
          const pageUpdatedAt = merchantTermsPage?.updatedAt ?? null;
          merchantTermsUpdatedAt =
            pageUpdatedAt &&
            pageUpdatedAt.getTime() <= checkoutStartedAt.getTime()
              ? pageUpdatedAt
              : null;
        } catch (termsLookupError) {
          Sentry.withScope((scope) => {
            scope.setTag("webhook.step", "merchant-terms-lookup");
            scope.setTag("businessId", businessId);
            Sentry.captureException(termsLookupError);
          });
        }

        // Product customizer builds stored at checkout
        // (`InventoryReservation.lineConfigs`), only when a line carries one.
        // No status filter inside: a delayed payment whose hold was already
        // swept still gets its builds. A lookup failure is NOT swallowed:
        // nothing irreversible has happened yet (the customer/address writes
        // above are idempotent), so the 500 makes Stripe retry rather than
        // writing an order whose builds are degraded to summaries for good.
        const lineConfigs = hasConfiguredLines(fullSession)
          ? await loadCheckoutLineConfigs(db, {
              businessId: business.id,
              session,
            })
          : undefined;

        const order = await createOrderFromCheckout(db, {
          business,
          customer,
          shippingAddressId,
          customerEmail,
          session,
          fullSession,
          verifiedDiscountCodeId,
          discountAmount,
          deliveryMethod,
          termsAcceptedAt: checkoutStartedAt,
          // The platform terms version in force NOW. A platform terms bump
          // between checkout start and settlement isn't distinguishable here.
          termsVersion: PLATFORM_TERMS_VERSION,
          merchantTermsUpdatedAt,
          lineConfigs,
        });

        // orderNumber is used by the inventory-deduction block below for log
        // notes and InventoryHistory records.
        const orderNumber = order.orderNumber;

        // Update customer metrics.
        //
        // The post-increment `orderCount` is read back into
        // `customerOrderCountAfter` because the loyalty earn step below needs
        // it to decide whether this is the customer's first order. It stays
        // null when this update failed (or there is no customer row), and the
        // hook falls back to the pre-increment value it already holds.
        let customerOrderCountAfter: number | null = null;
        if (customer) {
          try {
            const metricsUpdate = await db.customer.update({
              where: { id: customer.id },
              data: {
                totalSpent: { increment: order.total },
                orderCount: { increment: 1 },
              },
              select: { orderCount: true },
            });
            customerOrderCountAfter = metricsUpdate.orderCount;
          } catch (customerError) {
            Sentry.withScope((scope) => {
              scope.setTag("webhook.step", "customer-metrics");
              scope.setTag("businessId", businessId);
              Sentry.captureException(customerError);
            });
          }
        }

        // Loyalty points (flag- and program-gated inside the helper). Non-fatal,
        // same convention as customer-metrics above: a points failure must never
        // block order creation, inventory deduction or the emails below. The
        // helper is idempotent on its ledger `sourceKey`, so a replayed webhook
        // that somehow got past the guard above awards nothing twice.
        let loyaltyEarn: OrderEarnResult | null = null;
        if (customer) {
          try {
            loyaltyEarn = await awardPointsForPaidOrder(db, {
              businessId: business.id,
              order: {
                id: order.id,
                subtotal: order.subtotal,
                discount: order.discount,
              },
              customer: {
                id: customer.id,
                orderCount: customerOrderCountAfter ?? customer.orderCount + 1,
              },
            });
          } catch (loyaltyError) {
            Sentry.withScope((scope) => {
              scope.setTag("webhook.step", "loyalty-award");
              scope.setTag("businessId", businessId);
              Sentry.captureException(loyaltyError);
            });
          }
        }

        // Deduct inventory
        const notificationCandidates: NotificationCandidate[] = [];
        const poolNotificationCandidates: PoolDeductionResult[] = [];
        // Discount codes whose use was claimed at checkout start (a discount
        // entry on the reservation) and made final by the consume step below.
        // Filled only once that step has actually run; cleared if the
        // transaction that ran it fails.
        const consumedDiscountCodeIds = new Set<string>();

        try {
          await db.$transaction(async (tx) => {
            // Group pool-based items by poolId for aggregate deduction
            const poolGroups = new Map<
              string,
              {
                items: { productId: string; quantity: number }[];
                unitsConsumedMap: Record<string, number>;
              }
            >();

            // Configured lines expand into their linked option values
            // (`snapshot.components`), deducted exactly like cart lines; the
            // reservation consumed below drops their holds.
            for (const item of expandOrderItemsForInventory(order.items)) {
              const qty = item.quantity;

              // Handle variant inventory
              if (item.productVariantId) {
                const variant = await tx.productVariant.findUnique({
                  where: { id: item.productVariantId },
                  select: {
                    id: true,
                    name: true,
                    inventoryQty: true,
                    productId: true,
                    product: {
                      select: {
                        businessId: true,
                        trackInventory: true,
                        allowBackorders: true,
                        name: true,
                        lowInventoryThreshold: true,
                      },
                    },
                  },
                });

                if (!variant) {
                  Sentry.captureMessage(
                    `[Webhook] Variant ${item.productVariantId} not found — may have been deleted after checkout`,
                    {
                      level: "warning",
                      tags: {
                        "webhook.step": "inventory-variant-not-found",
                        businessId,
                      },
                    },
                  );
                  continue;
                }

                if (!variant.product.trackInventory) {
                  continue;
                }

                const previousQty = variant.inventoryQty;

                if (variant.product.allowBackorders) {
                  await tx.productVariant.update({
                    where: { id: variant.id },
                    data: { inventoryQty: { decrement: qty } },
                  });
                  const newQty = previousQty - qty;
                  await tx.inventoryHistory.create({
                    data: {
                      variantId: variant.id,
                      productId: variant.productId,
                      businessId: variant.product.businessId,
                      previousQty,
                      newQty,
                      changeQty: -qty,
                      reason: "sale",
                      note: `Order #${orderNumber}`,
                      orderId: order.id,
                    },
                  });
                  notificationCandidates.push({
                    productId: variant.productId,
                    productName: variant.product.name,
                    variantId: variant.id,
                    variantName: variant.name,
                    newQty,
                    previousQty,
                    allowBackorders: variant.product.allowBackorders,
                    lowInventoryThreshold:
                      variant.product.lowInventoryThreshold,
                  });
                } else {
                  const result = await tx.productVariant.updateMany({
                    where: {
                      id: variant.id,
                      inventoryQty: { gte: qty },
                    },
                    data: { inventoryQty: { decrement: qty } },
                  });

                  if (result.count === 0) {
                    Sentry.captureMessage(
                      `[Webhook] Oversell for variant ${variant.id} on order ${orderNumber}`,
                      {
                        level: "warning",
                        tags: {
                          "webhook.step": "inventory-oversell",
                          businessId,
                        },
                      },
                    );
                    await tx.inventoryHistory.create({
                      data: {
                        variantId: variant.id,
                        productId: variant.productId,
                        businessId: variant.product.businessId,
                        previousQty,
                        newQty: previousQty,
                        changeQty: 0,
                        reason: "oversell",
                        note: `Order #${orderNumber}: insufficient stock at fulfillment; inventory unchanged`,
                        orderId: order.id,
                      },
                    });
                    continue;
                  }

                  const newQty = previousQty - qty;
                  await tx.inventoryHistory.create({
                    data: {
                      variantId: variant.id,
                      productId: variant.productId,
                      businessId: variant.product.businessId,
                      previousQty,
                      newQty,
                      changeQty: -qty,
                      reason: "sale",
                      note: `Order #${orderNumber}`,
                      orderId: order.id,
                    },
                  });
                  notificationCandidates.push({
                    productId: variant.productId,
                    productName: variant.product.name,
                    variantId: variant.id,
                    variantName: variant.name,
                    newQty,
                    previousQty,
                    allowBackorders: variant.product.allowBackorders,
                    lowInventoryThreshold:
                      variant.product.lowInventoryThreshold,
                  });
                }
              }
              // Handle product inventory (no variant)
              else if (item.productId) {
                const product = await tx.product.findUnique({
                  where: { id: item.productId },
                  select: {
                    id: true,
                    name: true,
                    inventoryQty: true,
                    businessId: true,
                    trackInventory: true,
                    allowBackorders: true,
                    lowInventoryThreshold: true,
                    baseInventoryUnitId: true,
                    baseUnitsConsumed: true,
                  },
                });

                if (!product) {
                  Sentry.captureMessage(
                    `[Webhook] Product ${item.productId} not found — may have been deleted after checkout`,
                    {
                      level: "warning",
                      tags: {
                        "webhook.step": "inventory-product-not-found",
                        businessId,
                      },
                    },
                  );
                  continue;
                }

                // Pool-based product — accumulate for aggregate deduction
                if (product.baseInventoryUnitId) {
                  const poolId = product.baseInventoryUnitId;
                  if (!poolGroups.has(poolId)) {
                    poolGroups.set(poolId, { items: [], unitsConsumedMap: {} });
                  }
                  const group = poolGroups.get(poolId)!;
                  group.items.push({ productId: product.id, quantity: qty });
                  group.unitsConsumedMap[product.id] =
                    product.baseUnitsConsumed ?? 1;
                  continue;
                }

                // Only deduct if tracking inventory
                if (!product.trackInventory) {
                  continue;
                }

                const previousQty = product.inventoryQty;

                if (product.allowBackorders) {
                  await tx.product.update({
                    where: { id: product.id },
                    data: { inventoryQty: { decrement: qty } },
                  });
                  const newQty = previousQty - qty;
                  await tx.inventoryHistory.create({
                    data: {
                      productId: product.id,
                      businessId: product.businessId,
                      previousQty,
                      newQty,
                      changeQty: -qty,
                      reason: "sale",
                      note: `Order #${orderNumber}`,
                      orderId: order.id,
                      variantId: null,
                    },
                  });
                  notificationCandidates.push({
                    productId: product.id,
                    productName: product.name,
                    newQty,
                    previousQty,
                    allowBackorders: product.allowBackorders,
                    lowInventoryThreshold: product.lowInventoryThreshold,
                  });
                } else {
                  const result = await tx.product.updateMany({
                    where: {
                      id: product.id,
                      inventoryQty: { gte: qty },
                    },
                    data: { inventoryQty: { decrement: qty } },
                  });

                  if (result.count === 0) {
                    Sentry.captureMessage(
                      `[Webhook] Oversell for product ${product.id} on order ${orderNumber}`,
                      {
                        level: "warning",
                        tags: {
                          "webhook.step": "inventory-oversell",
                          businessId,
                        },
                      },
                    );
                    await tx.inventoryHistory.create({
                      data: {
                        productId: product.id,
                        businessId: product.businessId,
                        previousQty,
                        newQty: previousQty,
                        changeQty: 0,
                        reason: "oversell",
                        note: `Order #${orderNumber}: insufficient stock at fulfillment; inventory unchanged`,
                        orderId: order.id,
                        variantId: null,
                      },
                    });
                    continue;
                  }

                  const newQty = previousQty - qty;
                  await tx.inventoryHistory.create({
                    data: {
                      productId: product.id,
                      businessId: product.businessId,
                      previousQty,
                      newQty,
                      changeQty: -qty,
                      reason: "sale",
                      note: `Order #${orderNumber}`,
                      orderId: order.id,
                      variantId: null,
                    },
                  });
                  notificationCandidates.push({
                    productId: product.id,
                    productName: product.name,
                    newQty,
                    previousQty,
                    allowBackorders: product.allowBackorders,
                    lowInventoryThreshold: product.lowInventoryThreshold,
                  });
                }
              }
            }

            // Deduct pool inventory (aggregate per pool)
            for (const [poolId, group] of poolGroups) {
              const result = await deductPoolInventory(tx, {
                poolId,
                items: group.items,
                unitsConsumedMap: group.unitsConsumedMap,
                orderId: order.id,
                orderNumber,
                businessId,
              });
              if (result) poolNotificationCandidates.push(result);
            }

            // Release the inventory reservation now that physical inventory has
            // been deducted. Guard so a missing/already-consumed reservation
            // never breaks order creation.
            try {
              const consumed = await consumeCheckoutReservation(tx, {
                businessId,
                session,
              });
              for (const id of consumed) consumedDiscountCodeIds.add(id);
            } catch (reservationErr) {
              Sentry.withScope((scope) => {
                scope.setTag("webhook.step", "reservation-release-completed");
                scope.setTag("businessId", businessId);
                Sentry.captureException(reservationErr);
              });
              // Non-fatal — inventory deduction and order creation still succeed
            }
          });
        } catch (inventoryError) {
          // Rolled back: the reservation was not consumed with it.
          consumedDiscountCodeIds.clear();
          Sentry.withScope((scope) => {
            scope.setTag("webhook.step", "inventory-deduction");
            scope.setTag("businessId", businessId);
            Sentry.captureException(inventoryError);
          });
          // Don't fail webhook - order is still created
          // The order exists, so the held discount use must become final:
          // left active, the sweeper would release the hold and give the use
          // back. Consuming the reservation on its own also drops reservedQty
          // (what the sweeper would have done, minus giving the use back).
          // Physical stock deduction still failed and is reported above.
          try {
            const consumed = await db.$transaction((tx) =>
              consumeCheckoutReservation(tx, { businessId, session }),
            );
            for (const id of consumed) consumedDiscountCodeIds.add(id);
          } catch (consumeError) {
            // Stays active; the guarded increment below still runs.
            Sentry.withScope((scope) => {
              scope.setTag(
                "webhook.step",
                "reservation-consume-after-rollback",
              );
              scope.setTag("businessId", businessId);
              Sentry.captureException(consumeError);
            });
          }
        }

        // Count the discount code use — unless the reservation consumed above
        // carried this code's use, which create-session already counted at
        // checkout start. Decided from what the consume step did, not from
        // metadata: sessions created before uses were held at checkout, and
        // holds swept/released before a late payment success (the release
        // gave the use back), still increment here.
        // Use updateMany with a WHERE guard so two concurrent webhooks racing
        // on the last available slot can't both increment past usageLimit.
        // The conditional UPDATE is evaluated atomically by the DB.
        if (
          verifiedDiscountCodeId &&
          !consumedDiscountCodeIds.has(verifiedDiscountCodeId)
        ) {
          try {
            const dc = await db.discountCode.findUnique({
              where: { id: verifiedDiscountCodeId },
              select: { usageLimit: true },
            });
            await db.discountCode.updateMany({
              where: {
                id: verifiedDiscountCodeId,
                ...(dc?.usageLimit != null
                  ? { usageCount: { lt: dc.usageLimit } }
                  : {}),
              },
              data: {
                usageCount: { increment: 1 },
              },
            });
          } catch (discountError) {
            Sentry.withScope((scope) => {
              scope.setTag("webhook.step", "discount-increment");
              scope.setTag("businessId", businessId);
              Sentry.captureException(discountError);
            });
          }
        }

        // Send inventory alert notifications
        if (notificationCandidates.length > 0) {
          try {
            const businessUrl = getBusinessUrl(business);
            const alertedProductIds = new Set<string>();
            for (const candidate of notificationCandidates) {
              const {
                productId,
                productName,
                variantName,
                newQty,
                previousQty,
                allowBackorders,
                lowInventoryThreshold,
              } = candidate;

              // One alert per product per order — skip subsequent variants of the same product
              if (alertedProductIds.has(productId)) continue;

              const adminProductUrl = `${businessUrl}/admin/products/${productId}`;

              if (newQty <= 0) {
                // Atomic flag set — count > 0 means we won the race and should send the email
                const flagged = await db.product.updateMany({
                  where: { id: productId, outOfStockAlertSent: false },
                  data: {
                    outOfStockAlertSent: true,
                    lowInventoryAlertSent: true,
                  },
                });
                if (flagged.count > 0) {
                  alertedProductIds.add(productId);
                  if (allowBackorders) {
                    await sendBackorderAlert({
                      productName,
                      variantName,
                      adminProductUrl,
                      business,
                    });
                  } else {
                    await sendOutOfStockAlert({
                      productName,
                      variantName,
                      adminProductUrl,
                      business,
                    });
                  }
                }
              } else if (
                lowInventoryThreshold !== null &&
                newQty <= lowInventoryThreshold &&
                previousQty > lowInventoryThreshold
              ) {
                const flagged = await db.product.updateMany({
                  where: { id: productId, lowInventoryAlertSent: false },
                  data: { lowInventoryAlertSent: true },
                });
                if (flagged.count > 0) {
                  alertedProductIds.add(productId);
                  await sendLowInventoryAlert({
                    productName,
                    variantName,
                    currentQty: newQty,
                    threshold: lowInventoryThreshold,
                    adminProductUrl,
                    business,
                  });
                }
              }
            }
          } catch (notifyError) {
            Sentry.withScope((scope) => {
              scope.setTag("webhook.step", "inventory-notification");
              scope.setTag("businessId", businessId);
              Sentry.captureException(notifyError);
            });
          }
        }

        // Send pool inventory alert notifications
        if (poolNotificationCandidates.length > 0) {
          try {
            const businessUrl = getBusinessUrl(business);
            const alertedPoolIds = new Set<string>();
            for (const candidate of poolNotificationCandidates) {
              if (candidate.wasOversell) continue;
              if (alertedPoolIds.has(candidate.poolId)) continue;

              const adminInventoryUrl = `${businessUrl}/admin/inventory`;

              if (candidate.newQty <= 0) {
                const flagged = await db.baseInventoryUnit.updateMany({
                  where: { id: candidate.poolId, outOfStockAlertSent: false },
                  data: {
                    outOfStockAlertSent: true,
                    lowInventoryAlertSent: true,
                  },
                });
                if (flagged.count > 0) {
                  alertedPoolIds.add(candidate.poolId);
                  await sendPoolOutOfStockAlert({
                    poolName: candidate.poolName,
                    adminUrl: adminInventoryUrl,
                    business,
                  });
                }
              } else if (
                candidate.lowInventoryThreshold !== null &&
                candidate.newQty <= candidate.lowInventoryThreshold &&
                candidate.previousQty > candidate.lowInventoryThreshold
              ) {
                const flagged = await db.baseInventoryUnit.updateMany({
                  where: { id: candidate.poolId, lowInventoryAlertSent: false },
                  data: { lowInventoryAlertSent: true },
                });
                if (flagged.count > 0) {
                  alertedPoolIds.add(candidate.poolId);
                  await sendPoolLowInventoryAlert({
                    poolName: candidate.poolName,
                    currentQty: candidate.newQty,
                    threshold: candidate.lowInventoryThreshold,
                    adminUrl: adminInventoryUrl,
                    business,
                  });
                }
              }
            }
          } catch (poolNotifyError) {
            Sentry.withScope((scope) => {
              scope.setTag("webhook.step", "pool-inventory-notification");
              scope.setTag("businessId", businessId);
              Sentry.captureException(poolNotifyError);
            });
          }
        }

        // Send order confirmation email (skip if customer email is unknown)
        if (customerEmail === "unknown@example.com") {
        } else
          try {
            // Fetch shipping address for email if available
            let shippingAddressForEmail = undefined;
            if (shippingAddressId) {
              const addr = await db.shippingAddress.findUnique({
                where: { id: shippingAddressId },
              });
              if (addr) {
                shippingAddressForEmail = {
                  name: `${addr.firstName} ${addr.lastName}`.trim(),
                  line1: addr.address1,
                  line2: addr.address2 ?? null,
                  city: addr.city,
                  state: addr.province ?? "",
                  postalCode: addr.zip,
                  country: addr.country,
                };
              }
            }

            await sendOrderConfirmation({
              to: order.customerEmail,
              orderNumber: order.orderNumber,
              customerName: order.customerName ?? "Guest",
              items: order.items.map((item) => ({
                productName: item.productName,
                variantName: item.variantName,
                quantity: item.quantity,
                price: item.price,
                total: item.total,
                customization: item.customization,
              })),
              subtotal: order.subtotal,
              shipping: order.shipping,
              tax: order.tax,
              discount: order.discount,
              total: order.total,
              shippingAddress: shippingAddressForEmail,
              deliveryMethod: order.deliveryMethod as "ship" | "pickup",
              ...(order.deliveryMethod === "pickup"
                ? {
                    pickupLocation:
                      resolvePickupLocation(business) ?? undefined,
                    pickupInstructions:
                      business.pickupInstructions ?? undefined,
                  }
                : {}),
              business: {
                name: business.name,
                ownerEmail: business.ownerEmail,
                siteContent: business.siteContent,
                subdomain: business.subdomain,
                customDomain: business.customDomain,
                domainStatus: business.domainStatus,
              },
              // Only when points were actually awarded — `loyalty` absent
              // means the email renders exactly as it did before this feature.
              ...(loyaltyEarn &&
              loyaltyEarn.earned + loyaltyEarn.firstOrderBonus > 0
                ? {
                    loyalty: {
                      earned: loyaltyEarn.earned + loyaltyEarn.firstOrderBonus,
                      balance: loyaltyEarn.balance,
                    },
                  }
                : {}),
              orderId: order.id,
              idempotencyKey: `order-confirmation-${session.id}`,
            });
          } catch (emailError) {
            Sentry.withScope((scope) => {
              scope.setTag("webhook.step", "order-confirmation-email");
              scope.setTag("businessId", businessId);
              Sentry.captureException(emailError);
            });
            // Don't fail the webhook if email fails
          }

        try {
          await sendNewOrderNotification({
            to: business.ownerEmail,
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName ?? "Guest",
            customerEmail: order.customerEmail,
            items: order.items.map((item) => ({
              productName: item.productName,
              variantName: item.variantName,
              quantity: item.quantity,
              total: Math.round(item.total),
              customization: item.customization,
            })),
            subtotal: order.subtotal,
            shipping: order.shipping,
            tax: order.tax,
            discount: order.discount,
            total: order.total,
            deliveryMethod: order.deliveryMethod as "ship" | "pickup",
            business: {
              name: business.name,
              siteContent: business.siteContent,
              subdomain: business.subdomain,
              customDomain: business.customDomain,
              domainStatus: business.domainStatus,
            },
            idempotencyKey: `owner-notification-${session.id}`,
          });
        } catch (ownerEmailError) {
          Sentry.withScope((scope) => {
            scope.setTag("webhook.step", "owner-notification-email");
            scope.setTag("businessId", businessId);
            Sentry.captureException(ownerEmailError);
          });
        }

        return NextResponse.json({ received: true });
      } catch (orderError: unknown) {
        // Two simultaneous deliveries of the same event can race past the idempotency
        // check and both attempt db.order.create. The second will hit the unique
        // constraint on stripeSessionId — return 200 so Stripe doesn't retry.
        if (
          orderError instanceof Prisma.PrismaClientKnownRequestError &&
          orderError.code === "P2002" &&
          (orderError.meta?.target as string[] | undefined)?.some(
            (f) => f === "stripeSessionId" || f === "Order_stripeSessionId_key",
          )
        ) {
          return NextResponse.json({ received: true });
        }

        Sentry.withScope((scope) => {
          scope.setTag("webhook.step", "order-processing");
          scope.setTag("eventType", event.type);
          Sentry.captureException(orderError);
        });
        return NextResponse.json(
          {
            error:
              orderError instanceof Error
                ? orderError.message
                : "Unknown error",
          },
          { status: 500 },
        );
      }
    }

    // Handle checkout.session.expired — release the inventory reservation so
    // held stock is returned to available. Idempotent: no-op if already released.
    // The reservation's business must own the connected account the event came
    // from, otherwise nothing is released.
    if (event.type === "checkout.session.expired") {
      const expiredSession = event.data.object;

      // Parallel lane again: an abandoned subscribe session holds no reservation,
      // and the abandoned-checkout email must never fire for it.
      if (expiredSession.mode === "subscription")
        return handleSubscriptionCheckoutExpired(event);

      // An abandoned donation holds no reservation either, and the
      // abandoned-CART recovery email would be nonsense for one: it tells the
      // visitor their items are waiting and links them to /cart. The lane below
      // is already structurally cart-shaped (it looks for an
      // `InventoryReservation`, so the release is a no-op), but the email is
      // NOT — it only needs `metadata.businessId` and an email address, both of
      // which a donation session has. Cheap insurance, explicitly stated.
      if (expiredSession.metadata?.kind === "donation") {
        return NextResponse.json({ received: true });
      }

      // Like the completed-session path, the reservation's business must own
      // the connected account the event came from. metadata.reservationId is
      // attacker-controllable by any connected merchant (they can set arbitrary
      // metadata on their own checkout sessions), so without this check a
      // merchant could release another tenant's active stock hold.
      try {
        const reservationId = expiredSession.metadata?.reservationId;
        const reservation = await db.inventoryReservation.findFirst({
          where: {
            OR: [
              { stripeSessionId: expiredSession.id },
              ...(reservationId ? [{ id: reservationId }] : []),
            ],
            status: "active",
          },
          include: { business: { select: { stripeAccountId: true } } },
        });
        if (
          reservation &&
          (!event.account ||
            reservation.business.stripeAccountId !== event.account)
        ) {
          Sentry.captureMessage(
            `[Webhook] businessId/account mismatch on expired session: reservation business ${reservation.businessId} does not own connected account ${event.account ?? "(none)"}`,
            {
              level: "error",
              tags: {
                "webhook.step": "reservation-release-account-mismatch",
                businessId: reservation.businessId,
              },
            },
          );
        } else if (reservation) {
          // Conditional `active → released` flip is the gate: only the
          // writer that wins it (this event, the stale sweeper, or a
          // completed/failed event racing it) decrements reservedQty.
          await db.$transaction(async (tx) => {
            const flipped = await tx.inventoryReservation.updateMany({
              where: { id: reservation.id, status: "active" },
              data: { status: "released" },
            });
            if (flipped.count === 0) return;
            // Abandoned checkout: stock AND any held discount use go back.
            await releaseReservation(
              tx,
              { items: reservation.items as ReservationEntry[] },
              { mode: "release" },
            );
          });
        }
      } catch (expiredErr) {
        Sentry.captureException(expiredErr, {
          tags: { "webhook.step": "reservation-release-expired" },
        });
      }

      // Abandoned-checkout recovery email — only when the business has opted
      // in and Stripe captured an email before the session expired. The
      // shopper's cart lives in their browser localStorage, so the email links
      // to /cart, which shows it again on the same device/browser (it may be
      // empty elsewhere, and the copy says so). The expired-session event
      // payload does not include line_items (requires expansion), so the items
      // are fetched with listLineItems on the connected account and shown in
      // the email. If that call fails the email still goes out, generic and
      // without items. Like the completed-session path, the metadata business
      // must own the connected account the event came from (metadata is
      // attacker-controllable by any connected merchant), otherwise no email
      // is sent. Stripe sends checkout.session.expired once per session, so no
      // extra idempotency guard is needed; the Resend idempotency key covers
      // redelivered webhook events. Failures never fail the webhook.
      //
      // Skipped for a session create-session SUPERSEDED (expired because the
      // same browser started a new checkout — the shopper pressed Back and
      // continued to payment again): they are checking out right now, so a
      // "you left something in your cart" email would be wrong. Its hold was
      // released by create-session already; anything still active was
      // released above, gated by the flip as usual.
      try {
        const superseded = !!expiredSession.metadata?.[SUPERSEDED_METADATA_KEY];
        const abandonedBusinessId = expiredSession.metadata?.businessId;
        // Same address precedence as the order path and the bank-payment
        // emails, so every email about one checkout reaches the same inbox.
        const abandonedEmail = sessionShopperEmail(expiredSession);
        if (!superseded && abandonedBusinessId && abandonedEmail) {
          const abandonedBusiness = await db.business.findUnique({
            where: { id: abandonedBusinessId },
            select: {
              name: true,
              ownerEmail: true,
              subdomain: true,
              customDomain: true,
              domainStatus: true,
              stripeAccountId: true,
              sendAbandonedCheckoutEmails: true,
              siteContent: { select: { logoUrl: true } },
            },
          });
          if (abandonedBusiness?.sendAbandonedCheckoutEmails) {
            if (
              !event.account ||
              abandonedBusiness.stripeAccountId !== event.account
            ) {
              Sentry.captureMessage(
                `[Webhook] businessId/account mismatch on expired session: metadata business ${abandonedBusinessId} does not own connected account ${event.account ?? "(none)"}`,
                {
                  level: "error",
                  tags: {
                    "webhook.step": "abandoned-checkout-account-mismatch",
                    businessId: abandonedBusinessId,
                  },
                },
              );
            } else {
              let items: AbandonedCheckoutItem[] | undefined;
              try {
                items = await listCheckoutSessionEmailItems({
                  sessionId: expiredSession.id,
                  stripeAccount: event.account,
                  logoUrl: abandonedBusiness.siteContent?.logoUrl,
                });
              } catch (lineItemsErr) {
                Sentry.captureException(lineItemsErr, {
                  tags: { "webhook.step": "abandoned-checkout-line-items" },
                });
              }
              await sendAbandonedCheckoutEmail({
                to: abandonedEmail,
                customerName:
                  expiredSession.customer_details?.name ?? undefined,
                business: abandonedBusiness,
                items,
                idempotencyKey: `abandoned-checkout-${expiredSession.id}`,
              });
            }
          }
        }
      } catch (abandonedErr) {
        Sentry.captureException(abandonedErr, {
          tags: { "webhook.step": "abandoned-checkout-email" },
        });
      }
      return NextResponse.json({ received: true });
    }

    // Handle checkout.session.async_payment_failed — a delayed payment method
    // (ACH bank debit, bank transfer, voucher) did not complete. No order was
    // ever created for the session (orders exist only once money clears), so
    // the cart lane releases the stock hold and emails the shopper + owner.
    if (event.type === "checkout.session.async_payment_failed") {
      const failedSession = event.data.object;

      // Subscriptions: a failed first payment surfaces through the invoice
      // events (`invoice.payment_failed`) the subscription lane already
      // handles; no cart reservation exists.
      if (failedSession.mode === "subscription")
        return NextResponse.json({ received: true });

      // Donations are card-only — delayed methods are out of scope for the
      // donation lane (`src/lib/donations/webhook.ts` ignores unpaid donation
      // sessions), so there is nothing to undo.
      if (failedSession.metadata?.kind === "donation")
        return NextResponse.json({ received: true });

      return handleCartAsyncPaymentFailed(event);
    }

    // Handle charge.refunded — covers refunds issued from the Stripe Dashboard
    // (or any source outside the admin `order.refund` mutation). Syncs the
    // cumulative refunded amount onto the order. Idempotent: `amount_refunded`
    // is cumulative, so events that don't increase it are no-ops — including
    // the echo Stripe sends for refunds our own mutation created.
    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      try {
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;

        if (paymentIntentId) {
          const order = await db.order.findFirst({
            where: { stripePaymentIntentId: paymentIntentId },
            include: {
              business: {
                select: {
                  name: true,
                  ownerEmail: true,
                  subdomain: true,
                  customDomain: true,
                  domainStatus: true,
                  siteContent: { select: { logoUrl: true } },
                },
              },
            },
          });

          if (order) {
            const alreadyRecorded = order.refundAmountCents ?? 0;
            const cumulativeRefunded = charge.amount_refunded;

            if (cumulativeRefunded > alreadyRecorded) {
              const isFullRefund = cumulativeRefunded >= order.total;

              await db.order.update({
                where: { id: order.id },
                data: {
                  refundAmountCents: cumulativeRefunded,
                  ...(isFullRefund && {
                    status: "refunded",
                    paymentStatus: "refunded",
                  }),
                },
              });

              // The admin mutation tags its refunds with metadata.source and
              // sends its own customer email; only email here for refunds
              // that originated elsewhere (e.g. the Stripe Dashboard).
              const latestRefund = charge.refunds?.data?.[0];
              const fromAdminMutation =
                latestRefund?.metadata?.source === "simplepress";

              if (!fromAdminMutation) {
                try {
                  await sendOrderRefunded({
                    to: order.customerEmail,
                    orderNumber: order.orderNumber,
                    customerName: order.customerName ?? "Guest",
                    refundAmountCents: cumulativeRefunded - alreadyRecorded,
                    orderTotalCents: order.total,
                    isFullRefund,
                    reason: order.refundReason,
                    business: order.business,
                  });
                } catch (emailError) {
                  Sentry.captureException(emailError, {
                    tags: {
                      "webhook.step": "charge-refunded-email",
                      businessId: order.businessId,
                    },
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: { "webhook.step": "charge-refunded" },
        });
      }

      return NextResponse.json({ received: true });
    }

    // Handle disputes (chargebacks). Created: flag the order and alert the
    // owner — response deadlines are strict. Closed: record the outcome.
    if (
      event.type === "charge.dispute.created" ||
      event.type === "charge.dispute.closed"
    ) {
      const dispute = event.data.object;
      try {
        const paymentIntentId =
          typeof dispute.payment_intent === "string"
            ? dispute.payment_intent
            : dispute.payment_intent?.id;

        if (paymentIntentId) {
          const order = await db.order.findFirst({
            where: { stripePaymentIntentId: paymentIntentId },
            include: {
              business: {
                select: {
                  name: true,
                  ownerEmail: true,
                  subdomain: true,
                  siteContent: { select: { logoUrl: true } },
                },
              },
            },
          });

          if (order) {
            const stamp = new Date(event.created * 1000).toISOString();
            const amountFormatted = `$${(dispute.amount / 100).toFixed(2)}`;
            const appendNote = (line: string) =>
              order.internalNote ? `${order.internalNote}\n\n${line}` : line;

            if (event.type === "charge.dispute.created") {
              const evidenceDueBy = dispute.evidence_details?.due_by
                ? new Date(dispute.evidence_details.due_by * 1000)
                : null;

              await db.order.update({
                where: { id: order.id },
                data: {
                  paymentStatus: "disputed",
                  internalNote: appendNote(
                    `[${stamp}] Stripe dispute opened — ${amountFormatted} (${dispute.reason}). Respond in the Stripe Dashboard${evidenceDueBy ? ` by ${evidenceDueBy.toISOString().slice(0, 10)}` : ""}.`,
                  ),
                },
              });

              // Owner plus OWNER/MANAGER members. One email each so addresses
              // aren't exposed to one another, and one failure can't stop the
              // rest (sendEmail never throws; the catch covers render errors).
              const recipients = await getBusinessAlertRecipients(
                db,
                order.businessId,
                order.business.ownerEmail,
              );
              for (const to of recipients) {
                try {
                  await sendDisputeAlert({
                    to,
                    orderNumber: order.orderNumber,
                    disputeAmountCents: dispute.amount,
                    reason: dispute.reason,
                    evidenceDueBy,
                    business: order.business,
                  });
                } catch (emailError) {
                  Sentry.captureException(emailError, {
                    tags: {
                      "webhook.step": "dispute-alert-email",
                      businessId: order.businessId,
                    },
                  });
                }
              }
            } else {
              // charge.dispute.closed — status is won | lost | warning_closed
              if (dispute.status === "won") {
                await db.order.update({
                  where: { id: order.id },
                  data: {
                    ...(order.paymentStatus === "disputed" && {
                      paymentStatus: "paid",
                    }),
                    internalNote: appendNote(
                      `[${stamp}] Stripe dispute won — ${amountFormatted} returned.`,
                    ),
                  },
                });
              } else if (dispute.status === "lost") {
                const alreadyRecorded = order.refundAmountCents ?? 0;
                const newRefunded = Math.max(alreadyRecorded, dispute.amount);
                await db.order.update({
                  where: { id: order.id },
                  data: {
                    paymentStatus: "refunded",
                    ...(newRefunded >= order.total && { status: "refunded" }),
                    refundAmountCents: newRefunded,
                    internalNote: appendNote(
                      `[${stamp}] Stripe dispute lost — ${amountFormatted} withdrawn.`,
                    ),
                  },
                });
              } else {
                await db.order.update({
                  where: { id: order.id },
                  data: {
                    ...(order.paymentStatus === "disputed" && {
                      paymentStatus: "paid",
                    }),
                    internalNote: appendNote(
                      `[${stamp}] Stripe dispute closed (${dispute.status}).`,
                    ),
                  },
                });
              }
            }
          }
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: { "webhook.step": "dispute" },
        });
      }

      return NextResponse.json({ received: true });
    }

    // Handle account.updated (Connect account status changes)
    if (event.type === "account.updated") {
      const account = event.data.object;

      try {
        const business = await db.business.findUnique({
          where: { stripeAccountId: account.id },
          select: {
            id: true,
            subdomain: true,
            // Read BEFORE the update below so the true→false transition can be
            // detected exactly once. Everything from here down is only used by
            // the owner alert; the update itself is unchanged.
            stripeChargesEnabled: true,
            name: true,
            ownerEmail: true,
            customDomain: true,
            domainStatus: true,
            siteContent: { select: { logoUrl: true } },
          },
        });

        if (business) {
          const chargesEnabled = account.charges_enabled ?? false;

          await db.business.update({
            where: { id: business.id },
            data: {
              stripeChargesEnabled: chargesEnabled,
              stripePayoutsEnabled: account.payouts_enabled ?? false,
            },
          });

          // Stripe just restricted a previously-working account (KYC
          // re-verification, document request, dispute threshold). Nothing in
          // checkout reads `stripeChargesEnabled`, so from this moment every
          // checkout on the store fails opaquely — the owner has no other
          // signal. Fire once, on the edge only: a repeat `account.updated`
          // while charges stay disabled reads `prior === false` and is silent,
          // and a Stripe redelivery of this same event sees the value already
          // written to false. Deliberately not fired on the false→true
          // recovery, nor from the Connect callback (onboarding just finished)
          // or disconnect (deliberate owner action) routes.
          if (business.stripeChargesEnabled && !chargesEnabled) {
            // Owner plus OWNER/MANAGER members, one email each. The owner
            // keeps the original key (a redelivery stays deduped); the rest
            // are suffixed with their index so each key is unique.
            const recipients = await getBusinessAlertRecipients(
              db,
              business.id,
              business.ownerEmail,
            );
            for (const [index, to] of recipients.entries()) {
              try {
                await sendPaymentsDisabledAlert({
                  to,
                  business,
                  adminSettingsUrl: `${getBusinessUrl(business)}/admin/settings/integrations`,
                  idempotencyKey:
                    index === 0
                      ? `payments-disabled-${event.id}`
                      : `payments-disabled-${event.id}-${index}`,
                });
              } catch (emailError) {
                Sentry.captureException(emailError, {
                  tags: {
                    "webhook.step": "payments-disabled-email",
                    businessId: business.id,
                  },
                });
              }
            }
          }
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: { "webhook.step": "account-updated" },
        });
      }

      return NextResponse.json({ received: true });
    }

    // Handle account.application.deauthorized (user disconnects)
    if (event.type === "account.application.deauthorized") {
      const account = event.data.object;

      try {
        await db.business.updateMany({
          where: { stripeAccountId: account.id },
          data: { stripeAccountId: null },
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: { "webhook.step": "account-deauthorized" },
        });
      }

      return NextResponse.json({ received: true });
    }

    // Subscription lifecycle — see src/lib/subscriptions/webhook.ts; every
    // handler re-verifies event.account against the tenant.
    if (event.type === "invoice.paid") return handleInvoicePaid(event);

    if (event.type === "invoice.payment_failed")
      return handleInvoicePaymentFailed(event);

    if (event.type === "invoice.voided") return handleInvoiceVoided(event);

    if (event.type === "customer.subscription.updated")
      return handleSubscriptionUpdated(event);

    if (event.type === "customer.subscription.deleted")
      return handleSubscriptionDeleted(event);

    // Unknown event type
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    Sentry.captureException(error, {
      tags: { "webhook.step": "handler" },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
