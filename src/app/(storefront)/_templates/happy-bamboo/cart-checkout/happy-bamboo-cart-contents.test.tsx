import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CartItem } from "~/providers/cart-context";

import { HappyBambooCartContents } from "./happy-bamboo-cart-contents";

/**
 * Regression test for a cart-row key bug: two variants of the same product
 * were keyed by `productId` alone, so React saw duplicate keys and warned
 * (and could misrender on reorder/removal). The row key must also include
 * the variant.
 */
const items: CartItem[] = [
  {
    productId: "prod_1",
    variantId: "var_lavender",
    productName: "Candle",
    variantName: "Lavender",
    price: 1000,
    quantity: 1,
    imageUrl: null,
    sku: "SKU-1",
  },
  {
    productId: "prod_1",
    variantId: "var_cedar",
    productName: "Candle",
    variantName: "Cedar",
    price: 1000,
    quantity: 1,
    imageUrl: null,
    sku: "SKU-2",
  },
];

vi.mock("~/providers/cart-context", () => ({
  useCart: () => ({
    items,
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    subtotal: 2000,
    itemCount: 2,
    setIsOpen: vi.fn(),
  }),
}));

const business = {
  id: "biz_1",
  shippingType: "flat",
  shippingFlatRate: 0,
  freeShippingThreshold: null,
  offersInStorePickup: false,
  siteContent: { primaryColor: null },
};

describe("HappyBambooCartContents", () => {
  it("renders both variants of the same product without a duplicate-key warning", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(<HappyBambooCartContents business={business} cartEmptyText="" />);

    expect(screen.getByText(/Lavender/)).toBeInTheDocument();
    expect(screen.getByText(/Cedar/)).toBeInTheDocument();

    const duplicateKeyWarning = errorSpy.mock.calls.some((call) =>
      String(call[0]).includes("same key"),
    );
    expect(duplicateKeyWarning).toBe(false);

    errorSpy.mockRestore();
  });
});
