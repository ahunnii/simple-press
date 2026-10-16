import { describe, expect, it } from "vitest";

import { abandonedReminderBlock } from "./abandoned-checkout-recipient";

const clean = {
  anonymizedAt: null,
  marketingSuppressedAt: null,
  marketingUnsubscribedAt: null,
  marketingConsentAt: null,
};
const earlier = new Date("2026-10-01T00:00:00Z");
const later = new Date("2026-10-10T00:00:00Z");

describe("abandonedReminderBlock", () => {
  it("allows a customer who never subscribed and never opted out", () => {
    expect(abandonedReminderBlock(clean)).toBeNull();
  });

  it("blocks an erased customer", () => {
    expect(abandonedReminderBlock({ ...clean, anonymizedAt: later })).toBe(
      "anonymized",
    );
  });

  it("blocks a suppressed (bounced / complained) customer", () => {
    expect(
      abandonedReminderBlock({ ...clean, marketingSuppressedAt: later }),
    ).toBe("suppressed");
  });

  it("blocks an unsubscribe with no consent on record", () => {
    expect(
      abandonedReminderBlock({ ...clean, marketingUnsubscribedAt: later }),
    ).toBe("unsubscribed");
  });

  it("blocks an unsubscribe that came after the last consent", () => {
    expect(
      abandonedReminderBlock({
        ...clean,
        marketingConsentAt: earlier,
        marketingUnsubscribedAt: later,
      }),
    ).toBe("unsubscribed");
  });

  it("allows a customer who re-subscribed after unsubscribing", () => {
    expect(
      abandonedReminderBlock({
        ...clean,
        marketingUnsubscribedAt: earlier,
        marketingConsentAt: later,
      }),
    ).toBeNull();
  });
});
