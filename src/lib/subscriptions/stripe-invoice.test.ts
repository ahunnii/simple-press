import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import {
  getInvoiceMetadata,
  getInvoicePaymentIntentId,
  getInvoiceSubscriptionId,
  invoiceTaxCents,
  isSubscriptionInvoice,
} from "./stripe-invoice";

/**
 * Build a minimal fake Stripe.Invoice (v20 / API 2026-01-28.clover shapes).
 * Only the fields the module under test reads need to be populated.
 */
function makeInvoice(opts: {
  parent?: {
    type: "subscription_details" | "quote_details";
    subscription_details?: {
      subscription: string | Record<string, unknown>;
      metadata: Record<string, string> | null;
    };
  } | null;
  payments?: Array<{
    payment: {
      type: "payment_intent" | "charge" | "payment_record";
      payment_intent?: string | { id: string };
    };
  }>;
  total_taxes?: Array<{ amount: number }> | null;
  amount_paid?: number;
  subtotal?: number;
}): Stripe.Invoice {
  return {
    parent:
      opts.parent === undefined
        ? {
            type: "subscription_details",
            subscription_details: {
              subscription: "sub_123",
              metadata: { businessId: "biz_1" },
            },
          }
        : opts.parent,
    payments: opts.payments !== undefined ? { data: opts.payments } : undefined,
    total_taxes: opts.total_taxes !== undefined ? opts.total_taxes : null,
    amount_paid: opts.amount_paid ?? 0,
    subtotal: opts.subtotal ?? 0,
  } as unknown as Stripe.Invoice;
}

describe("getInvoiceSubscriptionId", () => {
  it("returns the subscription id when it is a string", () => {
    const invoice = makeInvoice({
      parent: {
        type: "subscription_details",
        subscription_details: {
          subscription: "sub_123",
          metadata: {},
        },
      },
    });
    expect(getInvoiceSubscriptionId(invoice)).toBe("sub_123");
  });

  it("returns the subscription id when the subscription is an expanded object", () => {
    const invoice = makeInvoice({
      parent: {
        type: "subscription_details",
        subscription_details: {
          subscription: { id: "sub_456" },
          metadata: {},
        },
      },
    });
    expect(getInvoiceSubscriptionId(invoice)).toBe("sub_456");
  });

  it("returns null when parent is null", () => {
    const invoice = makeInvoice({ parent: null });
    expect(getInvoiceSubscriptionId(invoice)).toBeNull();
  });

  it("returns null when parent.type is not subscription_details", () => {
    const invoice = makeInvoice({
      parent: { type: "quote_details" },
    });
    expect(getInvoiceSubscriptionId(invoice)).toBeNull();
  });
});

describe("getInvoiceMetadata", () => {
  it("returns the subscription_details metadata object", () => {
    const invoice = makeInvoice({
      parent: {
        type: "subscription_details",
        subscription_details: {
          subscription: "sub_123",
          metadata: { businessId: "biz_1", subscriptionId: "row_1" },
        },
      },
    });
    expect(getInvoiceMetadata(invoice)).toEqual({
      businessId: "biz_1",
      subscriptionId: "row_1",
    });
  });

  it("returns null when parent is null", () => {
    const invoice = makeInvoice({ parent: null });
    expect(getInvoiceMetadata(invoice)).toBeNull();
  });

  it("returns null when parent.type is not subscription_details", () => {
    const invoice = makeInvoice({ parent: { type: "quote_details" } });
    expect(getInvoiceMetadata(invoice)).toBeNull();
  });

  it("returns null when subscription_details.metadata itself is null", () => {
    const invoice = makeInvoice({
      parent: {
        type: "subscription_details",
        subscription_details: { subscription: "sub_123", metadata: null },
      },
    });
    expect(getInvoiceMetadata(invoice)).toBeNull();
  });
});

describe("getInvoicePaymentIntentId", () => {
  it("returns the payment intent id when it is a string", () => {
    const invoice = makeInvoice({
      payments: [
        { payment: { type: "payment_intent", payment_intent: "pi_1" } },
      ],
    });
    expect(getInvoicePaymentIntentId(invoice)).toBe("pi_1");
  });

  it("returns the payment intent id when it is an expanded object", () => {
    const invoice = makeInvoice({
      payments: [
        {
          payment: { type: "payment_intent", payment_intent: { id: "pi_1" } },
        },
      ],
    });
    expect(getInvoicePaymentIntentId(invoice)).toBe("pi_1");
  });

  it("returns null when payments is missing (not expanded)", () => {
    const invoice = makeInvoice({ payments: undefined });
    expect(getInvoicePaymentIntentId(invoice)).toBeNull();
  });

  it("returns null when payments.data is empty", () => {
    const invoice = makeInvoice({ payments: [] });
    expect(getInvoicePaymentIntentId(invoice)).toBeNull();
  });

  it("returns null when the payment type is 'charge'", () => {
    const invoice = makeInvoice({
      payments: [{ payment: { type: "charge" } }],
    });
    expect(getInvoicePaymentIntentId(invoice)).toBeNull();
  });
});

describe("invoiceTaxCents", () => {
  it("sums total_taxes[].amount", () => {
    const invoice = makeInvoice({
      total_taxes: [{ amount: 123 }, { amount: 7 }],
    });
    expect(invoiceTaxCents(invoice)).toBe(130);
  });

  it("returns 0 when total_taxes is null", () => {
    const invoice = makeInvoice({ total_taxes: null });
    expect(invoiceTaxCents(invoice)).toBe(0);
  });

  it("returns 0 when total_taxes is an empty array", () => {
    const invoice = makeInvoice({ total_taxes: [] });
    expect(invoiceTaxCents(invoice)).toBe(0);
  });
});

describe("isSubscriptionInvoice", () => {
  it("returns true when parent.type is subscription_details", () => {
    const invoice = makeInvoice({
      parent: {
        type: "subscription_details",
        subscription_details: { subscription: "sub_123", metadata: null },
      },
    });
    expect(isSubscriptionInvoice(invoice)).toBe(true);
  });

  it("returns false when parent is null", () => {
    const invoice = makeInvoice({ parent: null });
    expect(isSubscriptionInvoice(invoice)).toBe(false);
  });

  it("returns false when parent.type is quote_details", () => {
    const invoice = makeInvoice({ parent: { type: "quote_details" } });
    expect(isSubscriptionInvoice(invoice)).toBe(false);
  });
});
