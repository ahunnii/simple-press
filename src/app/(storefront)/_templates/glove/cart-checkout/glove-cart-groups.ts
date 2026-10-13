import type { CartItem } from "~/providers/cart-context";
import { cartLineKey, isConfiguredLine } from "~/providers/cart-context";

/**
 * One top-level cart line plus the LEGACY add-ons (chains, charms added as
 * separate `addOnFor` lines) picked for it. A configured line (product
 * options) carries its picks on the line itself and never has nested
 * add-ons; its row shows them with `<CartLineOptions>`.
 */
export type GloveCartGroup = {
  item: CartItem;
  addOns: CartItem[];
  /** The line's own total plus every add-on's. */
  total: number;
};

/**
 * Nest legacy add-on lines under the plain glove they were picked for, in
 * cart order. An add-on whose glove has left the cart (removed on its own, or
 * dropped as unavailable at checkout) stays a top-level line rather than
 * disappearing. Configured lines are always top-level and never adopt
 * add-ons, even from a plain line of the same variant sitting beside them.
 *
 * TODO: drop the nesting with the legacy add-on path (plan Phase 6,
 * ~/.claude/plans/i-need-to-add-noble-volcano.md); configured lines need none.
 */
export function groupGloveCartLines(items: CartItem[]): GloveCartGroup[] {
  const parentKeys = new Set(
    items
      .filter((item) => !item.addOnFor && !isConfiguredLine(item))
      .map((item) => cartLineKey(item.productId, item.variantId)),
  );

  const groups: GloveCartGroup[] = [];
  for (const item of items) {
    if (item.addOnFor && parentKeys.has(item.addOnFor)) continue;
    const key = cartLineKey(item.productId, item.variantId);
    const addOns =
      item.addOnFor || isConfiguredLine(item)
        ? []
        : items.filter((line) => line.addOnFor === key);
    const total = [item, ...addOns].reduce(
      (sum, line) => sum + line.price * line.quantity,
      0,
    );
    groups.push({ item, addOns, total });
  }
  return groups;
}
