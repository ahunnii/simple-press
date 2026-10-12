import { describe, expect, it } from "vitest";

import {
  isPaymentProcessing,
  PAYMENT_PROCESSING_MESSAGE,
} from "./payment-status";

describe("isPaymentProcessing", () => {
  it("is true only for unpaid (delayed bank payment) sessions", () => {
    expect(isPaymentProcessing("unpaid")).toBe(true);
    expect(isPaymentProcessing("paid")).toBe(false);
    expect(isPaymentProcessing("no_payment_required")).toBe(false);
    expect(isPaymentProcessing("")).toBe(false);
    expect(isPaymentProcessing(null)).toBe(false);
    expect(isPaymentProcessing(undefined)).toBe(false);
  });

  it("never claims the payment is confirmed", () => {
    expect(PAYMENT_PROCESSING_MESSAGE).toMatch(/processing/i);
    expect(PAYMENT_PROCESSING_MESSAGE).not.toMatch(/unpaid|confirmed|paid/i);
  });
});
