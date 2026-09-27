import { describe, expect, it } from "vitest";

import {
  SLEDGE_CART_REASSURANCE_DEFAULT_ROWS,
  SLEDGE_CART_REASSURANCE_DEFAULTS,
  SLEDGE_CART_REASSURANCE_KEY,
  SLEDGE_CHECKOUT_REASSURANCE_DEFAULT_ROWS,
  SLEDGE_CHECKOUT_REASSURANCE_DEFAULTS,
  SLEDGE_CHECKOUT_REASSURANCE_KEY,
  SLEDGE_CONFIRMATION_NOTES_DEFAULT_ROWS,
  SLEDGE_CONFIRMATION_NOTES_DEFAULTS,
  SLEDGE_CONFIRMATION_NOTES_KEY,
  sledgeCartData,
} from "./cart-checkout/cart-fields";
import {
  resolveSledgeTextList,
  type SledgeTextRow,
} from "./cart-checkout/text-list";

/**
 * Regression test for the sledge cart/checkout/confirmation text-list fields'
 * built-in fallback rows. The expected values below are the exact pre-migration
 * built-in rows, copied verbatim from cart-fields.ts — so this test proves
 * the storefront output is byte-for-byte identical before, during, and after
 * any refactor.
 */

describe("sledge list-field defaults (cart, checkout, confirmation)", () => {
  it("SLEDGE_CART_REASSURANCE_DEFAULTS constant matches the pre-migration copy", () => {
    expect(SLEDGE_CART_REASSURANCE_DEFAULTS).toEqual([
      "Free shipping on qualifying orders",
      "Each piece handcrafted with care",
      "All sales final — order what you love",
    ]);
  });

  it("SLEDGE_CHECKOUT_REASSURANCE_DEFAULTS constant matches the pre-migration copy", () => {
    expect(SLEDGE_CHECKOUT_REASSURANCE_DEFAULTS).toEqual([
      "Each piece handcrafted with care",
      "All sales final — order what you love",
    ]);
  });

  it("SLEDGE_CONFIRMATION_NOTES_DEFAULTS constant matches the pre-migration copy", () => {
    expect(SLEDGE_CONFIRMATION_NOTES_DEFAULTS).toEqual([
      "Each piece is handcrafted with care before it ships.",
      "All sales are final — thank you for supporting the studio.",
    ]);
  });

  it("resolveSledgeTextList for cart reassurance resolves undefined to defaults", () => {
    const result = resolveSledgeTextList(
      undefined,
      SLEDGE_CART_REASSURANCE_KEY,
      SLEDGE_CART_REASSURANCE_DEFAULTS,
    );
    expect(result).toEqual<SledgeTextRow[]>([
      { text: "Free shipping on qualifying orders", index: 0 },
      { text: "Each piece handcrafted with care", index: 1 },
      { text: "All sales final — order what you love", index: 2 },
    ]);
  });

  it("resolveSledgeTextList for cart reassurance resolves {} to defaults", () => {
    const result = resolveSledgeTextList(
      {},
      SLEDGE_CART_REASSURANCE_KEY,
      SLEDGE_CART_REASSURANCE_DEFAULTS,
    );
    expect(result).toEqual<SledgeTextRow[]>([
      { text: "Free shipping on qualifying orders", index: 0 },
      { text: "Each piece handcrafted with care", index: 1 },
      { text: "All sales final — order what you love", index: 2 },
    ]);
  });

  it("resolveSledgeTextList for cart reassurance resolves empty array to defaults", () => {
    const result = resolveSledgeTextList(
      { [SLEDGE_CART_REASSURANCE_KEY]: [] },
      SLEDGE_CART_REASSURANCE_KEY,
      SLEDGE_CART_REASSURANCE_DEFAULTS,
    );
    expect(result).toEqual<SledgeTextRow[]>([
      { text: "Free shipping on qualifying orders", index: 0 },
      { text: "Each piece handcrafted with care", index: 1 },
      { text: "All sales final — order what you love", index: 2 },
    ]);
  });

  it("resolveSledgeTextList for cart reassurance resolves custom list", () => {
    const result = resolveSledgeTextList(
      { [SLEDGE_CART_REASSURANCE_KEY]: [{ text: "Custom" }] },
      SLEDGE_CART_REASSURANCE_KEY,
      SLEDGE_CART_REASSURANCE_DEFAULTS,
    );
    expect(result).toEqual<SledgeTextRow[]>([
      { text: "Custom", index: 0 },
    ]);
  });

  it("resolveSledgeTextList for checkout reassurance resolves undefined to defaults", () => {
    const result = resolveSledgeTextList(
      undefined,
      SLEDGE_CHECKOUT_REASSURANCE_KEY,
      SLEDGE_CHECKOUT_REASSURANCE_DEFAULTS,
    );
    expect(result).toEqual<SledgeTextRow[]>([
      { text: "Each piece handcrafted with care", index: 0 },
      { text: "All sales final — order what you love", index: 1 },
    ]);
  });

  it("resolveSledgeTextList for checkout reassurance resolves {} to defaults", () => {
    const result = resolveSledgeTextList(
      {},
      SLEDGE_CHECKOUT_REASSURANCE_KEY,
      SLEDGE_CHECKOUT_REASSURANCE_DEFAULTS,
    );
    expect(result).toEqual<SledgeTextRow[]>([
      { text: "Each piece handcrafted with care", index: 0 },
      { text: "All sales final — order what you love", index: 1 },
    ]);
  });

  it("resolveSledgeTextList for checkout reassurance resolves empty array (via cart key) to defaults", () => {
    const result = resolveSledgeTextList(
      { [SLEDGE_CART_REASSURANCE_KEY]: [] },
      SLEDGE_CHECKOUT_REASSURANCE_KEY,
      SLEDGE_CHECKOUT_REASSURANCE_DEFAULTS,
    );
    expect(result).toEqual<SledgeTextRow[]>([
      { text: "Each piece handcrafted with care", index: 0 },
      { text: "All sales final — order what you love", index: 1 },
    ]);
  });

  it("resolveSledgeTextList for checkout reassurance resolves empty array (via future checkout key) to defaults", () => {
    const result = resolveSledgeTextList(
      { "sledge.checkout.reassurance-lines": [] },
      SLEDGE_CHECKOUT_REASSURANCE_KEY,
      SLEDGE_CHECKOUT_REASSURANCE_DEFAULTS,
    );
    expect(result).toEqual<SledgeTextRow[]>([
      { text: "Each piece handcrafted with care", index: 0 },
      { text: "All sales final — order what you love", index: 1 },
    ]);
  });

  it("resolveSledgeTextList for confirmation notes resolves undefined to defaults", () => {
    const result = resolveSledgeTextList(
      undefined,
      SLEDGE_CONFIRMATION_NOTES_KEY,
      SLEDGE_CONFIRMATION_NOTES_DEFAULTS,
    );
    expect(result).toEqual<SledgeTextRow[]>([
      { text: "Each piece is handcrafted with care before it ships.", index: 0 },
      { text: "All sales are final — thank you for supporting the studio.", index: 1 },
    ]);
  });

  it("resolveSledgeTextList for confirmation notes resolves {} to defaults", () => {
    const result = resolveSledgeTextList(
      {},
      SLEDGE_CONFIRMATION_NOTES_KEY,
      SLEDGE_CONFIRMATION_NOTES_DEFAULTS,
    );
    expect(result).toEqual<SledgeTextRow[]>([
      { text: "Each piece is handcrafted with care before it ships.", index: 0 },
      { text: "All sales are final — thank you for supporting the studio.", index: 1 },
    ]);
  });

  it("resolveSledgeTextList for confirmation notes resolves empty array to defaults", () => {
    const result = resolveSledgeTextList(
      { [SLEDGE_CONFIRMATION_NOTES_KEY]: [] },
      SLEDGE_CONFIRMATION_NOTES_KEY,
      SLEDGE_CONFIRMATION_NOTES_DEFAULTS,
    );
    expect(result).toEqual<SledgeTextRow[]>([
      { text: "Each piece is handcrafted with care before it ships.", index: 0 },
      { text: "All sales are final — thank you for supporting the studio.", index: 1 },
    ]);
  });
});

describe("sledge list fields' defaultRows match the built-in text defaults", () => {
  function defaultRowsOf(key: string): Record<string, string>[] {
    const field = sledgeCartData.find((f) => f.key === key);
    if (!field || field.type !== "list") {
      throw new Error(`Expected a list field for key "${key}"`);
    }
    return field.defaultRows ?? [];
  }

  it("sledge.cart.reassurance-lines defaultRows match SLEDGE_CART_REASSURANCE_DEFAULT_ROWS", () => {
    expect(defaultRowsOf(SLEDGE_CART_REASSURANCE_KEY)).toEqual(
      SLEDGE_CART_REASSURANCE_DEFAULT_ROWS,
    );
  });

  it("sledge.checkout.reassurance-lines defaultRows match SLEDGE_CHECKOUT_REASSURANCE_DEFAULT_ROWS", () => {
    expect(defaultRowsOf(SLEDGE_CHECKOUT_REASSURANCE_KEY)).toEqual(
      SLEDGE_CHECKOUT_REASSURANCE_DEFAULT_ROWS,
    );
  });

  it("sledge.checkout.confirmation-notes defaultRows match SLEDGE_CONFIRMATION_NOTES_DEFAULT_ROWS", () => {
    expect(defaultRowsOf(SLEDGE_CONFIRMATION_NOTES_KEY)).toEqual(
      SLEDGE_CONFIRMATION_NOTES_DEFAULT_ROWS,
    );
  });
});
