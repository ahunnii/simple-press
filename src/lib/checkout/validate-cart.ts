import type { CartLineItem, PoolMap, ProductMap, VariantMap } from "./types";

export interface CartAvailabilityResult {
  /** Display names of unavailable items (may contain duplicates, as before). */
  unavailableItems: string[];
  /** De-duplicated product/variant ids for the client to drop from the cart. */
  unavailableItemIds: { productId: string; variantId: string | null }[];
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
  const unavailableIdKeySet = new Set<string>();

  const pushUnavailable = (
    name: string,
    productId: string,
    variantId: string | null,
  ) => {
    unavailableItems.push(name);
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
      if (!variant?.product.published) {
        pushUnavailable(name, item.productId, item.variantId);
        continue;
      }
      const variantProductFields = variant.product.additionalFields as Record<
        string,
        unknown
      > | null;
      if (variantProductFields?.comingSoon === true) {
        pushUnavailable(name, item.productId, item.variantId);
        continue;
      }
      if (
        variant.product.trackInventory &&
        !variant.product.allowBackorders &&
        variant.inventoryQty - variant.reservedQty < qty
      ) {
        pushUnavailable(name, item.productId, item.variantId);
        continue;
      }
    } else {
      const product = productMap.get(item.productId);
      if (!product?.published) {
        pushUnavailable(name, item.productId, null);
        continue;
      }
      if (product._count.variants > 0) {
        pushUnavailable(name, item.productId, null);
        continue;
      }
      const productFields = product.additionalFields as Record<
        string,
        unknown
      > | null;
      if (productFields?.comingSoon === true) {
        pushUnavailable(name, item.productId, null);
        continue;
      }
      // Pool inventory check — pool demand is validated in aggregate below
      if (!product.baseInventoryUnitId) {
        if (
          product.trackInventory &&
          !product.allowBackorders &&
          product.inventoryQty - product.reservedQty < qty
        ) {
          pushUnavailable(name, item.productId, null);
        }
      }
    }
  }

  // Aggregate pool check: compare total pool demand vs available qty
  for (const [poolId, demand] of poolDemand) {
    const pool = poolMap.get(poolId);
    if (
      !pool ||
      (!pool.allowBackorders && pool.inventoryQty - pool.reservedQty < demand)
    ) {
      // Mark all items drawing from this pool as unavailable
      for (const item of items) {
        if (!item.variantId) {
          const p = productMap.get(item.productId);
          if (p?.baseInventoryUnitId === poolId) {
            const n = item.variantName
              ? `${item.productName} (${item.variantName})`
              : item.productName;
            pushUnavailable(n, item.productId, null);
          }
        }
      }
    }
  }

  return { unavailableItems, unavailableItemIds };
}
