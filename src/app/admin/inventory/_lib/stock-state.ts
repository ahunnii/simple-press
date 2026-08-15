/**
 * Stock-state predicates for inventory pools.
 *
 * These live here rather than in `page.tsx` because both halves of the feature
 * need them and they must agree: the server component filters rows with them,
 * and the table colours the quantity cell with them. When `qtyTone` re-derived
 * the same rule inline, the two could drift — and did, on the `<= 0` boundary.
 */

type StockShape = {
  inventoryQty: number;
  lowInventoryThreshold: number | null;
};

/**
 * `<= 0`, not `=== 0`: quantity can go negative. `deductPoolInventory` decrements
 * unconditionally when a pool allows backorders, and store-transfer import can
 * set that flag. A pool at -12 with no threshold is the most broken row in the
 * store, and `=== 0` would hide it from both filters and paint it as normal.
 */
export function isOutOfStock(pool: Pick<StockShape, "inventoryQty">) {
  return pool.inventoryQty <= 0;
}

/**
 * "Low stock" INCLUDES out of stock.
 *
 * An owner picking "Low stock" is asking "what do I need to reorder?", and a pool
 * sitting at zero is the most urgent answer — filtering it out would hide the
 * worst cases from the one filter built to surface them. So out-of-stock is a
 * strict subset of low: widest "needs attention" vs. narrowest "already broken",
 * the same relationship the amber/red quantity colours encode.
 *
 * The threshold is a positive int when set, so `qty <= threshold` already covers
 * zero for every pool that has one. The `isOutOfStock` clause exists for pools
 * with a NULL threshold: those can never be "low" (there is no line to fall
 * below), but they can certainly be out.
 */
export function isLowStock(pool: StockShape) {
  return (
    isOutOfStock(pool) ||
    (pool.lowInventoryThreshold !== null &&
      pool.inventoryQty <= pool.lowInventoryThreshold)
  );
}

type AvailabilityShape = {
  inventoryQty: number;
  reservedQty: number;
};

/**
 * Units actually sellable right now: physical stock minus whatever is held by
 * in-progress checkouts. This is the exact expression `reserveInventory` gates
 * a sale on — `(inventoryQty - reservedQty) >= qty` in
 * `src/lib/inventory/reservation.ts` — so it is the number that decides
 * whether the next unit can actually be sold, not `inventoryQty` on its own.
 */
export function availableQty(pool: AvailabilityShape) {
  return pool.inventoryQty - pool.reservedQty;
}

/**
 * A pool can show a healthy `inventoryQty` — green in the table, absent from
 * both stock filters — and still be completely unsellable if every unit on
 * the shelf is tied up in an active reservation.
 *
 * Deliberately NOT folded into `isOutOfStock`/`isLowStock` above: those answer
 * "how much is physically on the shelf?" and back the "Out of stock" / "Low or
 * out of stock" filter labels, which an owner reads as claims about quantity.
 * This answers a different question — "can the next unit actually be sold?" —
 * and the two can diverge in either direction: a pool can be out-of-stock with
 * zero active reservations, and a pool can carry plenty of `inventoryQty`
 * while being fully reserved. Redefining the stock predicates around
 * availability would silently change what a bookmarked/shared filter URL
 * returns; this stays a separate concept instead.
 *
 * The `!isOutOfStock` guard keeps this mutually exclusive with `isOutOfStock`
 * so callers never juggle two "true"s for the same row: an empty shelf is
 * already flagged there. This flags the shelf that looks fine but has nothing
 * left to sell.
 */
export function isUnavailable(pool: StockShape & AvailabilityShape) {
  return !isOutOfStock(pool) && availableQty(pool) <= 0;
}

/**
 * One sentence, one home — used by the pools table's desktop cell, its mobile
 * reflow, and the pool detail page, so none of the three copies can drift.
 * Mirrors how `oversellMessage` in `pools-table.tsx` solves the same problem
 * for a sentence that appears twice in a single file.
 */
export function unavailableMessage(
  pool: Pick<AvailabilityShape, "inventoryQty">,
) {
  return `${pool.inventoryQty} unit${pool.inventoryQty === 1 ? "" : "s"} in stock, but all of it is reserved by in-progress checkouts — nothing available to sell`;
}
