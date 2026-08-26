import type { Subscription } from "generated/prisma";
import type Stripe from "stripe";
import { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";

import type {
  LowStockCandidate,
  OrderDeductionItem,
} from "~/lib/inventory/order-deduction";
import type { PoolDeductionResult } from "~/lib/inventory/pool-deduction";
import type { DbClient } from "~/server/db";
import { findOrCreateShippingAddress } from "~/lib/address-utils";
import { splitCustomerName } from "~/lib/customer-name";
import {
  sendNewOrderNotification,
  sendOrderConfirmation,
} from "~/lib/email/templates";
import {
  deductInventoryForOrderItems,
  sendLowInventoryAlerts,
} from "~/lib/inventory/order-deduction";

import {
  buildAdminSubscriptionUrl,
  buildSubscriptionManageUrl,
  subscriptionIntervalLabel,
} from "./emails";
import { invoiceTaxCents } from "./stripe-invoice";

/**
 * Turning a PAID Stripe subscription invoice into a normal SimplePress
 * `Order` — the reason the owner never has to open the Stripe dashboard.
 *
 * Every paid invoice (the first one and every renewal) produces exactly one
 * Order, so fulfillment, inventory, refunds, disputes and the order emails all
 * reuse the code that already exists for one-time purchases. Subscription
 * orders are distinguished by `stripeInvoiceId` being set and `stripeSessionId`
 * being null.
 *
 * Two hard rules:
 *
 *  1. **No Stripe calls.** The caller has already retrieved the invoice
 *     (expanded far enough to reach the PaymentIntent); everything else comes
 *     off the locked `Subscription` snapshot. A renewal must not depend on a
 *     second network round-trip that can fail after the money moved.
 *  2. **Stripe is the authority on money.** `total` is `invoice.amount_paid`,
 *     never a locally recomputed figure. When the locked snapshot disagrees
 *     with what was actually collected, the order still records what Stripe
 *     charged and the discrepancy is reported.
 */

/** The business fields order creation and the order emails need. A wider object is fine. */
export type SubscriptionOrderBusiness = {
  id: string;
  name: string;
  ownerEmail: string;
  subdomain: string;
  customDomain?: string | null;
  domainStatus?: string | null;
  pickupLocation?: string | null;
  pickupInstructions?: string | null;
  businessAddress?: string | null;
  siteContent?: { logoUrl?: string | null } | null;
};

export type SubscriptionInvoiceParams = {
  business: SubscriptionOrderBusiness;
  subscription: Subscription;
  /** A paid invoice, ideally retrieved with `expand: ["payments"]`. */
  invoice: Stripe.Invoice;
  /** From `getInvoicePaymentIntentId(invoice)`; null when Stripe reported none. */
  paymentIntentId: string | null;
};

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

function isUniqueConflictOn(error: unknown, ...fields: string[]): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }
  const target = error.meta?.target as string[] | string | undefined;
  const targets = Array.isArray(target) ? target : target ? [target] : [];
  return targets.some((t) => fields.some((field) => t.includes(field)));
}

/**
 * Create the `Order` for a paid subscription invoice.
 *
 * The line item, price, shipping cost, delivery method and terms acceptance all
 * come from the `Subscription` row — the snapshot taken at signup — so a later
 * price change, product rename or address-book edit can't rewrite what an
 * existing subscriber is billed or where it ships.
 *
 * Mirrors `createOrderFromCheckout`'s order-number strategy (read the current
 * max, retry up to 3× on a P2002 conflict): two invoices paid in the same
 * second on the same store can otherwise pick the same number.
 */
export async function createOrderFromSubscriptionInvoice(
  db: DbClient,
  params: SubscriptionInvoiceParams,
): Promise<OrderWithItems> {
  const { business, subscription, invoice, paymentIntentId } = params;

  const deliveryMethod =
    subscription.deliveryMethod === "pickup" ? "pickup" : "ship";

  const subtotal = subscription.unitAmountCents * subscription.quantity;
  const shipping = deliveryMethod === "pickup" ? 0 : subscription.shippingCents;
  const tax = invoiceTaxCents(invoice);
  const total = invoice.amount_paid;

  // Reported, not corrected. The most likely causes are an owner editing the
  // subscription's price directly in the Stripe dashboard (which SimplePress
  // has no way to observe) and a tax rate we didn't anticipate. Either way the
  // customer was charged `amount_paid`, so that is what the order records — but
  // the owner's fulfillment screen would otherwise silently disagree with their
  // Stripe payout.
  const expectedTotal = subtotal + shipping + tax;
  if (expectedTotal !== total) {
    Sentry.captureMessage(
      `[Subscription] Invoice ${invoice.id} collected ${total} but the locked subscription snapshot expects ${expectedTotal} — recording amount_paid`,
      {
        level: "warning",
        tags: {
          service: "stripe",
          "subscription.step": "invoice-amount-mismatch",
          businessId: business.id,
        },
      },
    );
  }

  // `ShippingAddress` is `SetNull` on the subscription, so a customer tidying
  // their address book can strand a live subscription with a null FK and an
  // intact encrypted snapshot. The snapshot is the source of truth: recreate
  // the address, then write the FK back so the NEXT renewal reuses it rather
  // than leaning on `findOrCreateShippingAddress`'s dedupe every month.
  let shippingAddressId = subscription.shippingAddressId;
  if (
    !shippingAddressId &&
    deliveryMethod === "ship" &&
    subscription.customerId &&
    subscription.shipAddress1
  ) {
    try {
      shippingAddressId = await findOrCreateShippingAddress({
        customerId: subscription.customerId,
        firstName: subscription.shipFirstName ?? "",
        lastName: subscription.shipLastName ?? "",
        address1: subscription.shipAddress1,
        address2: subscription.shipAddress2,
        city: subscription.shipCity ?? "",
        province: subscription.shipProvince ?? "",
        zip: subscription.shipZip ?? "",
        country: subscription.shipCountry ?? "US",
        phone: subscription.customerPhone,
      });
      await db.subscription.update({
        where: { id: subscription.id },
        data: { shippingAddressId },
      });
    } catch (addressError) {
      // Non-fatal: the order is still created, just without a linked address
      // (the snapshot on the subscription still says where it ships).
      shippingAddressId = null;
      Sentry.withScope((scope) => {
        scope.setTag("service", "stripe");
        scope.setTag("subscription.step", "recreate-shipping-address");
        scope.setTag("businessId", business.id);
        Sentry.captureException(addressError);
      });
    }
  }

  const { firstName, lastName } = splitCustomerName(subscription.customerName);

  const getNextOrderNumber = async () => {
    const lastOrder = await db.order.findFirst({
      where: { businessId: business.id },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    return (lastOrder?.orderNumber ?? 0) + 1;
  };

  let orderNumber = await getNextOrderNumber();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.order.create({
        data: {
          businessId: business.id,
          orderNumber,
          customerId: subscription.customerId,
          shippingAddressId,
          subscriptionId: subscription.id,

          customerEmail: subscription.customerEmail,
          customerName: subscription.customerName,
          customerFirstName: firstName,
          customerLastName: lastName,
          customerPhone: subscription.customerPhone,

          subtotal,
          shipping,
          tax,
          discount: 0,
          total,

          status: "open",
          paymentStatus: "paid",
          fulfillmentStatus: "unfulfilled",
          paymentMethod: "card",
          deliveryMethod,

          // Copied off the subscription: the customer agreed to the merchant's
          // terms once, at signup, and that acceptance covers every delivery.
          termsAcceptedAt: subscription.termsAcceptedAt,
          termsVersion: subscription.termsVersion,
          merchantTermsUpdatedAt: subscription.merchantTermsUpdatedAt,

          // Billed by invoice — a subscription order has no Checkout Session.
          stripeSessionId: null,
          stripeInvoiceId: invoice.id,
          stripePaymentIntentId: paymentIntentId,

          items: {
            create: [
              {
                productId: subscription.productId,
                productVariantId: subscription.productVariantId,
                productName: subscription.productName,
                variantName: subscription.variantName,
                sku: subscription.sku,
                quantity: subscription.quantity,
                price: subscription.unitAmountCents,
                total: subtotal,
              },
            ],
          },
        },
        include: { items: true },
      });
    } catch (createErr: unknown) {
      if (
        attempt < 2 &&
        isUniqueConflictOn(
          createErr,
          "orderNumber",
          "Order_businessId_orderNumber_key",
        )
      ) {
        orderNumber = await getNextOrderNumber();
        continue;
      }
      throw createErr;
    }
  }

  // Unreachable — the loop always returns or throws.
  throw new Error("[Subscription] Order creation retry exhausted");
}

/**
 * The full "an invoice was paid" pipeline: order → customer metrics →
 * inventory → low-stock alerts → customer confirmation → owner notification.
 *
 * **Idempotent on `Order.stripeInvoiceId`.** Stripe redelivers events freely,
 * and the cron reconciler replays paid invoices it finds unaccounted for, so
 * this is checked up front AND caught as a P2002 on create (two deliveries can
 * race past the read). A repeat call is a total no-op: no second order, no
 * second inventory hit, no second email.
 *
 * Every step after order creation is in its own try/catch. The order is the
 * committed fact; a Resend outage, a deleted product or a locked inventory row
 * must not roll it back or make this throw, which would only make Stripe retry
 * work that already succeeded.
 */
export async function processPaidInvoice(
  db: DbClient,
  params: SubscriptionInvoiceParams,
): Promise<{ order: OrderWithItems; created: boolean }> {
  const { business, subscription, invoice } = params;
  const invoiceId = invoice.id;

  const existing = await db.order.findUnique({
    where: { stripeInvoiceId: invoiceId },
    include: { items: true },
  });
  if (existing) {
    return { order: existing, created: false };
  }

  let order: OrderWithItems;
  try {
    order = await createOrderFromSubscriptionInvoice(db, params);
  } catch (createError) {
    if (
      isUniqueConflictOn(
        createError,
        "stripeInvoiceId",
        "Order_stripeInvoiceId",
      )
    ) {
      const raced = await db.order.findUnique({
        where: { stripeInvoiceId: invoiceId },
        include: { items: true },
      });
      if (raced) return { order: raced, created: false };
    }
    throw createError;
  }

  // Customer metrics — lifetime spend / order count on the storefront profile.
  if (subscription.customerId) {
    try {
      await db.customer.update({
        where: { id: subscription.customerId },
        data: {
          totalSpent: { increment: order.total },
          orderCount: { increment: 1 },
        },
      });
    } catch (customerError) {
      Sentry.withScope((scope) => {
        scope.setTag("service", "stripe");
        scope.setTag("subscription.step", "customer-metrics");
        scope.setTag("businessId", business.id);
        Sentry.captureException(customerError);
      });
    }
  }

  let candidates: LowStockCandidate[] = [];
  let poolCandidates: PoolDeductionResult[] = [];

  const items: OrderDeductionItem[] = order.items.map((item) => ({
    productId: item.productId,
    productVariantId: item.productVariantId,
    quantity: item.quantity,
    productName: item.productName,
  }));

  try {
    const result = await db.$transaction(async (tx) =>
      deductInventoryForOrderItems(tx, {
        businessId: business.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        items,
      }),
    );
    candidates = result.candidates;
    poolCandidates = result.poolCandidates;
  } catch (inventoryError) {
    Sentry.withScope((scope) => {
      scope.setTag("service", "stripe");
      scope.setTag("subscription.step", "inventory-deduction");
      scope.setTag("businessId", business.id);
      Sentry.captureException(inventoryError);
    });
  }

  // Runs outside the transaction on purpose — it sends email.
  await sendLowInventoryAlerts(db, { business, candidates, poolCandidates });

  const manageUrl = buildSubscriptionManageUrl(business, subscription);

  try {
    let shippingAddressForEmail = undefined;
    if (order.shippingAddressId) {
      const addr = await db.shippingAddress.findUnique({
        where: { id: order.shippingAddressId },
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
              business.pickupLocation ?? business.businessAddress ?? undefined,
            pickupInstructions: business.pickupInstructions ?? undefined,
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
      orderId: order.id,
      // Keyed on the invoice, not the order: a redelivered `invoice.paid` that
      // somehow got past the idempotency read must still not double-email.
      subscriptionManageUrl: manageUrl,
      idempotencyKey: `sub-order-confirmation-${invoiceId}`,
    });
  } catch (emailError) {
    Sentry.withScope((scope) => {
      scope.setTag("service", "stripe");
      scope.setTag("subscription.step", "order-confirmation-email");
      scope.setTag("businessId", business.id);
      Sentry.captureException(emailError);
    });
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
      })),
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      discount: order.discount,
      total: order.total,
      deliveryMethod: order.deliveryMethod as "ship" | "pickup",
      subscription: {
        intervalLabel: subscriptionIntervalLabel(subscription),
        adminUrl: buildAdminSubscriptionUrl(business, subscription.id),
      },
      business: {
        name: business.name,
        siteContent: business.siteContent,
        subdomain: business.subdomain,
        customDomain: business.customDomain,
        domainStatus: business.domainStatus,
      },
      idempotencyKey: `sub-owner-notification-${invoiceId}`,
    });
  } catch (ownerEmailError) {
    Sentry.withScope((scope) => {
      scope.setTag("service", "stripe");
      scope.setTag("subscription.step", "owner-notification-email");
      scope.setTag("businessId", business.id);
      Sentry.captureException(ownerEmailError);
    });
  }

  return { order, created: true };
}
