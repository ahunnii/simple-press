import { describe, expect, it } from "vitest";

import {
  lookupEmailSchema,
  manageTokenSchema,
  productSubscriptionFieldsSchema,
  SUBSCRIPTION_STATUS_FILTER_VALUES,
  SUBSCRIPTION_STATUS_LABELS,
  subscriptionCheckoutBodySchema,
  subscriptionIntervalKeySchema,
} from "./subscription";

describe("subscriptionIntervalKeySchema", () => {
  it.each(["week:1", "week:2", "month:1", "month:2", "month:3"])(
    "accepts %s",
    (key) => {
      expect(subscriptionIntervalKeySchema.safeParse(key).success).toBe(true);
    },
  );

  it("rejects an unknown key", () => {
    expect(subscriptionIntervalKeySchema.safeParse("day:1").success).toBe(
      false,
    );
  });

  it("rejects a non-string value", () => {
    expect(subscriptionIntervalKeySchema.safeParse(42).success).toBe(false);
    expect(subscriptionIntervalKeySchema.safeParse(null).success).toBe(false);
  });
});

describe("productSubscriptionFieldsSchema", () => {
  it("defaults subscriptionEnabled to false when omitted", () => {
    const result = productSubscriptionFieldsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subscriptionEnabled).toBe(false);
    }
  });

  it("defaults subscriptionIntervals to [] when omitted", () => {
    const result = productSubscriptionFieldsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subscriptionIntervals).toEqual([]);
    }
  });

  it("defaults subscriptionDiscountPercent to 0 when omitted", () => {
    const result = productSubscriptionFieldsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subscriptionDiscountPercent).toBe(0);
    }
  });

  it("accepts an explicit subscriptionEnabled: true", () => {
    expect(
      productSubscriptionFieldsSchema.safeParse({ subscriptionEnabled: true })
        .success,
    ).toBe(true);
  });

  it("accepts subscriptionIntervals up to 5 entries", () => {
    expect(
      productSubscriptionFieldsSchema.safeParse({
        subscriptionIntervals: [
          "week:1",
          "week:2",
          "month:1",
          "month:2",
          "month:3",
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects subscriptionIntervals with more than 5 entries", () => {
    expect(
      productSubscriptionFieldsSchema.safeParse({
        subscriptionIntervals: [
          "week:1",
          "week:2",
          "month:1",
          "month:2",
          "month:3",
          "week:1",
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown interval key inside subscriptionIntervals", () => {
    expect(
      productSubscriptionFieldsSchema.safeParse({
        subscriptionIntervals: ["day:1"],
      }).success,
    ).toBe(false);
  });

  describe("subscriptionDiscountPercent", () => {
    it("coerces a numeric string ('12') to a number", () => {
      const result = productSubscriptionFieldsSchema.safeParse({
        subscriptionDiscountPercent: "12",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subscriptionDiscountPercent).toBe(12);
      }
    });

    it("rejects 95 (above the 0..90 range)", () => {
      expect(
        productSubscriptionFieldsSchema.safeParse({
          subscriptionDiscountPercent: 95,
        }).success,
      ).toBe(false);
    });

    it("rejects -1", () => {
      expect(
        productSubscriptionFieldsSchema.safeParse({
          subscriptionDiscountPercent: -1,
        }).success,
      ).toBe(false);
    });

    it("rejects 10.5 (not an integer)", () => {
      expect(
        productSubscriptionFieldsSchema.safeParse({
          subscriptionDiscountPercent: 10.5,
        }).success,
      ).toBe(false);
    });

    it("accepts the boundaries 0 and 90", () => {
      expect(
        productSubscriptionFieldsSchema.safeParse({
          subscriptionDiscountPercent: 0,
        }).success,
      ).toBe(true);
      expect(
        productSubscriptionFieldsSchema.safeParse({
          subscriptionDiscountPercent: 90,
        }).success,
      ).toBe(true);
    });
  });
});

describe("subscriptionCheckoutBodySchema", () => {
  const validAddress = {
    line1: "123 Main St",
    line2: null,
    city: "Detroit",
    state: "MI",
    postalCode: "48201",
    country: "US",
    phone: null,
  };

  const validBody = {
    productId: "prod_1",
    variantId: "var_1",
    intervalKey: "week:1",
    quantity: 2,
    deliveryMethod: "ship",
    customerInfo: {
      email: "shopper@example.com",
      name: "Jane Shopper",
      phone: "313-555-0100",
      shippingAddress: validAddress,
    },
  };

  it("accepts a fully populated valid body", () => {
    expect(subscriptionCheckoutBodySchema.safeParse(validBody).success).toBe(
      true,
    );
  });

  it("rejects an empty productId", () => {
    expect(
      subscriptionCheckoutBodySchema.safeParse({
        ...validBody,
        productId: "",
      }).success,
    ).toBe(false);
  });

  describe("variantId", () => {
    it("is optional (may be omitted)", () => {
      const { variantId: _variantId, ...withoutVariantId } = validBody;
      void _variantId;
      expect(
        subscriptionCheckoutBodySchema.safeParse(withoutVariantId).success,
      ).toBe(true);
    });

    it("may be explicitly null", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          variantId: null,
        }).success,
      ).toBe(true);
    });
  });

  it("rejects an unknown intervalKey", () => {
    expect(
      subscriptionCheckoutBodySchema.safeParse({
        ...validBody,
        intervalKey: "day:1",
      }).success,
    ).toBe(false);
  });

  describe("quantity", () => {
    it("accepts the boundaries 1 and 50", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({ ...validBody, quantity: 1 })
          .success,
      ).toBe(true);
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          quantity: 50,
        }).success,
      ).toBe(true);
    });

    it("rejects 0", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({ ...validBody, quantity: 0 })
          .success,
      ).toBe(false);
    });

    it("rejects 51", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          quantity: 51,
        }).success,
      ).toBe(false);
    });

    it("rejects a non-integer quantity", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          quantity: 2.5,
        }).success,
      ).toBe(false);
    });
  });

  describe("deliveryMethod", () => {
    it("accepts 'ship' and 'pickup'", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          deliveryMethod: "ship",
        }).success,
      ).toBe(true);
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          deliveryMethod: "pickup",
        }).success,
      ).toBe(true);
    });

    it("rejects any other value", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          deliveryMethod: "courier",
        }).success,
      ).toBe(false);
    });
  });

  describe("customerInfo.email", () => {
    it("rejects a malformed email", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: { ...validBody.customerInfo, email: "not-an-email" },
        }).success,
      ).toBe(false);
    });

    // src/lib/validators/checkout.ts's `checkoutCustomerInfoSchema` uses a
    // bare `z.string().email()` with no `.trim()`/`.toLowerCase()`. This
    // schema matches that exactly, so callers get identical behavior on both
    // the one-time and subscription checkout paths.
    it("does not trim surrounding whitespace (matches checkout.ts — a padded email is invalid, not silently trimmed)", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: {
            ...validBody.customerInfo,
            email: " shopper@example.com ",
          },
        }).success,
      ).toBe(false);
    });

    it("does not lowercase the email (matches checkout.ts)", () => {
      const result = subscriptionCheckoutBodySchema.safeParse({
        ...validBody,
        customerInfo: {
          ...validBody.customerInfo,
          email: "Shopper@Example.com",
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customerInfo.email).toBe("Shopper@Example.com");
      }
    });
  });

  describe("customerInfo.name", () => {
    it("rejects an empty name", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: { ...validBody.customerInfo, name: "" },
        }).success,
      ).toBe(false);
    });
  });

  describe("customerInfo.phone", () => {
    it("is optional", () => {
      const { phone: _phone, ...rest } = validBody.customerInfo;
      void _phone;
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: rest,
        }).success,
      ).toBe(true);
    });
  });

  describe("customerInfo.shippingAddress", () => {
    it("is optional (may be omitted)", () => {
      const { shippingAddress: _shippingAddress, ...rest } =
        validBody.customerInfo;
      void _shippingAddress;
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: rest,
        }).success,
      ).toBe(true);
    });

    it("may be explicitly null", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: {
            ...validBody.customerInfo,
            shippingAddress: null,
          },
        }).success,
      ).toBe(true);
    });

    // Same field rules as `checkoutShippingAddressSchema` in checkout.ts
    // (that schema is a private const there, not exported — this schema
    // mirrors its shape rather than importing it).
    it("requires line1", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: {
            ...validBody.customerInfo,
            shippingAddress: { ...validAddress, line1: "" },
          },
        }).success,
      ).toBe(false);
    });

    it("allows line2 to be omitted or null", () => {
      const { line2: _line2, ...addressWithoutLine2 } = validAddress;
      void _line2;
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: {
            ...validBody.customerInfo,
            shippingAddress: addressWithoutLine2,
          },
        }).success,
      ).toBe(true);
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: {
            ...validBody.customerInfo,
            shippingAddress: { ...validAddress, line2: null },
          },
        }).success,
      ).toBe(true);
    });

    it("requires city", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: {
            ...validBody.customerInfo,
            shippingAddress: { ...validAddress, city: "" },
          },
        }).success,
      ).toBe(false);
    });

    it("requires state", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: {
            ...validBody.customerInfo,
            shippingAddress: { ...validAddress, state: "" },
          },
        }).success,
      ).toBe(false);
    });

    it("requires postalCode", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: {
            ...validBody.customerInfo,
            shippingAddress: { ...validAddress, postalCode: "" },
          },
        }).success,
      ).toBe(false);
    });

    it("requires country", () => {
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: {
            ...validBody.customerInfo,
            shippingAddress: { ...validAddress, country: "" },
          },
        }).success,
      ).toBe(false);
    });

    it("allows phone to be omitted or null", () => {
      const { phone: _phone, ...addressWithoutPhone } = validAddress;
      void _phone;
      expect(
        subscriptionCheckoutBodySchema.safeParse({
          ...validBody,
          customerInfo: {
            ...validBody.customerInfo,
            shippingAddress: addressWithoutPhone,
          },
        }).success,
      ).toBe(true);
    });
  });
});

describe("manageTokenSchema", () => {
  it("accepts a non-empty token", () => {
    expect(manageTokenSchema.safeParse({ token: "abc123" }).success).toBe(true);
  });

  it("rejects an empty token", () => {
    expect(manageTokenSchema.safeParse({ token: "" }).success).toBe(false);
  });

  it("rejects a missing token", () => {
    expect(manageTokenSchema.safeParse({}).success).toBe(false);
  });
});

describe("lookupEmailSchema", () => {
  it("accepts a valid email", () => {
    expect(
      lookupEmailSchema.safeParse({ email: "shopper@example.com" }).success,
    ).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(lookupEmailSchema.safeParse({ email: "not-an-email" }).success).toBe(
      false,
    );
  });

  it("rejects a missing email", () => {
    expect(lookupEmailSchema.safeParse({}).success).toBe(false);
  });
});

describe("SUBSCRIPTION_STATUS_FILTER_VALUES", () => {
  it("is exactly ['all','active','past_due','paused','cancelled','incomplete'], in order", () => {
    expect(SUBSCRIPTION_STATUS_FILTER_VALUES).toEqual([
      "all",
      "active",
      "past_due",
      "paused",
      "cancelled",
      "incomplete",
    ]);
  });
});

describe("SUBSCRIPTION_STATUS_LABELS", () => {
  it("has a non-empty label for every real status (excluding the 'all' filter pseudo-value)", () => {
    const realStatuses = SUBSCRIPTION_STATUS_FILTER_VALUES.filter(
      (v) => v !== "all",
    );
    for (const status of realStatuses) {
      const label = (
        SUBSCRIPTION_STATUS_LABELS as Record<string, string | undefined>
      )[status];
      expect(typeof label).toBe("string");
      expect(label?.length).toBeGreaterThan(0);
    }
  });

  it("does not have an 'all' key", () => {
    expect(
      Object.prototype.hasOwnProperty.call(SUBSCRIPTION_STATUS_LABELS, "all"),
    ).toBe(false);
  });
});
