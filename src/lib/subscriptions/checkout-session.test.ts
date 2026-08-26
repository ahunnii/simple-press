import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SubscriptionCheckoutParamsInput } from "./checkout-session";
import { formatCurrency } from "~/lib/utils";

import {
  buildSubscriptionCheckoutParams,
  createSubscriptionCheckoutSession,
} from "./checkout-session";
import { parseSubscriptionMetadata } from "./status";

/**
 * RED (test-first) contract for `src/lib/subscriptions/checkout-session.ts` —
 * the builder for the `mode: "subscription"` Stripe Checkout Session.
 *
 * This is a payment-processor surface, so the assertions are deliberately
 * exact: the primary case pins the ENTIRE parameter object as an inline
 * literal (not `toMatchSnapshot`, so a diff shows up in review rather than in
 * a regenerated `.snap`), and the forbidden-key tests use
 * `not.toHaveProperty` rather than `toEqual` because `toEqual` treats a key
 * present with the value `undefined` as absent — and `shipping_options: undefined`
 * reaching Stripe in subscription mode is precisely the mistake worth catching.
 *
 * Why each forbidden key is forbidden (see the plan's "Verified Stripe facts"):
 *  - `shipping_options` is payment-mode only; subscription shipping is a second
 *    recurring line item instead.
 *  - `customer_creation` is rejected outright in subscription mode.
 *  - `customer_update` is omitted so its sub-fields default to `never`, which is
 *    what keeps the Customer `shipping` we set server-side (and therefore the
 *    frozen, already-priced destination) from being overwritten at Checkout.
 *  - `shipping_address_collection` would let the shopper change the destination
 *    after we priced it.
 *  - `expires_at` / `discounts` / `payment_intent_data` / `customer_email` are
 *    one-time-checkout concerns that have no meaning (or are rejected) here.
 */

const stripeMocks = vi.hoisted(() => ({ sessionsCreate: vi.fn() }));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    checkout: {
      sessions: {
        create: (...args: unknown[]): unknown =>
          stripeMocks.sessionsCreate(...args),
      },
    },
  },
}));

const BASE_URL = "https://shop.example.com";

/** Stripe's tax code for shipping — only sent when the store has auto-tax on. */
const SHIPPING_TAX_CODE = "txcd_92010001";

type Subscription = SubscriptionCheckoutParamsInput["subscription"];

const BASE_SUBSCRIPTION: Subscription = {
  id: "sub_row_1",
  productId: "prod_1",
  productVariantId: "var_1",
  productName: "Ultra Soft 12-pack",
  variantName: "12-pack",
  sku: "TP-12",
  quantity: 2,
  intervalKey: "month:1",
  interval: "month",
  intervalCount: 1,
  // 10% "subscribe & save" off a $10.99 list price, already applied by
  // `computeSubscriptionQuote` before the row was written. The builder must
  // NOT recompute anything — see the dedicated test below.
  unitAmountCents: 989,
  shippingCents: 800,
  deliveryMethod: "ship",
};

function makeInput(
  overrides: {
    business?: Partial<SubscriptionCheckoutParamsInput["business"]>;
    subscription?: Partial<Subscription>;
    baseUrl?: string;
    productSlug?: string;
    imageUrl?: string | null;
    stripeCustomerId?: string;
  } = {},
): SubscriptionCheckoutParamsInput {
  return {
    business: {
      id: "biz_1",
      stripeAccountId: "acct_test_1",
      stripeAutoTaxEnabled: false,
      ...overrides.business,
    },
    baseUrl: overrides.baseUrl ?? BASE_URL,
    productSlug: overrides.productSlug ?? "ultra-soft-12-pack",
    imageUrl:
      overrides.imageUrl === undefined
        ? "https://cdn.example.com/tp.png"
        : overrides.imageUrl,
    stripeCustomerId: overrides.stripeCustomerId ?? "cus_test_1",
    subscription: { ...BASE_SUBSCRIPTION, ...overrides.subscription },
  };
}

/** The product (first) line item, typed loosely enough to poke at inline price_data. */
function productLine(params: Stripe.Checkout.SessionCreateParams) {
  const item = params.line_items?.[0];
  return {
    item,
    priceData: item?.price_data,
    productData: item?.price_data?.product_data,
  };
}

/**
 * `custom_text.submit` is typed `Emptyable<Submit>` (`null | "" | Submit`), so
 * it cannot be dotted into directly.
 */
function submitMessage(params: Stripe.Checkout.SessionCreateParams): string {
  const submit = params.custom_text?.submit;
  return typeof submit === "object" && submit !== null ? submit.message : "";
}

function shippingLine(params: Stripe.Checkout.SessionCreateParams) {
  const item = params.line_items?.[1];
  return {
    item,
    priceData: item?.price_data,
    productData: item?.price_data?.product_data,
  };
}

describe("buildSubscriptionCheckoutParams — ship + shipping (primary case)", () => {
  it("produces the exact parameter object, in full", () => {
    const params = buildSubscriptionCheckoutParams(makeInput());

    expect(params).toEqual({
      mode: "subscription",
      customer: "cus_test_1",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 989,
            recurring: { interval: "month", interval_count: 1 },
            product_data: {
              name: "Ultra Soft 12-pack",
              description: "12-pack",
              images: ["https://cdn.example.com/tp.png"],
              metadata: {
                productId: "prod_1",
                productVariantId: "var_1",
                variantName: "12-pack",
                sku: "TP-12",
                kind: "product",
              },
            },
          },
          quantity: 2,
        },
        {
          price_data: {
            currency: "usd",
            unit_amount: 800,
            recurring: { interval: "month", interval_count: 1 },
            product_data: {
              name: "Shipping (per delivery)",
              metadata: { kind: "shipping" },
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        description: "Ultra Soft 12-pack — 12-pack × 2, every month",
        metadata: {
          businessId: "biz_1",
          subscriptionId: "sub_row_1",
          productId: "prod_1",
          variantId: "var_1",
          intervalKey: "month:1",
          quantity: "2",
          deliveryMethod: "ship",
        },
      },
      metadata: {
        businessId: "biz_1",
        subscriptionId: "sub_row_1",
        kind: "subscription",
      },
      success_url:
        "https://shop.example.com/subscribe/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url:
        "https://shop.example.com/subscribe?product=ultra-soft-12-pack&variant=var_1&interval=month%3A1&qty=2",
      submit_type: "subscribe",
      custom_text: {
        submit: {
          message:
            "You'll be charged $27.78 every month until you cancel. Cancel anytime from the link in your emails.",
        },
      },
      payment_method_collection: "always",
    });
  });

  it("never emits the payment-mode / Stripe-rejected keys", () => {
    for (const autoTax of [false, true]) {
      const params = buildSubscriptionCheckoutParams(
        makeInput({ business: { stripeAutoTaxEnabled: autoTax } }),
      );

      // `not.toHaveProperty` (not `toEqual`) on purpose: a key present with the
      // value `undefined` still serializes into the SDK's form encoding path in
      // some shapes, and Stripe rejects several of these outright in
      // subscription mode. Absent means absent.
      expect(params).not.toHaveProperty("customer_update");
      expect(params).not.toHaveProperty("customer_creation");
      expect(params).not.toHaveProperty("shipping_address_collection");
      expect(params).not.toHaveProperty("shipping_options");
      expect(params).not.toHaveProperty("expires_at");
      expect(params).not.toHaveProperty("discounts");
      expect(params).not.toHaveProperty("payment_intent_data");
      expect(params).not.toHaveProperty("customer_email");
    }
  });

  it("stamps subscription_data.metadata so it round-trips through parseSubscriptionMetadata", () => {
    const params = buildSubscriptionCheckoutParams(makeInput());

    const parsed = parseSubscriptionMetadata(
      params.subscription_data?.metadata as Stripe.Metadata,
    );

    expect(parsed).toEqual({
      businessId: "biz_1",
      subscriptionId: "sub_row_1",
      productId: "prod_1",
      variantId: "var_1",
      intervalKey: "month:1",
      quantity: "2",
      deliveryMethod: "ship",
    });
  });

  it("uses formatCurrency for the per-delivery total in the submit message", () => {
    const params = buildSubscriptionCheckoutParams(makeInput());
    const message = submitMessage(params);

    // 989 × 2 + 800 = 2778 — items plus shipping, i.e. what the card is
    // actually charged each cycle.
    expect(message).toContain(formatCurrency(2778));
    expect(message).toContain("every month");
    expect(message).toContain("cancel");
  });
});

describe("buildSubscriptionCheckoutParams — the shipping line item", () => {
  it("omits the shipping line for pickup, even when shippingCents > 0", () => {
    const params = buildSubscriptionCheckoutParams(
      makeInput({
        subscription: { deliveryMethod: "pickup", shippingCents: 800 },
      }),
    );

    expect(params.line_items).toHaveLength(1);
    expect(productLine(params).productData?.name).toBe("Ultra Soft 12-pack");
    expect(params.subscription_data?.metadata).toMatchObject({
      deliveryMethod: "pickup",
    });
  });

  it("omits the shipping line when ship shipping is $0 (free shipping / threshold met)", () => {
    const params = buildSubscriptionCheckoutParams(
      makeInput({ subscription: { deliveryMethod: "ship", shippingCents: 0 } }),
    );

    expect(params.line_items).toHaveLength(1);
    expect(submitMessage(params)).toContain(formatCurrency(989 * 2));
  });

  it("bills shipping on the SAME cadence as the product", () => {
    const params = buildSubscriptionCheckoutParams(
      makeInput({
        subscription: {
          intervalKey: "week:2",
          interval: "week",
          intervalCount: 2,
        },
      }),
    );

    expect(productLine(params).priceData?.recurring).toEqual({
      interval: "week",
      interval_count: 2,
    });
    expect(shippingLine(params).priceData?.recurring).toEqual({
      interval: "week",
      interval_count: 2,
    });
    expect(shippingLine(params).item?.quantity).toBe(1);
    expect(shippingLine(params).productData?.metadata).toEqual({
      kind: "shipping",
    });
  });
});

describe("buildSubscriptionCheckoutParams — automatic tax", () => {
  it("auto-tax ON: enables automatic_tax and tax-codes the shipping line only", () => {
    const params = buildSubscriptionCheckoutParams(
      makeInput({ business: { stripeAutoTaxEnabled: true } }),
    );

    expect(params.automatic_tax).toEqual({ enabled: true });
    expect(shippingLine(params).productData?.tax_code).toBe(SHIPPING_TAX_CODE);
    // The product line carries no tax code: the store's own product tax
    // settings / account default govern it.
    expect(productLine(params).productData).not.toHaveProperty("tax_code");
  });

  it("auto-tax OFF: no automatic_tax key and no tax_code anywhere", () => {
    const params = buildSubscriptionCheckoutParams(
      makeInput({ business: { stripeAutoTaxEnabled: false } }),
    );

    expect(params).not.toHaveProperty("automatic_tax");
    expect(shippingLine(params).productData).not.toHaveProperty("tax_code");
    expect(productLine(params).productData).not.toHaveProperty("tax_code");
  });
});

describe("buildSubscriptionCheckoutParams — product snapshot fields", () => {
  it("no variant: omits `description`, blanks the variant metadata, and leaves `variant=` empty in cancel_url", () => {
    const params = buildSubscriptionCheckoutParams(
      makeInput({
        subscription: {
          productVariantId: null,
          variantName: null,
          sku: null,
        },
      }),
    );

    // Key must be ABSENT, not `undefined` — see the file docblock.
    expect(productLine(params).productData).not.toHaveProperty("description");
    expect(productLine(params).productData?.metadata).toEqual({
      productId: "prod_1",
      productVariantId: "",
      variantName: "",
      sku: "",
      kind: "product",
    });
    expect(params.subscription_data?.description).toBe(
      "Ultra Soft 12-pack × 2, every month",
    );
    expect(params.subscription_data?.metadata).toMatchObject({ variantId: "" });
    expect(params.cancel_url).toBe(
      "https://shop.example.com/subscribe?product=ultra-soft-12-pack&variant=&interval=month%3A1&qty=2",
    );
  });

  it("every product metadata value is a string (Stripe metadata is string-only)", () => {
    const params = buildSubscriptionCheckoutParams(
      makeInput({ subscription: { sku: null } }),
    );

    const metadata = productLine(params).productData?.metadata ?? {};
    for (const value of Object.values(metadata)) {
      expect(typeof value).toBe("string");
    }
    expect(metadata).toMatchObject({ sku: "" });
  });

  it("forwards an http(s) image, and drops anything else", () => {
    const httpsParams = buildSubscriptionCheckoutParams(
      makeInput({ imageUrl: "https://cdn.example.com/tp.png" }),
    );
    expect(productLine(httpsParams).productData?.images).toEqual([
      "https://cdn.example.com/tp.png",
    ]);

    // Parity with the one-time route (`create-session/route.ts`), which accepts
    // `http://` as well as `https://` — the guard exists to reject relative
    // paths and data URIs, which Stripe rejects with "Not a valid URL".
    const httpParams = buildSubscriptionCheckoutParams(
      makeInput({ imageUrl: "http://cdn.example.com/tp.png" }),
    );
    expect(productLine(httpParams).productData?.images).toEqual([
      "http://cdn.example.com/tp.png",
    ]);

    for (const bad of [
      null,
      "/uploads/tp.png",
      "data:image/png;base64,iVBORw0KGgo=",
      "cdn.example.com/tp.png",
    ]) {
      const params = buildSubscriptionCheckoutParams(
        makeInput({ imageUrl: bad }),
      );
      expect(productLine(params).productData).not.toHaveProperty("images");
    }
  });
});

describe("buildSubscriptionCheckoutParams — cadence, quantity, pricing", () => {
  it("week:2 cadence phrases the description and submit message as 'every 2 weeks'", () => {
    const params = buildSubscriptionCheckoutParams(
      makeInput({
        subscription: {
          intervalKey: "week:2",
          interval: "week",
          intervalCount: 2,
        },
      }),
    );

    expect(params.subscription_data?.description).toBe(
      "Ultra Soft 12-pack — 12-pack × 2, every 2 weeks",
    );
    expect(submitMessage(params)).toBe(
      "You'll be charged $27.78 every 2 weeks until you cancel. Cancel anytime from the link in your emails.",
    );
    expect(params.cancel_url).toBe(
      "https://shop.example.com/subscribe?product=ultra-soft-12-pack&variant=var_1&interval=week%3A2&qty=2",
    );
  });

  it("month:3 cadence phrases as 'every 3 months'", () => {
    const params = buildSubscriptionCheckoutParams(
      makeInput({
        subscription: {
          intervalKey: "month:3",
          interval: "month",
          intervalCount: 3,
          quantity: 1,
          shippingCents: 0,
        },
      }),
    );

    expect(params.subscription_data?.description).toBe(
      "Ultra Soft 12-pack — 12-pack × 1, every 3 months",
    );
    expect(submitMessage(params)).toBe(
      "You'll be charged $9.89 every 3 months until you cancel. Cancel anytime from the link in your emails.",
    );
  });

  it("quantity > 1 sets the line quantity, the metadata string, and the description", () => {
    const params = buildSubscriptionCheckoutParams(
      makeInput({ subscription: { quantity: 3 } }),
    );

    expect(productLine(params).item?.quantity).toBe(3);
    // Shipping is billed once per delivery regardless of item quantity — the
    // quantity is already priced into `shippingCents` (weight × qty).
    expect(shippingLine(params).item?.quantity).toBe(1);
    expect(params.subscription_data?.metadata).toMatchObject({ quantity: "3" });
    expect(params.subscription_data?.description).toBe(
      "Ultra Soft 12-pack — 12-pack × 3, every month",
    );
    expect(params.cancel_url).toContain("&qty=3");
    // 989 × 3 + 800
    expect(submitMessage(params)).toContain(formatCurrency(989 * 3 + 800));
  });

  it("passes unitAmountCents through verbatim — the discount is already baked in, the builder never recomputes a price", () => {
    const params = buildSubscriptionCheckoutParams(
      makeInput({ subscription: { unitAmountCents: 989 } }),
    );

    expect(productLine(params).priceData?.unit_amount).toBe(989);
    expect(params).not.toHaveProperty("discounts");

    // A different locked price flows through unchanged too (an existing
    // subscriber keeps their price even after the owner edits the product).
    const other = buildSubscriptionCheckoutParams(
      makeInput({ subscription: { unitAmountCents: 1234 } }),
    );
    expect(productLine(other).priceData?.unit_amount).toBe(1234);
  });

  it("URL-encodes the cancel_url query values (the interval key contains a colon)", () => {
    const params = buildSubscriptionCheckoutParams(
      makeInput({ productSlug: "toilet-paper" }),
    );

    expect(params.cancel_url).toContain("interval=month%3A1");
    expect(params.cancel_url).toContain("product=toilet-paper");
    expect(params.cancel_url).not.toContain("interval=month:1");
  });

  it("builds success_url / cancel_url from the passed baseUrl (no trailing-slash doubling)", () => {
    const params = buildSubscriptionCheckoutParams(
      makeInput({ baseUrl: "https://bloom.florist.example" }),
    );

    expect(params.success_url).toBe(
      "https://bloom.florist.example/subscribe/success?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(params.cancel_url).toMatch(
      /^https:\/\/bloom\.florist\.example\/subscribe\?/,
    );
  });

  it("is pure — the same input twice yields deeply equal params and mutates nothing", () => {
    const input = makeInput();
    const before = JSON.parse(JSON.stringify(input)) as unknown;

    const first = buildSubscriptionCheckoutParams(input);
    const second = buildSubscriptionCheckoutParams(input);

    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(input))).toEqual(before);
  });
});

describe("createSubscriptionCheckoutSession", () => {
  beforeEach(() => {
    stripeMocks.sessionsCreate.mockReset();
  });

  it("creates the session on the CONNECTED account and returns it unchanged", async () => {
    const session = {
      id: "cs_test_sub_1",
      url: "https://checkout.stripe.test/c/pay/cs_test_sub_1",
      object: "checkout.session",
    };
    stripeMocks.sessionsCreate.mockResolvedValue(session);

    const input = makeInput({
      business: { stripeAccountId: "acct_connected_9" },
    });
    const result = await createSubscriptionCheckoutSession(input);

    expect(stripeMocks.sessionsCreate).toHaveBeenCalledTimes(1);
    const [params, options] = stripeMocks.sessionsCreate.mock.calls[0] as [
      Stripe.Checkout.SessionCreateParams,
      { stripeAccount: string },
    ];

    // Exactly what the pure builder produces — no extra fields bolted on at
    // the call site, which is how the two would silently drift.
    expect(params).toEqual(buildSubscriptionCheckoutParams(input));
    expect(options).toEqual({ stripeAccount: "acct_connected_9" });
    expect(result).toBe(session);
  });

  it("propagates a Stripe failure to the caller (the route deletes its row and 500s)", async () => {
    stripeMocks.sessionsCreate.mockRejectedValue(new Error("card_declined"));

    await expect(
      createSubscriptionCheckoutSession(makeInput()),
    ).rejects.toThrow("card_declined");
  });
});
