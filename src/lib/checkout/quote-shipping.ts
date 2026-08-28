import type { ZoneWeightFallbackSource } from "~/lib/shipping-config";
import type { DbClient } from "~/server/db";
import {
  buildZoneWeightConfig,
  reportZoneWeightFallback,
} from "~/lib/shipping-config";
import {
  calculateShipping,
  calculateZoneWeightShipping,
  normalizeWeightToLb,
  SHIPPING_TYPES,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";

/**
 * Server-side shipping quote for a set of line items to a destination.
 *
 * Extracted **verbatim** from the body of the `shipping.quote` tRPC procedure
 * (`src/server/api/routers/shipping.ts`) so a second caller — the subscription
 * checkout route, which must price a delivery before Stripe ever sees the
 * order — can reuse the store's real rules instead of growing a parallel
 * implementation that drifts. The router is now a thin wrapper over this
 * function and `tests/integration/shipping-quote.test.ts` pins the behavior
 * on both sides of the move.
 *
 * Prices and weights are always re-fetched from the database. Nothing about
 * the money here is client-supplied: the caller passes ids, quantities and a
 * destination, and that is all.
 */

/**
 * Thrown when the business row disappears between tenant resolution and this
 * lookup (a race, or a deleted store). The tRPC wrapper maps it back to the
 * `NOT_FOUND` it has always thrown; the checkout routes treat it as a 500.
 */
export class ShippingQuoteBusinessNotFoundError extends Error {
  constructor(businessId: string) {
    super(`Business not found: ${businessId}`);
    this.name = "ShippingQuoteBusinessNotFoundError";
  }
}

export interface ShippingQuoteItem {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface QuoteShippingCentsInput {
  businessId: string;
  items: readonly ShippingQuoteItem[];
  destinationState: string;
  destinationCountry: string;
  deliveryMethod: "ship" | "pickup";
  /**
   * `route:` tag attached to any zone+weight fallback report, so a store whose
   * rate matrix can't price a destination is traceable to the surface that hit
   * it (the live quote, one-time checkout, or a subscription signup). Passed in
   * rather than hardcoded — this module now has more than one caller.
   */
  source: ZoneWeightFallbackSource;
}

export async function quoteShippingCents(
  db: DbClient,
  input: QuoteShippingCentsInput,
): Promise<number> {
  const {
    businessId,
    items,
    destinationState,
    destinationCountry,
    deliveryMethod,
    source,
  } = input;

  // Pickup is always free.
  if (deliveryMethod === "pickup") {
    return 0;
  }

  // Fetch the full business row so we have shipping fields.
  const businessData = await db.business.findUnique({
    where: { id: businessId },
    select: {
      shippingType: true,
      shippingFlatRate: true,
      freeShippingThreshold: true,
      offersInStorePickup: true,
      shippingWeightTiers: true,
      shippingFallbackRate: true,
      shippingDefaultItemWeightLb: true,
    },
  });

  if (!businessData) {
    throw new ShippingQuoteBusinessNotFoundError(businessId);
  }

  // Collect product and variant ids.
  const variantIds = [
    ...new Set(
      items.map((i) => i.variantId).filter((id): id is string => id !== null),
    ),
  ];
  const productIds = [...new Set(items.map((i) => i.productId))];

  // Fetch product and variant data server-side (price + weight).
  const [variantsWithProduct, products] = await Promise.all([
    variantIds.length > 0
      ? db.productVariant.findMany({
          where: {
            id: { in: variantIds },
            product: { businessId, published: true },
          },
          select: {
            id: true,
            price: true,
            product: {
              select: {
                price: true,
                weight: true,
                weightUnit: true,
              },
            },
          },
        })
      : [],
    db.product.findMany({
      where: {
        id: { in: productIds },
        businessId,
        // Drafts are not purchasable (checkout rejects them in
        // `validate-cart`), so they must not contribute a price or weight
        // to a quote either.
        published: true,
      },
      select: {
        id: true,
        price: true,
        weight: true,
        weightUnit: true,
      },
    }),
  ]);

  const variantMap = new Map(variantsWithProduct.map((v) => [v.id, v]));
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Compute subtotal (server prices only).
  let subtotalCents = 0;
  for (const item of items) {
    const price = item.variantId
      ? (variantMap.get(item.variantId)?.price ??
        productMap.get(item.productId)?.price ??
        0)
      : (productMap.get(item.productId)?.price ?? 0);
    subtotalCents += price * item.quantity;
  }

  // Compute total weight in pounds.
  const defaultItemWeightLb = businessData.shippingDefaultItemWeightLb ?? 0;
  let totalWeightLb = 0;
  for (const item of items) {
    let weightLb: number;
    if (item.variantId) {
      const variant = variantMap.get(item.variantId);
      const pw = variant?.product.weight ?? null;
      const pu = variant?.product.weightUnit ?? null;
      weightLb = pw != null ? normalizeWeightToLb(pw, pu) : defaultItemWeightLb;
    } else {
      const product = productMap.get(item.productId);
      const pw = product?.weight ?? null;
      const pu = product?.weightUnit ?? null;
      weightLb = pw != null ? normalizeWeightToLb(pw, pu) : defaultItemWeightLb;
    }
    totalWeightLb += weightLb * item.quantity;
  }

  // Compute shipping cost.
  let shippingCents: number;

  if (businessData.shippingType === SHIPPING_TYPES.ZONE_WEIGHT) {
    // Load zones with rates for zone+weight calculation.
    const zones = await db.shippingZone.findMany({
      where: { businessId },
      include: { rates: true },
      orderBy: { sortOrder: "asc" },
    });

    const config = buildZoneWeightConfig({
      shippingWeightTiers: businessData.shippingWeightTiers,
      shippingFallbackRate: businessData.shippingFallbackRate,
      freeShippingThreshold: businessData.freeShippingThreshold,
      shippingDefaultItemWeightLb: businessData.shippingDefaultItemWeightLb,
      zones,
    });

    shippingCents = calculateZoneWeightShipping({
      destinationState,
      destinationCountry,
      totalWeightLb,
      subtotalCents,
      config,
      // `calculateZoneWeightShipping` is total — it never rejects, it quotes
      // `fallbackRateCents`. A store whose matrix quotes $99.99 (or, worse,
      // $0) for a real destination loses the sale silently, so every fallback
      // is reported. `reportZoneWeightFallback` throttles to one event per
      // store + source + reason per 15 minutes, so a permanently broken store
      // costs 4 events an hour, not one per keystroke.
      onFallback: (info) =>
        reportZoneWeightFallback(info, { businessId, source }),
    });
  } else {
    const shippingConfig = shippingConfigFromBusiness({
      shippingType: businessData.shippingType,
      shippingFlatRate: businessData.shippingFlatRate,
      freeShippingThreshold: businessData.freeShippingThreshold,
      offersInStorePickup: businessData.offersInStorePickup,
    });
    shippingCents = calculateShipping(subtotalCents, shippingConfig);
  }

  return shippingCents;
}
