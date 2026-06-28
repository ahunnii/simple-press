import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import type {
  CartLineItem,
  PoolAvailability,
  ProductAvailability,
  VariantAvailability,
} from "./types";

import { computeSubtotalCents } from "./pricing";
import { resolveCheckoutShipping, shouldPinPaymentIntentShipping } from "./shipping";
import { checkCartAvailability, computePoolDemand } from "./validate-cart";

function makeItem(overrides: Partial<CartLineItem> = {}): CartLineItem {
  return {
    productId: "p1",
    variantId: null,
    productName: "Widget",
    variantName: null,
    quantity: 1,
    ...overrides,
  };
}

function makeProduct(
  overrides: Partial<ProductAvailability> = {},
): ProductAvailability {
  return {
    price: 1_000,
    published: true,
    trackInventory: true,
    allowBackorders: false,
    inventoryQty: 10,
    reservedQty: 0,
    additionalFields: null,
    baseInventoryUnitId: null,
    baseUnitsConsumed: null,
    _count: { variants: 0 },
    ...overrides,
  };
}

function makeVariant(
  overrides: Partial<VariantAvailability> = {},
): VariantAvailability {
  return {
    price: 500,
    inventoryQty: 10,
    reservedQty: 0,
    product: {
      published: true,
      trackInventory: true,
      allowBackorders: false,
      additionalFields: null,
    },
    ...overrides,
  };
}

describe("computeSubtotalCents", () => {
  it("sums server-side prices times quantity (variant price overrides product)", () => {
    const items = [
      makeItem({ productId: "p1", quantity: 2 }),
      makeItem({ productId: "p2", variantId: "v1", quantity: 3 }),
    ];
    const productMap = new Map([
      ["p1", makeProduct({ price: 1_000 })],
      // Product price here is intentionally different from the variant price to
      // prove the variant price wins for variant lines.
      ["p2", makeProduct({ price: 9_999 })],
    ]);
    const variantMap = new Map([["v1", makeVariant({ price: 500 })]]);

    // 1000*2 + 500*3 = 3500. There is no client-supplied price in the input at
    // all — the helper structurally cannot trust the client.
    expect(computeSubtotalCents(items, variantMap, productMap)).toBe(3_500);
  });

  it("treats a missing product/variant as price 0", () => {
    const items = [makeItem({ productId: "ghost", quantity: 5 })];
    expect(computeSubtotalCents(items, new Map(), new Map())).toBe(0);
  });
});

describe("checkCartAvailability", () => {
  const noPools = {
    poolDemand: new Map<string, number>(),
    poolMap: new Map<string, PoolAvailability>(),
  };

  it("accepts an in-stock, published product", () => {
    const result = checkCartAvailability({
      items: [makeItem()],
      variantMap: new Map(),
      productMap: new Map([["p1", makeProduct()]]),
      ...noPools,
    });
    expect(result.unavailableItems).toEqual([]);
    expect(result.unavailableItemIds).toEqual([]);
  });

  it("rejects an unpublished product", () => {
    const result = checkCartAvailability({
      items: [makeItem()],
      variantMap: new Map(),
      productMap: new Map([["p1", makeProduct({ published: false })]]),
      ...noPools,
    });
    expect(result.unavailableItemIds).toEqual([
      { productId: "p1", variantId: null },
    ]);
  });

  it("rejects a comingSoon product even with inventory", () => {
    const result = checkCartAvailability({
      items: [makeItem()],
      variantMap: new Map(),
      productMap: new Map([
        ["p1", makeProduct({ additionalFields: { comingSoon: true } })],
      ]),
      ...noPools,
    });
    expect(result.unavailableItemIds).toEqual([
      { productId: "p1", variantId: null },
    ]);
  });

  it("rejects an out-of-stock product (tracked, no backorders)", () => {
    const result = checkCartAvailability({
      items: [makeItem({ quantity: 5 })],
      variantMap: new Map(),
      productMap: new Map([
        ["p1", makeProduct({ inventoryQty: 3, reservedQty: 0 })],
      ]),
      ...noPools,
    });
    expect(result.unavailableItemIds).toEqual([
      { productId: "p1", variantId: null },
    ]);
  });

  it("allows an oversold product when backorders are enabled", () => {
    const result = checkCartAvailability({
      items: [makeItem({ quantity: 5 })],
      variantMap: new Map(),
      productMap: new Map([
        ["p1", makeProduct({ inventoryQty: 0, allowBackorders: true })],
      ]),
      ...noPools,
    });
    expect(result.unavailableItems).toEqual([]);
  });

  it("rejects a bare product id for a product that has variants", () => {
    const result = checkCartAvailability({
      items: [makeItem()],
      variantMap: new Map(),
      productMap: new Map([["p1", makeProduct({ _count: { variants: 2 } })]]),
      ...noPools,
    });
    expect(result.unavailableItemIds).toEqual([
      { productId: "p1", variantId: null },
    ]);
  });

  it("rejects a pool-backed product when aggregate demand exceeds the pool", () => {
    const items = [makeItem({ productId: "p1", quantity: 3 })];
    const productMap = new Map([
      [
        "p1",
        makeProduct({ baseInventoryUnitId: "pool1", baseUnitsConsumed: 2 }),
      ],
    ]);
    // demand = 2 units * qty 3 = 6; pool only has 5 available.
    const poolDemand = computePoolDemand(items, productMap);
    expect(poolDemand.get("pool1")).toBe(6);

    const result = checkCartAvailability({
      items,
      variantMap: new Map(),
      productMap,
      poolDemand,
      poolMap: new Map([
        ["pool1", { inventoryQty: 5, reservedQty: 0, allowBackorders: false }],
      ]),
    });
    expect(result.unavailableItemIds).toEqual([
      { productId: "p1", variantId: null },
    ]);
  });
});

describe("resolveCheckoutShipping", () => {
  it("prefers shipping collected on the Checkout session", () => {
    const session = {
      collected_information: {
        shipping_details: {
          name: "Ada Lovelace",
          address: {
            line1: "1 Analytical Way",
            line2: null,
            city: "London",
            state: "LDN",
            postal_code: "EC1",
            country: "GB",
          },
        },
      },
      customer_details: { phone: "+15551234567", name: "Ada", address: null },
      payment_intent: null,
      metadata: {},
    } as unknown as Stripe.Checkout.Session;

    expect(resolveCheckoutShipping(session)).toMatchObject({
      addressLine1: "1 Analytical Way",
      city: "London",
      province: "LDN",
      zip: "EC1",
      country: "GB",
      phone: "+15551234567",
      nameForAddress: "Ada Lovelace",
    });
  });

  it("falls back to session metadata (storefront pre-filled address)", () => {
    const session = {
      collected_information: null,
      customer_details: null,
      payment_intent: null,
      metadata: {
        shippingLine1: "742 Evergreen Terrace",
        shippingCity: "Springfield",
        shippingState: "IL",
        shippingPostalCode: "62704",
        shippingCountry: "US",
        shippingPhone: "+15550001111",
        customerName: "Homer",
      },
    } as unknown as Stripe.Checkout.Session;

    expect(resolveCheckoutShipping(session)).toMatchObject({
      addressLine1: "742 Evergreen Terrace",
      city: "Springfield",
      country: "US",
      nameForAddress: "Homer",
    });
  });

  it("returns empty fields when nothing is present", () => {
    const session = {
      collected_information: null,
      customer_details: null,
      payment_intent: null,
      metadata: {},
    } as unknown as Stripe.Checkout.Session;

    expect(resolveCheckoutShipping(session)).toEqual({
      addressLine1: null,
      addressLine2: null,
      city: "",
      province: "",
      zip: "",
      country: "",
      phone: null,
      nameForAddress: null,
    });
  });

  // Locked zone_weight flow: no Checkout-collected shipping address. The
  // PaymentIntent shipping (the address we priced and bound) must win over the
  // billing address in customer_details — never ship to the billing address.
  it("prefers payment_intent shipping over the billing address", () => {
    const session = {
      collected_information: null,
      customer_details: {
        phone: "+15551234567",
        name: "Billing Name",
        address: {
          line1: "999 Billing Blvd",
          city: "Billtown",
          state: "NY",
          postal_code: "10001",
          country: "US",
        },
      },
      payment_intent: {
        shipping: {
          name: "Ada Lovelace",
          phone: "+15559998888",
          address: {
            line1: "742 Evergreen Terrace",
            line2: null,
            city: "Springfield",
            state: "IL",
            postal_code: "62704",
            country: "US",
          },
        },
      },
      metadata: {},
    } as unknown as Stripe.Checkout.Session;

    expect(resolveCheckoutShipping(session)).toMatchObject({
      addressLine1: "742 Evergreen Terrace",
      city: "Springfield",
      province: "IL",
      zip: "62704",
      country: "US",
      phone: "+15559998888",
      nameForAddress: "Ada Lovelace",
    });
  });

  it("prefers metadata shipping over the billing address when no PI shipping", () => {
    const session = {
      collected_information: null,
      customer_details: {
        phone: "+15551234567",
        name: "Billing Name",
        address: {
          line1: "999 Billing Blvd",
          city: "Billtown",
          state: "NY",
          postal_code: "10001",
          country: "US",
        },
      },
      payment_intent: null,
      metadata: {
        shippingLine1: "742 Evergreen Terrace",
        shippingCity: "Springfield",
        shippingState: "IL",
        shippingPostalCode: "62704",
        shippingCountry: "US",
        customerName: "Homer",
      },
    } as unknown as Stripe.Checkout.Session;

    expect(resolveCheckoutShipping(session)).toMatchObject({
      addressLine1: "742 Evergreen Terrace",
      province: "IL",
      country: "US",
      nameForAddress: "Homer",
    });
  });

  it("falls back to the billing address only as a last resort", () => {
    const session = {
      collected_information: null,
      customer_details: {
        phone: "+15551234567",
        name: "Billing Name",
        address: {
          line1: "999 Billing Blvd",
          city: "Billtown",
          state: "NY",
          postal_code: "10001",
          country: "US",
        },
      },
      payment_intent: null,
      metadata: {},
    } as unknown as Stripe.Checkout.Session;

    expect(resolveCheckoutShipping(session)).toMatchObject({
      addressLine1: "999 Billing Blvd",
      province: "NY",
      country: "US",
      nameForAddress: "Billing Name",
    });
  });
});

describe("shouldPinPaymentIntentShipping", () => {
  it("returns true when locked, has address, and auto tax is OFF (zone_weight lock preserved)", () => {
    expect(
      shouldPinPaymentIntentShipping({
        lockShippingAddress: true,
        hasShippingAddress: true,
        autoTaxEnabled: false,
      }),
    ).toBe(true);
  });

  it("returns false when locked, has address, and auto tax is ON — THE FIX: Stripe rejects payment_intent_data[shipping] together with automatic_tax", () => {
    // Regression guard: businesses using zone_weight shipping AND stripeAutoTaxEnabled must
    // NOT have payment_intent_data.shipping set, or Stripe returns:
    // "You cannot enable automatic tax calculation with payment_intent_data[shipping] set."
    expect(
      shouldPinPaymentIntentShipping({
        lockShippingAddress: true,
        hasShippingAddress: true,
        autoTaxEnabled: true,
      }),
    ).toBe(false);
  });

  it("returns false when not locked (e.g. flat/free shipping)", () => {
    expect(
      shouldPinPaymentIntentShipping({
        lockShippingAddress: false,
        hasShippingAddress: true,
        autoTaxEnabled: false,
      }),
    ).toBe(false);
  });

  it("returns false when locked but no shipping address is present", () => {
    expect(
      shouldPinPaymentIntentShipping({
        lockShippingAddress: true,
        hasShippingAddress: false,
        autoTaxEnabled: false,
      }),
    ).toBe(false);
  });
});
