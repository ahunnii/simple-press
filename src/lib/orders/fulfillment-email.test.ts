import { describe, expect, it } from "vitest";

import { fulfillmentToast } from "./fulfillment-email";

describe("fulfillmentToast", () => {
  it("reports a shipping email for a tracked shipment", () => {
    expect(
      fulfillmentToast({
        customerEmailSent: "shipped",
        customerEmailFailed: false,
        fullyFulfilled: false,
      }),
    ).toEqual({
      tone: "success",
      title: "Shipment recorded and shipping email sent to customer",
    });
    expect(
      fulfillmentToast({
        customerEmailSent: "shipped",
        customerEmailFailed: false,
        fullyFulfilled: true,
      }).title,
    ).toBe("Order fulfilled and shipping email sent to customer");
  });

  it("reports the fulfilled email when the order completes without tracking", () => {
    expect(
      fulfillmentToast({
        customerEmailSent: "fulfilled",
        customerEmailFailed: false,
        fullyFulfilled: true,
      }),
    ).toEqual({
      tone: "success",
      title: "Order fulfilled and email sent to customer",
    });
  });

  it("says no email went out for a partial shipment without tracking", () => {
    const toast = fulfillmentToast({
      customerEmailSent: null,
      customerEmailFailed: false,
      fullyFulfilled: false,
    });
    expect(toast.tone).toBe("success");
    expect(toast.title).toMatch(/no email sent/i);
    expect(toast.description).toMatch(/tracking/i);
  });

  it("warns when the send failed, without claiming an email went out", () => {
    const toast = fulfillmentToast({
      customerEmailSent: null,
      customerEmailFailed: true,
      fullyFulfilled: false,
    });
    expect(toast.tone).toBe("warning");
    expect(toast.title).toMatch(/didn't send/);
    expect(toast.title).not.toMatch(/email sent/);
  });
});
