import { describe, expect, it } from "vitest";

import {
  orderConfirmationDefaultSubject,
  subscriptionCancelledDefaultSubject,
  subscriptionPaymentFailedDefaultSubject,
  subscriptionStartedDefaultSubject,
  subscriptionUpdatedDefaultSubject,
} from "./default-subjects";

describe("orderConfirmationDefaultSubject", () => {
  it("uses the pickup wording for pickup orders", () => {
    expect(
      orderConfirmationDefaultSubject({ orderNumber: 1001, isPickup: true }),
    ).toBe("Order #1001 confirmed — pickup details inside");
  });

  it("uses the standard wording for shipped orders", () => {
    expect(
      orderConfirmationDefaultSubject({ orderNumber: 1001, isPickup: false }),
    ).toBe("Order #1001 Confirmed");
  });
});

describe("subscription default subjects", () => {
  it("names the product on started / payment failed / cancelled", () => {
    expect(
      subscriptionStartedDefaultSubject({ productName: "Coffee Pack" }),
    ).toBe("Your Coffee Pack subscription is confirmed");
    expect(
      subscriptionPaymentFailedDefaultSubject({ productName: "Coffee Pack" }),
    ).toBe("Action needed: payment for your Coffee Pack subscription");
    expect(
      subscriptionCancelledDefaultSubject({ productName: "Coffee Pack" }),
    ).toBe("Your Coffee Pack subscription has been cancelled");
  });

  it("varies the updated subject by action", () => {
    expect(subscriptionUpdatedDefaultSubject({ variant: "paused" })).toBe(
      "Your subscription is paused",
    );
    expect(subscriptionUpdatedDefaultSubject({ variant: "resumed" })).toBe(
      "Your subscription is back on",
    );
    expect(
      subscriptionUpdatedDefaultSubject({ variant: "resumed", undoSkip: true }),
    ).toBe("Your next delivery is back on");
    expect(subscriptionUpdatedDefaultSubject({ variant: "skipped" })).toBe(
      "Your next delivery is skipped",
    );
  });
});
