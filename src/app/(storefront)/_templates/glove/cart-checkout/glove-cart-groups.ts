import type { CartItem } from "~/providers/cart-context";
import { cartLineKey } from "~/providers/cart-context";

/** One top-level cart line plus the add-ons (chains, charms) picked for it. */
export type GloveCartGroup = {
  item: CartItem;
  addOns: CartItem[];
  /** The line's own total plus every add-on's. */
  total: number;
};

/**
 * Nest add-on lines under the glove they were picked for, in cart order.
 * An add-on whose glove has left the cart (removed on its own, or dropped as
 * unavailable at checkout) stays a top-level line rather than disappearing.
 */
export function groupGloveCartLines(items: CartItem[]): GloveCartGroup[] {
  const parentKeys = new Set(
    items
      .filter((item) => !item.addOnFor)
      .map((item) => cartLineKey(item.productId, item.variantId)),
  );

  const groups: GloveCartGroup[] = [];
  for (const item of items) {
    if (item.addOnFor && parentKeys.has(item.addOnFor)) continue;
    const key = cartLineKey(item.productId, item.variantId);
    const addOns = item.addOnFor
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
