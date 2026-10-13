import type Stripe from "stripe";
import { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";

import type { CustomizationSnapshot } from "~/lib/customizer/types";
import type { DbClient, TxClient } from "~/server/db";
import {
  LINE_CONFIG_METADATA_KEY,
  OPTIONS_SUMMARY_METADATA_KEY,
  readLineConfigSnapshots,
} from "~/lib/checkout/customizer-checkout";

/**
 * Maps Stripe line items from a fully-expanded checkout session into the shape
 * expected by `db.order.create({ data: { items: { create: [...] } } })`.
 *
 * `lineConfigs` (from `loadCheckoutLineConfigs`) attaches the product
 * customizer build to every line create-session tagged with
 * `metadata.lineConfig`:
 *
 * - Normal path: the snapshot stored at checkout is copied VERBATIM. It is
 *   never re-priced here — the owner may have edited or deleted the options
 *   since (a bank payment can settle days later) — and the item's `price` is
 *   always Stripe's `unit_amount`, i.e. what was actually charged.
 * - Degraded path (the stored build is missing — only possible if the
 *   reservation row is gone, or a merchant hand-built the session): a
 *   summary-only snapshot from Stripe's `metadata.optionsSummary`, with no
 *   groups and NO components. The fulfiller still sees the build as text;
 *   the linked option stock is simply not deducted (there is nothing
 *   trustworthy to deduct from). Reported via `findMissingLineConfigs`.
 *
 * This is a pure function — it performs no I/O and can be tested without a DB.
 */
export function mapStripeLineItemsToOrderItems(
  fullSession: Stripe.Checkout.Session,
  lineConfigs?: ReadonlyMap<string, CustomizationSnapshot>,
) {
  return (
    fullSession.line_items?.data.map((item) => {
      const metadata = lineMetadata(item);

      const productId = metadata.productId?.trim() ?? null;
      const productVariantId = metadata.productVariantId?.trim() ?? null;
      const variantName = metadata.variantName?.trim() ?? null;
      const sku = metadata.sku?.trim() ?? null;
      const price = item.price?.unit_amount ?? 0;
      const customization = lineCustomization(metadata, price, lineConfigs);

      return {
        productName: item.description ?? "Unknown Product",
        variantName,
        sku,
        productId,
        productVariantId,
        quantity: item.quantity ?? 1,
        price,
        total: item.amount_total,
        ...(customization
          ? { customization: customization as Prisma.InputJsonValue }
          : {}),
      };
    }) ?? []
  );
}

function lineMetadata(item: Stripe.LineItem): Record<string, string> {
  const product = item.price?.product;
  return product &&
    typeof product === "object" &&
    !("deleted" in product && product.deleted) &&
    "metadata" in product
    ? (product as { metadata: Record<string, string> }).metadata
    : {};
}

function lineCustomization(
  metadata: Record<string, string>,
  unitAmount: number,
  lineConfigs: ReadonlyMap<string, CustomizationSnapshot> | undefined,
): CustomizationSnapshot | null {
  const key = metadata[LINE_CONFIG_METADATA_KEY]?.trim();
  if (!key) return null;
  const stored = lineConfigs?.get(key);
  if (stored) return stored;
  const summary = metadata[OPTIONS_SUMMARY_METADATA_KEY]?.trim() ?? "";
  return {
    v: 1,
    basePrice: unitAmount,
    addOnTotal: 0,
    summary,
    groups: [],
    components: [],
  };
}

/**
 * `lineConfig` keys on the session's lines that have no stored build — the
 * lines `mapStripeLineItemsToOrderItems` degrades to a summary-only snapshot.
 */
export function findMissingLineConfigs(
  fullSession: Stripe.Checkout.Session,
  lineConfigs: ReadonlyMap<string, CustomizationSnapshot>,
): string[] {
  return (fullSession.line_items?.data ?? [])
    .map((item) => lineMetadata(item)[LINE_CONFIG_METADATA_KEY]?.trim() ?? "")
    .filter((key) => key !== "" && !lineConfigs.has(key));
}

/** Does any line of the session carry a customizer build (`lineConfig`)? */
export function hasConfiguredLines(
  fullSession: Stripe.Checkout.Session,
): boolean {
  return (fullSession.line_items?.data ?? []).some(
    (item) => !!lineMetadata(item)[LINE_CONFIG_METADATA_KEY]?.trim(),
  );
}

/**
 * The builds create-session stored for this checkout
 * (`InventoryReservation.lineConfigs`), by line key.
 *
 * Scoped to the verified business (metadata.reservationId is
 * merchant-controllable) and deliberately WITHOUT a status filter: a delayed
 * payment whose hold the sweeper already released (status "released") must
 * still get its builds when the late success arrives. Prefers the row bound
 * to this session id over the metadata id.
 */
export async function loadCheckoutLineConfigs(
  db: DbClient | TxClient,
  params: { businessId: string; session: Stripe.Checkout.Session },
): Promise<Map<string, CustomizationSnapshot>> {
  const reservationId = params.session.metadata?.reservationId;
  const rows = await db.inventoryReservation.findMany({
    where: {
      businessId: params.businessId,
      OR: [
        { stripeSessionId: params.session.id },
        ...(reservationId ? [{ id: reservationId }] : []),
      ],
    },
    select: { id: true, stripeSessionId: true, lineConfigs: true },
  });
  const row =
    rows.find((r) => r.stripeSessionId === params.session.id) ?? rows[0];
  return readLineConfigSnapshots(row?.lineConfigs ?? null);
}

/**
 * Free-shipping discount codes: create-session zeroes the shipping option on
 * Stripe (so `amount_shipping` is 0) and records the original shipping cost in
 * session metadata as `freeShippingDiscountCents`. This parses it back out.
 *
 * Pure function — returns 0 for missing/malformed/non-positive values.
 */
export function parseFreeShippingDiscountCents(
  session: Stripe.Checkout.Session,
  fullSession: Stripe.Checkout.Session,
): number {
  const raw =
    session.metadata?.freeShippingDiscountCents ??
    fullSession.metadata?.freeShippingDiscountCents ??
    "";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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
  /**
   * Merchant-terms acceptance, captured at checkout — see the `Order` model
   * docblock in schema.prisma. All optional/nullable: callers that don't
   * pass them (e.g. tests exercising order shape in isolation) simply record
   * no acceptance, which is the same honest "unknown" state pre-existing
   * orders have.
   */
  termsAcceptedAt?: Date | null;
  termsVersion?: string | null;
  merchantTermsUpdatedAt?: Date | null;
  /**
   * Product customizer builds stored at checkout, by line key
   * (`loadCheckoutLineConfigs`). Absent = no configured lines expected.
   */
  lineConfigs?: ReadonlyMap<string, CustomizationSnapshot>;
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
    termsAcceptedAt = null,
    termsVersion = null,
    merchantTermsUpdatedAt = null,
    lineConfigs = new Map<string, CustomizationSnapshot>(),
  } = params;

  // A configured line whose stored build is gone still becomes an order item
  // (the money was taken) with a summary-only snapshot — see
  // `mapStripeLineItemsToOrderItems`. Worth knowing: its option stock was
  // not deducted.
  const missingLineConfigs = findMissingLineConfigs(fullSession, lineConfigs);
  if (missingLineConfigs.length > 0) {
    Sentry.captureMessage(
      `[Webhook] Configured line(s) without a stored build on session ${session.id}; order items get a summary-only snapshot`,
      {
        level: "warning",
        tags: {
          "webhook.step": "customizer-line-config-missing",
          businessId: business.id,
        },
        extra: { missingLineConfigs, stripeSessionId: session.id },
      },
    );
  }

  // Payment gate: only materialize the order (and, downstream in the webhook,
  // decrement inventory) once the money is actually captured. On
  // `checkout.session.completed`, standard card payments arrive as "paid" and
  // fully-discounted / $0 orders as "no_payment_required" — both are safe to
  // fulfill. Async/delayed payment methods (e.g. bank debits) instead complete
  // the session as "unpaid" and settle later; creating the order here would
  // decrement stock before payment succeeds. Reject "unpaid" so no order is
  // created for it.
  //
  // NOTE: the webhook never reaches this with an unpaid session in the normal
  // flow — this gate is defense in depth. For delayed methods the route
  // handles `checkout.session.completed` + "unpaid" itself (extends the stock
  // hold, emails the shopper that payment is processing, creates nothing),
  // then `checkout.session.async_payment_succeeded` — which carries "paid" —
  // runs the ordinary order path through here, and
  // `checkout.session.async_payment_failed` releases the hold (see
  // `src/lib/checkout/async-payment-webhook.ts`).
  if (session.payment_status === "unpaid") {
    throw new Error(
      `[Webhook] Refusing to create order for unpaid session ${session.id} (payment_status=unpaid)`,
    );
  }

  // Free-shipping discount codes: record the order with shipping AND discount
  // at the original shipping value so totals reconcile:
  //   subtotal + shipping(S) - discount(S) = amount_total.
  const freeShippingDiscountCents = parseFreeShippingDiscountCents(
    session,
    fullSession,
  );

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
            shipping:
              (fullSession.total_details?.amount_shipping ?? 0) +
              freeShippingDiscountCents,
            discount: discountAmount + freeShippingDiscountCents,
            total: session.amount_total ?? 0,

            // currency: session.currency ?? "usd",
            status: "open",
            paymentStatus: session.payment_status ?? "paid",
            fulfillmentStatus: "unfulfilled",

            deliveryMethod,

            // Merchant-terms acceptance — see the Order model docblock.
            termsAcceptedAt,
            termsVersion,
            merchantTermsUpdatedAt,

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
              create: mapStripeLineItemsToOrderItems(fullSession, lineConfigs),
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
