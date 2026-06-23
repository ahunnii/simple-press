import type Stripe from "stripe";
import { Prisma } from "generated/prisma";

import type { DbClient } from "~/server/db";

/**
 * Maps Stripe line items from a fully-expanded checkout session into the shape
 * expected by `db.order.create({ data: { items: { create: [...] } } })`.
 *
 * This is a pure function — it performs no I/O and can be tested without a DB.
 */
export function mapStripeLineItemsToOrderItems(
  fullSession: Stripe.Checkout.Session,
) {
  return (
    fullSession.line_items?.data.map((item) => {
      const product = item.price?.product;
      const metadata =
        product &&
        typeof product === "object" &&
        !("deleted" in product && product.deleted) &&
        "metadata" in product
          ? (product as { metadata: Record<string, string> }).metadata
          : {};

      const productId = metadata.productId?.trim() ?? null;
      const productVariantId = metadata.productVariantId?.trim() ?? null;
      const variantName = metadata.variantName?.trim() ?? null;
      const sku = metadata.sku?.trim() ?? null;

      return {
        productName: item.description ?? "Unknown Product",
        variantName,
        sku,
        productId,
        productVariantId,
        quantity: item.quantity ?? 1,
        price: item.price?.unit_amount ?? 0,
        total: item.amount_total,
      };
    }) ?? []
  );
}

export type CreateOrderParams = {
  business: { id: string };
  customer: { id: string } | null;
  shippingAddressId: string | null;
  customerEmail: string;
  /** The base session object from the webhook event (unexpanded). */
  session: Stripe.Checkout.Session;
  /** The fully-expanded session (with line_items, total_details, etc.). */
  fullSession: Stripe.Checkout.Session;
  verifiedDiscountCodeId: string | null;
  discountAmount: number;
  deliveryMethod?: "ship" | "pickup";
};

/**
 * Generates the next order number for a business and creates the order in the
 * database, including all line items. Retries up to 3 times on a P2002
 * unique-constraint conflict for `orderNumber` — two concurrent webhook
 * deliveries for different sessions can race and produce the same number.
 *
 * The create is NOT inside an inventory transaction, so a rolled-back create
 * has no side effects to undo.
 */
export async function createOrderFromCheckout(
  db: DbClient,
  params: CreateOrderParams,
) {
  const {
    business,
    customer,
    shippingAddressId,
    customerEmail,
    session,
    fullSession,
    verifiedDiscountCodeId,
    discountAmount,
    deliveryMethod = "ship",
  } = params;

  // Generate order number and create order. Retry up to 3 times on a
  // unique-constraint conflict for orderNumber — two concurrent webhook
  // deliveries for different sessions can race and produce the same number.
  const getNextOrderNumber = async () => {
    const lastOrder = await db.order.findFirst({
      where: { businessId: business.id },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    return (lastOrder?.orderNumber ?? 0) + 1;
  };

  let orderNumber = await getNextOrderNumber();

  // Wrap in a retry loop: two concurrent webhook deliveries for different
  // sessions can race and produce the same orderNumber. On P2002, re-query
  // and retry (max 3 attempts). The create is not inside an inventory
  // transaction, so a rolled-back create has no side effects to undo.
  const order = await (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await db.order.create({
          data: {
            businessId: business.id,
            orderNumber,
            customerId: customer?.id ?? null,
            shippingAddressId,

            customerEmail,
            customerName: session.customer_details?.name ?? "Unknown",

            // Amounts in cents
            subtotal: session.amount_subtotal ?? 0,
            tax: fullSession.total_details?.amount_tax ?? 0,
            shipping: fullSession.total_details?.amount_shipping ?? 0,
            discount: discountAmount,
            total: session.amount_total ?? 0,

            // currency: session.currency ?? "usd",
            status: "open",
            paymentStatus: session.payment_status ?? "paid",
            fulfillmentStatus: "unfulfilled",

            deliveryMethod,

            // Stripe reference
            stripeSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : null,

            ...(verifiedDiscountCodeId
              ? { discountCodeId: verifiedDiscountCodeId }
              : {}),

            // Order items
            items: {
              create: mapStripeLineItemsToOrderItems(fullSession),
            },
          },
          include: { items: true },
        });
      } catch (createErr: unknown) {
        const isOrderNumberConflict =
          createErr instanceof Prisma.PrismaClientKnownRequestError &&
          createErr.code === "P2002" &&
          (createErr.meta?.target as string[] | undefined)?.some(
            (f) =>
              f === "orderNumber" || f === "Order_businessId_orderNumber_key",
          );
        if (attempt < 2 && isOrderNumberConflict) {
          orderNumber = await getNextOrderNumber();
          continue;
        }
        throw createErr;
      }
    }
    // unreachable — loop always returns or throws
    throw new Error("[Webhook] Order creation retry exhausted");
  })();

  return order;
}
