import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import type { DonationCheckoutParamsInput } from "./checkout-session";

import { buildDonationCheckoutParams } from "./checkout-session";

/**
 * Contract for `src/lib/donations/checkout-session.ts` — the builder for the
 * `mode: "payment"` donation Stripe Checkout Session.
 *
 * Same discipline as the subscription builder's test: this is a payment-
 * processor surface, so the primary case pins the ENTIRE parameter object as an
 * inline literal (not `toMatchSnapshot`, so a diff shows up in review rather
 * than in a regenerated `.snap`), and the forbidden-key assertions use
 * `not.toHaveProperty` rather than `toEqual` — `toEqual` treats a key present
 * with the value `undefined` as absent, and `donorName: undefined` reaching
 * Stripe's form encoder is precisely the mistake worth catching.
 *
 * Why each forbidden key is forbidden (see the module docblock):
 *  - `automatic_tax` — donations are not a taxable sale; Stripe Tax would add
 *    sales tax to a gift.
 *  - `payment_intent_data` / `transfer_data` — the platform takes no cut.
 *  - `shipping_address_collection` / `shipping_options` — nothing ships.
 *  - `customer` / `customer_email` — Checkout collects the donor's email itself.
 *  - `discounts` / `expires_at` — no cart, no coupon.
 */

const BASE_URL = "https://shop.example.com";

function makeInput(
  overrides: {
    business?: Partial<DonationCheckoutParamsInput["business"]>;
    baseUrl?: string;
    amountCents?: number;
    donorName?: string;
    message?: string;
  } = {},
): DonationCheckoutParamsInput {
  return {
    business: {
      id: "biz_1",
      name: "Bloom Florist",
      donationLabel: "donate",
      stripeAutoTaxEnabled: false,
      ...overrides.business,
    },
    baseUrl: overrides.baseUrl ?? BASE_URL,
    amountCents: overrides.amountCents ?? 2500,
    ...(overrides.donorName !== undefined
      ? { donorName: overrides.donorName }
      : {}),
    ...(overrides.message !== undefined ? { message: overrides.message } : {}),
  };
}

/** The single line item, typed loosely enough to poke at inline price_data. */
function donationLine(params: Stripe.Checkout.SessionCreateParams) {
  const item = params.line_items?.[0];
  return {
    item,
    priceData: item?.price_data,
    productData: item?.price_data?.product_data,
  };
}

describe("buildDonationCheckoutParams — anonymous donation (primary case)", () => {
  it("produces the exact parameter object, in full", () => {
    const params = buildDonationCheckoutParams(makeInput());

    expect(params).toEqual({
      mode: "payment",
      submit_type: "donate",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 2500,
            product_data: { name: "Donation to Bloom Florist" },
          },
          quantity: 1,
        },
      ],
      metadata: {
        businessId: "biz_1",
        kind: "donation",
      },
      success_url: "https://shop.example.com/donate?status=success",
      cancel_url: "https://shop.example.com/donate",
    });
  });

  it("never emits the platform-fee / shipping / tax / customer keys", () => {
    for (const autoTax of [false, true]) {
      const params = buildDonationCheckoutParams(
        makeInput({ business: { stripeAutoTaxEnabled: autoTax } }),
      );

      // `not.toHaveProperty` (not `toEqual`) on purpose — a key present with
      // the value `undefined` is not the same thing as an absent key once it
      // reaches the SDK's form encoding path.
      expect(params).not.toHaveProperty("automatic_tax");
      expect(params).not.toHaveProperty("payment_intent_data");
      expect(params).not.toHaveProperty("transfer_data");
      expect(params).not.toHaveProperty("application_fee_amount");
      expect(params).not.toHaveProperty("shipping_address_collection");
      expect(params).not.toHaveProperty("shipping_options");
      expect(params).not.toHaveProperty("customer");
      expect(params).not.toHaveProperty("customer_email");
      expect(params).not.toHaveProperty("discounts");
      expect(params).not.toHaveProperty("expires_at");
    }
  });

  it("is `mode: 'payment'` with `submit_type: 'donate'` for EVERY owner label", () => {
    // There is no "Tip"/"Support" submit type at Stripe; "donate" is the
    // closest copy for all three and beats the default "Pay" for each.
    for (const donationLabel of ["donate", "tip", "support", null]) {
      const params = buildDonationCheckoutParams(
        makeInput({ business: { donationLabel } }),
      );
      expect(params.mode).toBe("payment");
      expect(params.submit_type).toBe("donate");
    }
  });

  it("is pure — the same input twice yields deeply equal params and mutates nothing", () => {
    const input = makeInput({ donorName: "Ada", message: "Keep it up!" });
    const before = JSON.parse(JSON.stringify(input)) as unknown;

    const first = buildDonationCheckoutParams(input);
    const second = buildDonationCheckoutParams(input);

    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(input))).toEqual(before);
  });
});

describe("buildDonationCheckoutParams — metadata", () => {
  it("carries donorName and donorMessage when the donor supplied them", () => {
    const params = buildDonationCheckoutParams(
      makeInput({ donorName: "Ada Lovelace", message: "Love this shop!" }),
    );

    expect(params.metadata).toEqual({
      businessId: "biz_1",
      kind: "donation",
      donorName: "Ada Lovelace",
      donorMessage: "Love this shop!",
    });
  });

  it("OMITS donorName / donorMessage rather than sending '' when absent", () => {
    const params = buildDonationCheckoutParams(makeInput());

    // Stripe reads an empty-string metadata value as "delete this key", so ""
    // and absent are the same thing AT Stripe — sending "" would only
    // misdescribe what came back. Absent means absent.
    expect(params.metadata).not.toHaveProperty("donorName");
    expect(params.metadata).not.toHaveProperty("donorMessage");
    expect(params.metadata).toEqual({
      businessId: "biz_1",
      kind: "donation",
    });
  });

  it("treats a blank / whitespace-only donor field as absent, not as ''", () => {
    const params = buildDonationCheckoutParams(
      makeInput({ donorName: "   ", message: "\n\t " }),
    );

    expect(params.metadata).not.toHaveProperty("donorName");
    expect(params.metadata).not.toHaveProperty("donorMessage");
  });

  it("carries one donor field independently of the other", () => {
    const named = buildDonationCheckoutParams(
      makeInput({ donorName: "Ada Lovelace" }),
    );
    expect(named.metadata).toEqual({
      businessId: "biz_1",
      kind: "donation",
      donorName: "Ada Lovelace",
    });
    expect(named.metadata).not.toHaveProperty("donorMessage");

    const noted = buildDonationCheckoutParams(
      makeInput({ message: "Thanks for the flowers" }),
    );
    expect(noted.metadata).toEqual({
      businessId: "biz_1",
      kind: "donation",
      donorMessage: "Thanks for the flowers",
    });
    expect(noted.metadata).not.toHaveProperty("donorName");
  });

  it("stamps `kind: 'donation'` — the key the webhook route dispatches on", () => {
    const params = buildDonationCheckoutParams(makeInput());
    expect(params.metadata?.kind).toBe("donation");
  });

  it("every metadata value is a string (Stripe metadata is string-only)", () => {
    const params = buildDonationCheckoutParams(
      makeInput({ donorName: "Ada", message: "Hi" }),
    );

    for (const value of Object.values(params.metadata ?? {})) {
      expect(typeof value).toBe("string");
    }
  });
});

describe("buildDonationCheckoutParams — amount", () => {
  it("passes amountCents through verbatim — the builder never re-prices anything", () => {
    for (const amountCents of [100, 500, 2500, 999_99, 1_000_000]) {
      const params = buildDonationCheckoutParams(makeInput({ amountCents }));
      expect(donationLine(params).priceData?.unit_amount).toBe(amountCents);
      expect(donationLine(params).item?.quantity).toBe(1);
    }
  });

  it("prices in USD, hardcoded — parity with the subscription builder", () => {
    const params = buildDonationCheckoutParams(makeInput());
    expect(donationLine(params).priceData?.currency).toBe("usd");
  });
});

describe("buildDonationCheckoutParams — the label drives the product name", () => {
  it("names the line item from the owner's label noun", () => {
    const cases: Array<[string | null, string]> = [
      ["donate", "Donation to Bloom Florist"],
      ["tip", "Tip to Bloom Florist"],
      ["support", "Contribution to Bloom Florist"],
      // Unknown / unset falls back to "donate" (`resolveDonationLabel`), so a
      // stale column value never breaks the money path.
      [null, "Donation to Bloom Florist"],
      ["nonsense", "Donation to Bloom Florist"],
    ];

    for (const [donationLabel, expected] of cases) {
      const params = buildDonationCheckoutParams(
        makeInput({ business: { donationLabel } }),
      );
      expect(donationLine(params).productData?.name).toBe(expected);
    }
  });

  it("uses the store's own name in the line item", () => {
    const params = buildDonationCheckoutParams(
      makeInput({
        business: { name: "Riverside Coffee", donationLabel: "tip" },
      }),
    );
    expect(donationLine(params).productData?.name).toBe(
      "Tip to Riverside Coffee",
    );
  });

  it("carries no product metadata, description or images — there is no product", () => {
    const productData = donationLine(
      buildDonationCheckoutParams(makeInput()),
    ).productData;

    expect(productData).toEqual({ name: "Donation to Bloom Florist" });
    expect(productData).not.toHaveProperty("images");
    expect(productData).not.toHaveProperty("description");
    expect(productData).not.toHaveProperty("tax_code");
  });
});

describe("buildDonationCheckoutParams — success / cancel URLs", () => {
  it("builds both from the passed baseUrl", () => {
    const params = buildDonationCheckoutParams(
      makeInput({ baseUrl: "https://bloom.florist.example" }),
    );

    expect(params.success_url).toBe(
      "https://bloom.florist.example/donate?status=success",
    );
    expect(params.cancel_url).toBe("https://bloom.florist.example/donate");
  });

  it("does not double the slash when baseUrl carries a trailing one", () => {
    const params = buildDonationCheckoutParams(
      makeInput({ baseUrl: "https://shop.example.com///" }),
    );

    expect(params.success_url).toBe(
      "https://shop.example.com/donate?status=success",
    );
    expect(params.cancel_url).toBe("https://shop.example.com/donate");
  });

  it("cancels back to the donate form, and never asks for a session id", () => {
    const params = buildDonationCheckoutParams(makeInput());

    // Nothing reads the session back on the success page — the Donation row is
    // created by the webhook, so there is no id to look anything up with.
    expect(params.success_url).not.toContain("{CHECKOUT_SESSION_ID}");
    expect(params.cancel_url).not.toContain("?");
  });

  it("works over http for local dev (the route builds `http://<host>` there)", () => {
    const params = buildDonationCheckoutParams(
      makeInput({ baseUrl: "http://bloom.localhost:3000" }),
    );

    expect(params.success_url).toBe(
      "http://bloom.localhost:3000/donate?status=success",
    );
  });
});
