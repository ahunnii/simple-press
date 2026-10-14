import { parseCardAdditionalFields } from "~/lib/products";

/**
 * Stock fields the back-in-stock cron selects for a requested product. Every
 * field is read by `checkCartAvailability` (src/lib/checkout/validate-cart.ts),
 * which is the authority this predicate mirrors.
 */
export type RestockVariant = {
  id: string;
  inventoryQty: number;
  reservedQty: number;
};

export type RestockProduct = {
  published: boolean;
  additionalFields: unknown;
  trackInventory: boolean;
  allowBackorders: boolean;
  inventoryQty: number;
  reservedQty: number;
  baseInventoryUnitId: string | null;
  baseUnitsConsumed: number | null;
  baseInventoryUnit: {
    inventoryQty: number;
    reservedQty: number;
    allowBackorders: boolean;
  } | null;
  variants: RestockVariant[];
};

// A variant line at checkout: the parent product's tracking/backorder switches
// gate it, and stock already held by in-flight checkouts doesn't count.
function variantAcceptsOne(
  product: RestockProduct,
  variant: RestockVariant,
): boolean {
  if (!product.trackInventory || product.allowBackorders) return true;
  return variant.inventoryQty - variant.reservedQty >= 1;
}

/**
 * Whether checkout would accept ONE unit of the requested product/variant
 * right now — the moment a back-in-stock email is worth sending.
 *
 * Mirrors `checkCartAvailability` for a cart of quantity 1:
 *   - unpublished or `comingSoon` → never
 *   - a variant request           → that variant's unreserved stock (the pool
 *                                   never applies to variant lines)
 *   - a bare request on a product
 *     with variants               → any variant checkout would accept (checkout
 *                                   itself needs a variant pick, so the email
 *                                   sends the shopper to choose one)
 *   - a pooled product            → POOL FIRST: the product's own
 *                                   `trackInventory` is forced off when a pool
 *                                   is linked, so it must not short-circuit.
 *                                   One sale consumes `baseUnitsConsumed ?? 1`
 *                                   pool units out of `inventoryQty - reservedQty`
 *                                   unless the pool allows backorders; a
 *                                   dangling pool id is never purchasable
 *   - otherwise                   → the product's own unreserved stock
 */
export function canCheckoutOne(
  product: RestockProduct,
  variant: RestockVariant | null,
): boolean {
  if (!product.published) return false;
  if (parseCardAdditionalFields(product.additionalFields).comingSoon)
    return false;

  if (variant) return variantAcceptsOne(product, variant);
  if (product.variants.length > 0) {
    return product.variants.some((v) => variantAcceptsOne(product, v));
  }

  if (product.baseInventoryUnitId) {
    const pool = product.baseInventoryUnit;
    if (!pool) return false;
    if (pool.allowBackorders) return true;
    return (
      pool.inventoryQty - pool.reservedQty >= (product.baseUnitsConsumed ?? 1)
    );
  }

  if (!product.trackInventory || product.allowBackorders) return true;
  return product.inventoryQty - product.reservedQty >= 1;
}
