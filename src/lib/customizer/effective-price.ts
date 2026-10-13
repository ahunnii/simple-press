import type {
  CustomizerGroupDef,
  CustomizerValueDef,
} from "~/lib/customizer/types";
import {
  CUSTOMIZER_PUBLIC_MAX_QTY_CAP,
  CUSTOMIZER_TEXT_MAX_LENGTH,
} from "~/lib/customizer/types";

/**
 * Per-value derivations shared by the public projection and the evaluator,
 * so the price a shopper sees and the price the server charges can never
 * drift apart.
 */

/**
 * The add-on price of one value, in cents: a linked value costs its
 * override, else its target's (already variant-resolved) price; a standalone
 * value costs its `priceDelta`.
 */
export function effectiveValuePrice(value: CustomizerValueDef): number {
  if (value.linked) return value.priceOverride ?? value.linked.price;
  return value.priceDelta;
}

/**
 * Can this value be picked at all? The owner's toggle, and for a linked
 * value, a live target that is not sold out. (`stock: null` = untracked.)
 */
export function isValueSelectable(value: CustomizerValueDef): boolean {
  if (!value.available) return false;
  if (!value.linked) return true;
  return value.linked.available && value.linked.stock !== 0;
}

/** Public `maxQty`: stock clamped to the cap, `null` when untracked. */
export function publicMaxQty(value: CustomizerValueDef): number | null {
  const stock = value.linked?.stock ?? null;
  if (stock == null) return null;
  return Math.max(0, Math.min(stock, CUSTOMIZER_PUBLIC_MAX_QTY_CAP));
}

/** The effective text limit: the owner's, never above the hard ceiling. */
export function textLimit(group: Pick<CustomizerGroupDef, "maxLength">) {
  const owner = group.maxLength ?? CUSTOMIZER_TEXT_MAX_LENGTH;
  return Math.max(0, Math.min(owner, CUSTOMIZER_TEXT_MAX_LENGTH));
}
