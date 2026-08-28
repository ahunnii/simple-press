import { describe, expect, it } from "vitest";

import { resolveVariantPrice } from "~/lib/variant-price";

import {
  computeSubscriptionQuote,
  getSubscriptionOffer,
  SubscriptionPricingError,
} from "./pricing";

describe("computeSubscriptionQuote", () => {
  it("computes with no discount", () => {
    expect(
      computeSubscriptionQuote({
        listPriceCents: 1000,
        discountPercent: 0,
        quantity: 1,
        shippingCents: 0,
      }),
    ).toEqual({
      unitAmountCents: 1000,
      itemsCents: 1000,
      shippingCents: 0,
      perDeliveryCents: 1000,
      savingsCents: 0,
    });
  });

  it("defaults discountPercent to 0 when omitted", () => {
    const withDefault = computeSubscriptionQuote({
      listPriceCents: 1000,
      quantity: 1,
      shippingCents: 0,
    });
    const withExplicitZero = computeSubscriptionQuote({
      listPriceCents: 1000,
      discountPercent: 0,
      quantity: 1,
      shippingCents: 0,
    });
    expect(withDefault).toEqual(withExplicitZero);
  });

  it("rounds 10% off 1999 to 1799 (exact division, no rounding needed)", () => {
    const quote = computeSubscriptionQuote({
      listPriceCents: 1999,
      discountPercent: 10,
      quantity: 1,
      shippingCents: 0,
    });
    expect(quote.unitAmountCents).toBe(1799);
  });

  it("rounds 15% off 1999 (1699.15) down to 1699", () => {
    const quote = computeSubscriptionQuote({
      listPriceCents: 1999,
      discountPercent: 15,
      quantity: 1,
      shippingCents: 0,
    });
    expect(quote.unitAmountCents).toBe(1699);
  });

  it("computes savingsCents as (listPriceCents - unitAmountCents) * quantity", () => {
    const quote = computeSubscriptionQuote({
      listPriceCents: 1999,
      discountPercent: 15,
      quantity: 2,
      shippingCents: 0,
    });
    // unitAmountCents = 1699, savings per unit = 300, qty 2 => 600
    expect(quote.unitAmountCents).toBe(1699);
    expect(quote.savingsCents).toBe(600);
  });

  it("multiplies unitAmountCents by quantity for itemsCents (qty 3)", () => {
    const quote = computeSubscriptionQuote({
      listPriceCents: 1000,
      discountPercent: 0,
      quantity: 3,
      shippingCents: 500,
    });
    expect(quote).toEqual({
      unitAmountCents: 1000,
      itemsCents: 3000,
      shippingCents: 500,
      perDeliveryCents: 3500,
      savingsCents: 0,
    });
  });

  it("perDeliveryCents is itemsCents when shippingCents is 0", () => {
    const quote = computeSubscriptionQuote({
      listPriceCents: 2000,
      discountPercent: 0,
      quantity: 1,
      shippingCents: 0,
    });
    expect(quote.perDeliveryCents).toBe(quote.itemsCents);
    expect(quote.perDeliveryCents).toBe(2000);
  });

  it("perDeliveryCents adds shippingCents of 799", () => {
    const quote = computeSubscriptionQuote({
      listPriceCents: 2000,
      discountPercent: 0,
      quantity: 1,
      shippingCents: 799,
    });
    expect(quote.perDeliveryCents).toBe(2799);
  });

  describe("$0.50 Stripe minimum", () => {
    it("throws SubscriptionPricingError(code: 'below_minimum') when itemsCents < 50", () => {
      expect(() =>
        computeSubscriptionQuote({
          listPriceCents: 40,
          discountPercent: 0,
          quantity: 1,
          shippingCents: 0,
        }),
      ).toThrow(SubscriptionPricingError);

      try {
        computeSubscriptionQuote({
          listPriceCents: 40,
          discountPercent: 0,
          quantity: 1,
          shippingCents: 0,
        });
        throw new Error("expected computeSubscriptionQuote to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(SubscriptionPricingError);
        expect((err as SubscriptionPricingError).code).toBe("below_minimum");
      }
    });

    it("throws below_minimum when itemsCents is exactly 49", () => {
      expect(() =>
        computeSubscriptionQuote({
          listPriceCents: 49,
          discountPercent: 0,
          quantity: 1,
          shippingCents: 0,
        }),
      ).toThrow(SubscriptionPricingError);
    });

    it("does NOT throw when itemsCents is exactly 50 (the floor is inclusive)", () => {
      expect(() =>
        computeSubscriptionQuote({
          listPriceCents: 50,
          discountPercent: 0,
          quantity: 1,
          shippingCents: 0,
        }),
      ).not.toThrow();
    });

    it("below_minimum is judged on itemsCents, not perDeliveryCents — shipping cannot rescue a too-small item total", () => {
      expect(() =>
        computeSubscriptionQuote({
          listPriceCents: 40,
          discountPercent: 0,
          quantity: 1,
          shippingCents: 5000,
        }),
      ).toThrow(SubscriptionPricingError);
    });
  });

  describe("invalid_input", () => {
    const base = {
      listPriceCents: 1000,
      discountPercent: 0,
      quantity: 1,
      shippingCents: 0,
    };

    function expectInvalidInput(overrides: Partial<typeof base>) {
      let thrown: unknown;
      try {
        computeSubscriptionQuote({ ...base, ...overrides });
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(SubscriptionPricingError);
      expect((thrown as SubscriptionPricingError).code).toBe("invalid_input");
    }

    it("rejects a negative listPriceCents", () => {
      expectInvalidInput({ listPriceCents: -100 });
    });

    it("rejects a non-integer listPriceCents", () => {
      expectInvalidInput({ listPriceCents: 19.5 });
    });

    it("rejects a negative shippingCents", () => {
      expectInvalidInput({ shippingCents: -1 });
    });

    it("rejects a non-integer shippingCents", () => {
      expectInvalidInput({ shippingCents: 4.2 });
    });

    it("rejects quantity < 1 (zero)", () => {
      expectInvalidInput({ quantity: 0 });
    });

    it("rejects quantity < 1 (negative)", () => {
      expectInvalidInput({ quantity: -1 });
    });

    it("rejects a non-integer quantity", () => {
      expectInvalidInput({ quantity: 1.5 });
    });

    it("rejects discountPercent below 0", () => {
      expectInvalidInput({ discountPercent: -1 });
    });

    it("rejects discountPercent above 90", () => {
      expectInvalidInput({ discountPercent: 91 });
    });

    it("accepts discountPercent of exactly 90 (upper bound is inclusive)", () => {
      expect(() =>
        computeSubscriptionQuote({ ...base, discountPercent: 90 }),
      ).not.toThrow();
    });

    it("accepts discountPercent of exactly 0 (lower bound is inclusive)", () => {
      expect(() =>
        computeSubscriptionQuote({ ...base, discountPercent: 0 }),
      ).not.toThrow();
    });
  });
});

describe("getSubscriptionOffer", () => {
  const baseProduct = {
    price: 1000,
    subscriptionEnabled: true,
    subscriptionIntervals: ["week:1", "month:1"] as unknown,
    subscriptionDiscountPercent: 10,
    variants: [] as Array<{ id: string; price: number | null }>,
  };

  it("is enabled with the parsed intervals and discount when the product opts in", () => {
    const offer = getSubscriptionOffer(baseProduct, null);
    expect(offer).toEqual({
      enabled: true,
      intervals: ["week:1", "month:1"],
      discountPercent: 10,
      listPriceCents: 1000,
    });
  });

  it("is disabled when subscriptionEnabled is false, even with valid intervals", () => {
    const offer = getSubscriptionOffer(
      { ...baseProduct, subscriptionEnabled: false },
      null,
    );
    expect(offer.enabled).toBe(false);
  });

  it("is disabled when subscriptionIntervals parses to an empty list", () => {
    const offer = getSubscriptionOffer(
      { ...baseProduct, subscriptionIntervals: [] },
      null,
    );
    expect(offer.enabled).toBe(false);
  });

  it("is disabled when subscriptionIntervals is malformed (parses to [])", () => {
    const offer = getSubscriptionOffer(
      { ...baseProduct, subscriptionIntervals: "not-an-array" },
      null,
    );
    expect(offer.enabled).toBe(false);
  });

  it("drops unknown interval keys and orders by catalog order, not input order", () => {
    const offer = getSubscriptionOffer(
      { ...baseProduct, subscriptionIntervals: ["month:2", "bogus", "week:1"] },
      null,
    );
    expect(offer.intervals).toEqual(["week:1", "month:2"]);
  });

  it("uses the product price when variantId is null", () => {
    const offer = getSubscriptionOffer(
      {
        ...baseProduct,
        price: 1234,
        variants: [{ id: "v1", price: 999 }],
      },
      null,
    );
    expect(offer.listPriceCents).toBe(1234);
  });

  it("uses the product price when variantId does not match any variant", () => {
    const offer = getSubscriptionOffer(
      {
        ...baseProduct,
        price: 1234,
        variants: [{ id: "v1", price: 999 }],
      },
      "unknown-variant",
    );
    expect(offer.listPriceCents).toBe(1234);
  });

  it("uses resolveVariantPrice(variant.price, product.price) when the variant is found (non-zero price)", () => {
    const offer = getSubscriptionOffer(
      {
        ...baseProduct,
        price: 1000,
        variants: [{ id: "v1", price: 500 }],
      },
      "v1",
    );
    expect(offer.listPriceCents).toBe(resolveVariantPrice(500, 1000));
    expect(offer.listPriceCents).toBe(500);
  });

  it("inherits the product price when the matched variant's price is null", () => {
    const offer = getSubscriptionOffer(
      {
        ...baseProduct,
        price: 1200,
        variants: [{ id: "v2", price: null }],
      },
      "v2",
    );
    expect(offer.listPriceCents).toBe(resolveVariantPrice(null, 1200));
    expect(offer.listPriceCents).toBe(1200);
  });

  it("inherits the product price when the matched variant's price is 0", () => {
    const offer = getSubscriptionOffer(
      {
        ...baseProduct,
        price: 800,
        variants: [{ id: "v3", price: 0 }],
      },
      "v3",
    );
    expect(offer.listPriceCents).toBe(resolveVariantPrice(0, 800));
    expect(offer.listPriceCents).toBe(800);
  });

  it("passes discountPercent through unchanged", () => {
    const offer = getSubscriptionOffer(
      { ...baseProduct, subscriptionDiscountPercent: 25 },
      null,
    );
    expect(offer.discountPercent).toBe(25);
  });
});
