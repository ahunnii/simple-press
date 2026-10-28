/**
 * Storefront projection of product rows returned by PUBLIC procedures
 * (`product.get` / `getFeatured` / `getRailProducts` / `getRelated`,
 * `collections.getBySlug` / `getProductsByCollectionId`, and the products on
 * `business.getHomepage` / `simplifiedGetWithProducts` / `getWithProducts`).
 *
 * Strips the bookkeeping columns no storefront renders (cost, reservations,
 * low-stock thresholds and alert flags, scheduled publish time) and replaces
 * raw stock with what checkout will actually sell: `inventoryQty` here is
 * `inventoryQty - reservedQty`, clamped at 0 — the same number
 * `validateCart` / `getCartItemsStatus` enforce. The key keeps its name so
 * every template's stock logic ("N available", sold-out pills, quantity caps)
 * reads it unchanged; only the value is the public one.
 *
 * Deliberately KEPT: `sku` and `barcode`. Both are public by design — noise,
 * sledge, pink and glove print the SKU on the page, and `buildProductSchema`
 * emits them as schema.org `sku` / `gtin` for Google merchant listings.
 *
 * Client-safe: no server imports.
 */

/** Product columns never sent to a storefront. */
const PRIVATE_PRODUCT_KEYS = [
  "cost",
  "reservedQty",
  "lowInventoryThreshold",
  "lowInventoryAlertSent",
  "outOfStockAlertSent",
  "scheduledPublishAt",
] as const;

type PrivateProductKey = (typeof PRIVATE_PRODUCT_KEYS)[number];

type StockRow = { inventoryQty: number; reservedQty?: number };

type PublicStockRow<T> = Omit<T, "reservedQty">;

export type PublicProduct<P> = Omit<
  P,
  PrivateProductKey | "variants" | "baseInventoryUnit"
> &
  (P extends { variants: Array<infer V> }
    ? { variants: PublicStockRow<V>[] }
    : unknown) &
  (P extends { baseInventoryUnit: infer B }
    ? { baseInventoryUnit: B extends object ? PublicStockRow<B> : B }
    : unknown);

/** Units checkout will sell right now: on hand minus held reservations, never negative. */
export function sellableQty(row: StockRow): number {
  return Math.max(0, row.inventoryQty - (row.reservedQty ?? 0));
}

function toPublicStock<T extends StockRow>(row: T): PublicStockRow<T> {
  const out: Record<string, unknown> = { ...row };
  delete out.reservedQty;
  out.inventoryQty = sellableQty(row);
  return out as PublicStockRow<T>;
}

export function toPublicProduct<
  P extends StockRow & {
    variants?: StockRow[];
    baseInventoryUnit?: StockRow | null;
  },
>(product: P): PublicProduct<P> {
  const out: Record<string, unknown> = { ...product };
  for (const key of PRIVATE_PRODUCT_KEYS) delete out[key];
  out.inventoryQty = sellableQty(product);
  if (product.variants) out.variants = product.variants.map(toPublicStock);
  if (product.baseInventoryUnit) {
    out.baseInventoryUnit = toPublicStock(product.baseInventoryUnit);
  }
  return out as PublicProduct<P>;
}
