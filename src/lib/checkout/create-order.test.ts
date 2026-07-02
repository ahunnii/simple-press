import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import {
  mapStripeLineItemsToOrderItems,
  parseFreeShippingDiscountCents,
} from "./create-order";

/**
 * Build a minimal fake Stripe.Checkout.Session for testing
 * mapStripeLineItemsToOrderItems. Only the fields the function reads need to
 * be populated.
 */
function makeSession(
  lineItems: Stripe.LineItem[] | null | undefined,
): Stripe.Checkout.Session {
  return {
    line_items: lineItems != null ? { data: lineItems } : undefined,
  } as unknown as Stripe.Checkout.Session;
}

/**
 * Build a minimal fake Stripe.LineItem with product metadata.
 */
function makeLineItem(opts: {
  description?: string;
  quantity?: number | null;
  unitAmount?: number | null;
  amountTotal?: number;
  productMetadata?: Record<string, string>;
  deletedProduct?: boolean;
  noProduct?: boolean;
}): Stripe.LineItem {
  let product: unknown;
  if (opts.noProduct) {
    product = null;
  } else if (opts.deletedProduct) {
    product = { deleted: true, id: "prod_deleted" };
  } else {
    product = {
      id: "prod_test",
      object: "product",
      metadata: opts.productMetadata ?? {},
    };
  }

  return {
    id: "li_test",
    object: "item",
    description: opts.description ?? "Test Product",
    quantity: opts.quantity !== undefined ? opts.quantity : 1,
    amount_total: opts.amountTotal ?? 1000,
    price: {
      id: "price_test",
      unit_amount: opts.unitAmount !== undefined ? opts.unitAmount : 1000,
      product,
    },
  } as unknown as Stripe.LineItem;
}

describe("mapStripeLineItemsToOrderItems", () => {
  it("maps a normal line item with full product metadata", () => {
    const session = makeSession([
      makeLineItem({
        description: "Blue Widget",
        quantity: 2,
        unitAmount: 500,
        amountTotal: 1000,
        productMetadata: {
          productId: " prod-123 ",
          productVariantId: " var-456 ",
          variantName: " Blue ",
          sku: " SKU-001 ",
        },
      }),
    ]);

    const items = mapStripeLineItemsToOrderItems(session);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      productName: "Blue Widget",
      variantName: "Blue",
      sku: "SKU-001",
      productId: "prod-123",
      productVariantId: "var-456",
      quantity: 2,
      price: 500,
      total: 1000,
    });
  });

  it("returns [] when line_items is absent (no expand)", () => {
    const session = makeSession(undefined);
    expect(mapStripeLineItemsToOrderItems(session)).toEqual([]);
  });

  it("returns [] when line_items.data is an empty array", () => {
    const session = makeSession([]);
    expect(mapStripeLineItemsToOrderItems(session)).toEqual([]);
  });

  it("treats a deleted product object as empty metadata (no productId etc.)", () => {
    const session = makeSession([
      makeLineItem({
        description: "Ghost Product",
        deletedProduct: true,
        unitAmount: 200,
        amountTotal: 200,
      }),
    ]);

    const items = mapStripeLineItemsToOrderItems(session);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productName: "Ghost Product",
      productId: null,
      productVariantId: null,
      variantName: null,
      sku: null,
    });
  });

  it("treats a null/absent product as empty metadata", () => {
    const session = makeSession([makeLineItem({ noProduct: true })]);
    const items = mapStripeLineItemsToOrderItems(session);
    expect(items[0]).toMatchObject({
      productId: null,
      productVariantId: null,
      variantName: null,
      sku: null,
    });
  });

  it("defaults quantity to 1 when null", () => {
    const session = makeSession([makeLineItem({ quantity: null })]);
    expect(mapStripeLineItemsToOrderItems(session)[0]?.quantity).toBe(1);
  });

  it("defaults price to 0 when unit_amount is null", () => {
    const session = makeSession([makeLineItem({ unitAmount: null })]);
    expect(mapStripeLineItemsToOrderItems(session)[0]?.price).toBe(0);
  });

  it("defaults productName to 'Unknown Product' when description is null", () => {
    const session = makeSession([
      {
        id: "li_x",
        object: "item",
        description: null,
        quantity: 1,
        amount_total: 0,
        price: { id: "price_x", unit_amount: 0, product: null },
      } as unknown as Stripe.LineItem,
    ]);
    expect(mapStripeLineItemsToOrderItems(session)[0]?.productName).toBe(
      "Unknown Product",
    );
  });

  it("maps multiple line items independently", () => {
    const session = makeSession([
      makeLineItem({
        description: "Product A",
        quantity: 1,
        unitAmount: 100,
        amountTotal: 100,
        productMetadata: { productId: "pa" },
      }),
      makeLineItem({
        description: "Product B",
        quantity: 3,
        unitAmount: 200,
        amountTotal: 600,
        productMetadata: { productId: "pb" },
      }),
    ]);

    const items = mapStripeLineItemsToOrderItems(session);

    expect(items).toHaveLength(2);
    expect(items[0]?.productId).toBe("pa");
    expect(items[1]?.productId).toBe("pb");
    expect(items[1]?.quantity).toBe(3);
  });
});

describe("parseFreeShippingDiscountCents", () => {
  const withMetadata = (metadata: Record<string, string> | null) =>
    ({ metadata }) as unknown as Stripe.Checkout.Session;

  it("reads the free-shipping discount recorded by create-session", () => {
    expect(
      parseFreeShippingDiscountCents(
        withMetadata({ freeShippingDiscountCents: "799" }),
        withMetadata(null),
      ),
    ).toBe(799);
  });

  it("falls back to the expanded session's metadata", () => {
    expect(
      parseFreeShippingDiscountCents(
        withMetadata(null),
        withMetadata({ freeShippingDiscountCents: "500" }),
      ),
    ).toBe(500);
  });

  it("returns 0 when the metadata key is absent", () => {
    expect(
      parseFreeShippingDiscountCents(withMetadata({}), withMetadata(null)),
    ).toBe(0);
  });

  it("returns 0 for malformed or non-positive values", () => {
    expect(
      parseFreeShippingDiscountCents(
        withMetadata({ freeShippingDiscountCents: "banana" }),
        withMetadata(null),
      ),
    ).toBe(0);
    expect(
      parseFreeShippingDiscountCents(
        withMetadata({ freeShippingDiscountCents: "-100" }),
        withMetadata(null),
      ),
    ).toBe(0);
  });
});
