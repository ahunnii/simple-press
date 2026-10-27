import { describe, expect, it } from "vitest";

import { redactOrderForStaff } from "./staff-redaction";

const order = {
  id: "o1",
  total: 4200,
  customerName: "Ada",
  internalNote: "owner-only",
  stripePaymentIntentId: "pi_123",
  stripeSessionId: "cs_123",
  stripeInvoiceId: "in_123",
};

describe("redactOrderForStaff", () => {
  it("returns the row untouched for owners, managers and platform admins", () => {
    expect(redactOrderForStaff(order, false)).toBe(order);
  });

  it("nulls the owner note and Stripe identifiers for STAFF", () => {
    expect(redactOrderForStaff(order, true)).toEqual({
      id: "o1",
      total: 4200,
      customerName: "Ada",
      internalNote: null,
      stripePaymentIntentId: null,
      stripeSessionId: null,
      stripeInvoiceId: null,
    });
  });

  it("does not mutate the input row", () => {
    redactOrderForStaff(order, true);
    expect(order.internalNote).toBe("owner-only");
  });
});
