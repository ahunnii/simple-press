import { describe, expect, it } from "vitest";

import type { CartItem } from "~/providers/cart-context";
import { cartLineKey } from "~/providers/cart-context";

import { groupGloveCartLines } from "./glove-cart-groups";

function line(
  productId: string,
  variantId: string | null,
  price: number,
  extra: Partial<CartItem> = {},
): CartItem {
  return {
    productId,
    variantId,
    productName: productId,
    variantName: null,
    price,
    quantity: 1,
    imageUrl: null,
    sku: null,
    ...extra,
  };
}

describe("groupGloveCartLines", () => {
  const A = cartLineKey("glove", "purple");
  const B = cartLineKey("glove", "black");

  it("nests add-ons under their glove with a group total", () => {
    const groups = groupGloveCartLines([
      line("glove", "purple", 16000),
      line("chain", null, 2500, { addOnFor: A }),
      line("glove", "black", 16000),
      line("charm", null, 3500, { addOnFor: A, quantity: 2 }),
      line("chain", null, 2500, { addOnFor: B }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.addOns.map((a) => a.productId)).toEqual([
      "chain",
      "charm",
    ]);
    expect(groups[0]?.total).toBe(16000 + 2500 + 7000);
    expect(groups[1]?.item.variantId).toBe("black");
    expect(groups[1]?.addOns.map((a) => a.productId)).toEqual(["chain"]);
  });

  it("keeps an add-on whose glove left the cart as its own line", () => {
    const groups = groupGloveCartLines([
      line("chain", null, 2500, { addOnFor: A }),
      line("bag", null, 4000),
    ]);
    expect(groups.map((g) => g.item.productId)).toEqual(["chain", "bag"]);
    expect(groups.every((g) => g.addOns.length === 0)).toBe(true);
  });

  it("does not attach a standalone line of the same product", () => {
    const groups = groupGloveCartLines([
      line("glove", "purple", 16000),
      line("chain", null, 2500),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.addOns).toEqual([]);
  });
});
