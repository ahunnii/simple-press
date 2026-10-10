import { describe, expect, it } from "vitest";

import type { PaymentOverrideOrder } from "./order-transitions";

import {
  isManualOrder,
  orderHadInventoryDeducted,
  planPaymentStatusOverride,
  shouldRestockOnRefund,
  statusAfterRefund,
} from "./order-transitions";

/** A pending manual order — the case the paid catch-up exists for. */
function manualOrder(
  overrides: Partial<PaymentOverrideOrder> = {},
): PaymentOverrideOrder {
  return {
    status: "open",
    paymentStatus: "pending",
    fulfillmentStatus: "unfulfilled",
    refundAmountCents: null,
    stripeSessionId: null,
    stripePaymentIntentId: null,
    stripeInvoiceId: null,
    ...overrides,
  };
}

describe("statusAfterRefund", () => {
  it("ends a full refund at refunded, even for a cancelled order", () => {
    expect(
      statusAfterRefund({
        isFullRefund: true,
        status: "cancelled",
        fulfillmentStatus: "unfulfilled",
      }),
    ).toBe("refunded");
  });

  it("keeps a cancelled order cancelled on a partial refund", () => {
    expect(
      statusAfterRefund({
        isFullRefund: false,
        status: "cancelled",
        fulfillmentStatus: "unfulfilled",
      }),
    ).toBe("cancelled");
  });

  it("derives open/completed from fulfillment for a live order", () => {
    expect(
      statusAfterRefund({
        isFullRefund: false,
        status: "open",
        fulfillmentStatus: "fulfilled",
      }),
    ).toBe("completed");
    expect(
      statusAfterRefund({
        isFullRefund: false,
        status: "completed",
        fulfillmentStatus: "partially_fulfilled",
      }),
    ).toBe("open");
  });
});

describe("shouldRestockOnRefund", () => {
  it("restocks only when asked", () => {
    expect(
      shouldRestockOnRefund({ status: "open", restockRequested: true }),
    ).toBe(true);
    expect(
      shouldRestockOnRefund({ status: "open", restockRequested: false }),
    ).toBe(false);
  });

  it("ignores the request for a cancelled order", () => {
    expect(
      shouldRestockOnRefund({ status: "cancelled", restockRequested: true }),
    ).toBe(false);
  });
});

describe("orderHadInventoryDeducted", () => {
  it("is false for a pending manual order (saved open, never deducted)", () => {
    expect(
      orderHadInventoryDeducted({ status: "open", paymentStatus: "pending" }),
    ).toBe(false);
    expect(
      orderHadInventoryDeducted({ status: "open", paymentStatus: "failed" }),
    ).toBe(false);
  });

  it("is true for a paid live order", () => {
    expect(
      orderHadInventoryDeducted({ status: "open", paymentStatus: "paid" }),
    ).toBe(true);
    expect(
      orderHadInventoryDeducted({ status: "completed", paymentStatus: "paid" }),
    ).toBe(true);
  });

  it("is true for Stripe orders whose label isn't 'paid' but which deducted at checkout", () => {
    expect(
      orderHadInventoryDeducted({
        status: "open",
        paymentStatus: "no_payment_required",
      }),
    ).toBe(true);
    expect(
      orderHadInventoryDeducted({ status: "open", paymentStatus: "disputed" }),
    ).toBe(true);
  });

  it("is false once the order is cancelled or refunded", () => {
    expect(
      orderHadInventoryDeducted({ status: "cancelled", paymentStatus: "paid" }),
    ).toBe(false);
    expect(
      orderHadInventoryDeducted({
        status: "refunded",
        paymentStatus: "refunded",
      }),
    ).toBe(false);
  });
});

describe("isManualOrder", () => {
  it("is true only with no Stripe ids at all", () => {
    expect(isManualOrder(manualOrder())).toBe(true);
    expect(isManualOrder(manualOrder({ stripeSessionId: "cs_1" }))).toBe(false);
    expect(isManualOrder(manualOrder({ stripePaymentIntentId: "pi_1" }))).toBe(
      false,
    );
    expect(isManualOrder(manualOrder({ stripeInvoiceId: "in_1" }))).toBe(false);
  });
});

describe("planPaymentStatusOverride", () => {
  it("catches up a pending manual order marked paid", () => {
    expect(planPaymentStatusOverride(manualOrder(), "paid")).toEqual({
      ok: true,
      status: "open",
      catchUp: true,
    });
  });

  it("catches up from failed too, and completes a fulfilled order", () => {
    expect(
      planPaymentStatusOverride(
        manualOrder({
          paymentStatus: "failed",
          fulfillmentStatus: "fulfilled",
        }),
        "paid",
      ),
    ).toEqual({ ok: true, status: "completed", catchUp: true });
  });

  it("never catches up a Stripe-created order", () => {
    // A $0 checkout is stored "no_payment_required" and already applied
    // everything at creation.
    expect(
      planPaymentStatusOverride(
        manualOrder({
          paymentStatus: "no_payment_required",
          stripeSessionId: "cs_1",
        }),
        "paid",
      ),
    ).toEqual({ ok: true, status: "open", catchUp: false });
    // Defensive: even a not-yet-paid label on a Stripe order doesn't re-apply.
    expect(
      planPaymentStatusOverride(
        manualOrder({ stripePaymentIntentId: "pi_1" }),
        "paid",
      ),
    ).toMatchObject({ ok: true, catchUp: false });
  });

  it("does not catch up an order that is already paid", () => {
    expect(
      planPaymentStatusOverride(manualOrder({ paymentStatus: "paid" }), "paid"),
    ).toEqual({ ok: true, status: "open", catchUp: false });
  });

  it("makes paid one-way — pending and failed are rejected with a cancel hint", () => {
    for (const next of ["pending", "failed"]) {
      const plan = planPaymentStatusOverride(
        manualOrder({ paymentStatus: "paid" }),
        next,
      );
      expect(plan.ok).toBe(false);
      if (!plan.ok) expect(plan.message).toMatch(/cancel the order/i);
    }
  });

  it("allows moving between pending and failed while unpaid", () => {
    expect(planPaymentStatusOverride(manualOrder(), "failed")).toEqual({
      ok: true,
      status: "open",
      catchUp: false,
    });
    expect(
      planPaymentStatusOverride(
        manualOrder({ paymentStatus: "failed" }),
        "pending",
      ),
    ).toEqual({ ok: true, status: "open", catchUp: false });
  });

  it("rejects 'refunded' — the refund flows own that", () => {
    const plan = planPaymentStatusOverride(
      manualOrder({ paymentStatus: "paid" }),
      "refunded",
    );
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.message).toMatch(/refund/i);
  });

  it("rejects unknown statuses", () => {
    expect(planPaymentStatusOverride(manualOrder(), "bogus").ok).toBe(false);
  });

  it("rejects any change to a cancelled order", () => {
    expect(
      planPaymentStatusOverride(manualOrder({ status: "cancelled" }), "paid")
        .ok,
    ).toBe(false);
  });

  it("rejects marking a refunded or partly refunded order paid", () => {
    expect(
      planPaymentStatusOverride(
        manualOrder({ status: "refunded", paymentStatus: "refunded" }),
        "paid",
      ).ok,
    ).toBe(false);
    expect(
      planPaymentStatusOverride(
        manualOrder({ paymentStatus: "disputed", refundAmountCents: 500 }),
        "paid",
      ).ok,
    ).toBe(false);
  });
});
