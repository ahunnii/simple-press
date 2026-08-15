import type { CartLineItem, PoolMap, ProductMap, VariantMap } from "./types";

/**
 * Why a cart line was rejected.
 *
 * Every value except `out-of-stock` describes an OWNER/TEMPLATE fault: the
 * shopper did nothing wrong and retrying will never help, because the store
 * cannot sell that item until the owner fixes the underlying catalog data. Those
 * cases reject 100% of shoppers for the affected product and are otherwise
 * invisible — the shopper just sees "no longer available" and leaves.
 *
 * `out-of-stock` is ordinary scarcity: expected, shopper-visible, self-healing
 * once stock is added. It is deliberately classified as NOT an owner fault so
 * the checkout route can stay silent about it (see `reportCheckoutBlocked` in
 * `src/app/api/stripe/create-session/route.ts`) instead of burying the real
 * misconfiguration signal under normal traffic.
 */
export type UnavailableReason =
  /** Variant id isn't in this business's catalog — deleted, or another tenant's. */
  | "variant-missing"
  /** Bare product id isn't in this business's catalog — deleted, or another tenant's. */
  | "product-missing"
  /** The product row exists but `published === false`. */
  | "unpublished"
  /** `additionalFields.comingSoon === true` on the product. */
  | "coming-soon"
  /** A bare `productId` was posted for a product that has variants. */
  | "variant-required"
  /** The product draws from a shared pool whose `BaseInventoryUnit` row is gone. */
  | "pool-missing"
  /** Genuine stock exhaustion — the one SHOPPER-fault reason. */
  | "out-of-stock";

/**
 * The reasons that mean "the store is broken", as opposed to "this item happens
 * to be sold out right now". Kept beside the union so a newly added reason has
 * to be classified deliberately rather than defaulting to silence.
 */
const OWNER_FAULT_REASONS: ReadonlySet<UnavailableReason> = new Set([
  "variant-missing",
  "product-missing",
  "unpublished",
  "coming-soon",
  "variant-required",
  "pool-missing",
]);

/** True when `reason` indicates store misconfiguration rather than scarcity. */
export function isOwnerFaultReason(reason: UnavailableReason): boolean {
  return OWNER_FAULT_REASONS.has(reason);
}

/** A single rejection, with the cause that produced it. */
export interface UnavailableItemDetail {
  productId: string;
  variantId: string | null;
  reason: UnavailableReason;
}

export interface CartAvailabilityResult {
  /** Display names of unavailable items (may contain duplicates, as before). */
  unavailableItems: string[];
  /** De-duplicated product/variant ids for the client to drop from the cart. */
  unavailableItemIds: { productId: string; variantId: string | null }[];
  /**
   * One entry per rejection, aligned 1:1 (same length, same order) with
   * `unavailableItems` — so it carries the same duplicates, not the de-duped
   * shape of `unavailableItemIds`. Diagnostics only: the checkout route reads it
   * to decide whether a blocked cart is worth a Sentry event and to report the
   * per-reason breakdown. It is NOT part of the HTTP response body — the client
   * cart hook (`src/hooks/use-checkout-form.ts`) reads only `unavailableItems`
   * and `unavailableItemIds`, and those two keep their exact shape.
   */
  unavailableDetails: UnavailableItemDetail[];
}

/**
 * Aggregate the base-unit demand per shared inventory pool across the cart.
 *
 * Extracted verbatim from `create-session/route.ts`. Plain (non-variant)
 * products that draw from a `baseInventoryUnit` pool sum their demand so the
 * pool can be validated in aggregate rather than per-line.
 */
export function computePoolDemand(
  items: readonly CartLineItem[],
  productMap: ProductMap,
): Map<string, number> {
  const poolDemand = new Map<string, number>();
  for (const item of items) {
    if (!item.variantId) {
      const p = productMap.get(item.productId);
      if (p?.baseInventoryUnitId) {
        const cur = poolDemand.get(p.baseInventoryUnitId) ?? 0;
        poolDemand.set(
          p.baseInventoryUnitId,
          cur + (p.baseUnitsConsumed ?? 1) * (Number(item.quantity) || 1),
        );
      }
    }
  }
  return poolDemand;
}

/**
 * Server-side cart availability check shared by every template's checkout.
 *
 * Rejects items that are: unpublished, flagged `comingSoon`, a bare product id
 * for a product that actually has variants, or out of stock (tracked,
 * non-backorder, and demand exceeds `inventoryQty - reservedQty`). Pool-backed
 * products are validated in aggregate against their pool.
 *
 * Extracted verbatim from `create-session/route.ts` so the rules can be
 * unit-tested without standing up the full route.
 *
 * Each rejection also records an `UnavailableReason` in `unavailableDetails`.
 * The accept/reject decisions are unchanged — the reason only splits causes that
 * were previously collapsed into one branch (a missing row vs. an unpublished
 * one, a missing pool vs. an exhausted one) so callers can distinguish store
 * misconfiguration from ordinary sold-out stock.
 */
export function checkCartAvailability(params: {
  items: readonly CartLineItem[];
  variantMap: VariantMap;
  productMap: ProductMap;
  poolDemand: ReadonlyMap<string, number>;
  poolMap: PoolMap;
}): CartAvailabilityResult {
  const { items, variantMap, productMap, poolDemand, poolMap } = params;

  const unavailableItems: string[] = [];
  const unavailableItemIds: {
    productId: string;
    variantId: string | null;
  }[] = [];
  const unavailableDetails: UnavailableItemDetail[] = [];
  const unavailableIdKeySet = new Set<string>();

  const pushUnavailable = (
    name: string,
    productId: string,
    variantId: string | null,
    reason: UnavailableReason,
  ) => {
    unavailableItems.push(name);
    unavailableDetails.push({ productId, variantId, reason });
    const key = `${productId}-${variantId ?? "base"}`;
    if (!unavailableIdKeySet.has(key)) {
      unavailableIdKeySet.add(key);
      unavailableItemIds.push({ productId, variantId });
    }
  };

  for (const item of items) {
    const name = item.variantName
      ? `${item.productName} (${item.variantName})`
      : item.productName;
    const qty = Number(item.quantity) || 1;

    if (item.variantId) {
      const variant = variantMap.get(item.variantId);
      // Split out of the old `!variant?.product.published` check: a variant the
      // query didn't return (deleted, or scoped to another business) and a
      // variant whose parent is unpublished are both hard rejections, but they
      // are different owner mistakes and want different fixes.
      if (!variant) {
        pushUnavailable(
          name,
          item.productId,
          item.variantId,
          "variant-missing",
        );
        continue;
      }
      if (!variant.product.published) {
        pushUnavailable(name, item.productId, item.variantId, "unpublished");
        continue;
      }
      const variantProductFields = variant.product.additionalFields as Record<
        string,
        unknown
      > | null;
      if (variantProductFields?.comingSoon === true) {
        pushUnavailable(name, item.productId, item.variantId, "coming-soon");
        continue;
      }
      if (
        variant.product.trackInventory &&
        !variant.product.allowBackorders &&
        variant.inventoryQty - variant.reservedQty < qty
      ) {
        pushUnavailable(name, item.productId, item.variantId, "out-of-stock");
        continue;
      }
    } else {
      const product = productMap.get(item.productId);
      // Same split as the variant branch above: absent row vs. unpublished row.
      if (!product) {
        pushUnavailable(name, item.productId, null, "product-missing");
        continue;
      }
      if (!product.published) {
        pushUnavailable(name, item.productId, null, "unpublished");
        continue;
      }
      if (product._count.variants > 0) {
        pushUnavailable(name, item.productId, null, "variant-required");
        continue;
      }
      const productFields = product.additionalFields as Record<
        string,
        unknown
      > | null;
      if (productFields?.comingSoon === true) {
        pushUnavailable(name, item.productId, null, "coming-soon");
        continue;
      }
      // Pool inventory check — pool demand is validated in aggregate below
      if (!product.baseInventoryUnitId) {
        if (
          product.trackInventory &&
          !product.allowBackorders &&
          product.inventoryQty - product.reservedQty < qty
        ) {
          pushUnavailable(name, item.productId, null, "out-of-stock");
        }
      }
    }
  }

  // Aggregate pool check: compare total pool demand vs available qty
  for (const [poolId, demand] of poolDemand) {
    const pool = poolMap.get(poolId);
    const poolExhausted =
      !!pool &&
      !pool.allowBackorders &&
      pool.inventoryQty - pool.reservedQty < demand;
    if (!pool || poolExhausted) {
      // A missing pool row is a broken product configuration (the pool was
      // deleted while products still point at it) and blocks those products
      // permanently; an exhausted pool is ordinary scarcity. Same rejection,
      // very different urgency.
      const reason: UnavailableReason = pool ? "out-of-stock" : "pool-missing";
      // Mark all items drawing from this pool as unavailable
      for (const item of items) {
        if (!item.variantId) {
          const p = productMap.get(item.productId);
          if (p?.baseInventoryUnitId === poolId) {
            const n = item.variantName
              ? `${item.productName} (${item.variantName})`
              : item.productName;
            pushUnavailable(n, item.productId, null, reason);
          }
        }
      }
    }
  }

  return { unavailableItems, unavailableItemIds, unavailableDetails };
}
