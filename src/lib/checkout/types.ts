/**
 * Minimal structural types the checkout pricing/availability helpers read.
 *
 * These are intentionally a *subset* of the Prisma query shapes used in
 * `create-session/route.ts`. Declaring only the fields the logic actually
 * touches keeps the helpers pure and unit-testable (tests can build small
 * fixtures instead of full Prisma rows), while the richer Prisma results
 * remain assignable via `ReadonlyMap`'s covariance.
 */

/** A cart line as the checkout helpers read it (subset of `checkoutItemSchema`). */
export interface CartLineItem {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
}

/** Fields read off a `ProductVariant` (and its parent product). */
export interface VariantAvailability {
  price: number | null;
  inventoryQty: number;
  reservedQty: number;
  product: {
    price: number;
    published: boolean;
    trackInventory: boolean;
    allowBackorders: boolean;
    additionalFields: unknown;
  };
}

/** Fields read off a `Product` with no variant. */
export interface ProductAvailability {
  price: number | null;
  published: boolean;
  trackInventory: boolean;
  allowBackorders: boolean;
  inventoryQty: number;
  reservedQty: number;
  additionalFields: unknown;
  baseInventoryUnitId: string | null;
  baseUnitsConsumed: number | null;
  _count: { variants: number };
}

/** Fields read off a `BaseInventoryUnit` (shared inventory pool). */
export interface PoolAvailability {
  inventoryQty: number;
  reservedQty: number;
  allowBackorders: boolean;
}

export type VariantMap = ReadonlyMap<string, VariantAvailability>;
export type ProductMap = ReadonlyMap<string, ProductAvailability>;
export type PoolMap = ReadonlyMap<string, PoolAvailability>;
