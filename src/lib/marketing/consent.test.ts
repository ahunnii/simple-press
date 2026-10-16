import { describe, expect, it } from "vitest";

import { marketingConsentSourceLabel, marketingOptInData } from "./consent";

describe("marketingOptInData", () => {
  it("opts in with evidence and clears unsubscribe + suppression when asked", () => {
    const now = new Date("2026-10-16T12:00:00Z");
    expect(
      marketingOptInData("NEWSLETTER_FORM", { clearSuppression: true, now }),
    ).toEqual({
      acceptsMarketing: true,
      marketingConsentAt: now,
      marketingConsentSource: "NEWSLETTER_FORM",
      marketingUnsubscribedAt: null,
      marketingSuppressedAt: null,
      marketingSuppressionReason: null,
    });
  });

  it("leaves suppression fields untouched without clearSuppression", () => {
    const now = new Date("2026-10-16T12:00:00Z");
    const data = marketingOptInData("RESUBSCRIBE_LINK", {
      clearSuppression: false,
      now,
    });
    expect(data).toEqual({
      acceptsMarketing: true,
      marketingConsentAt: now,
      marketingConsentSource: "RESUBSCRIBE_LINK",
      marketingUnsubscribedAt: null,
    });
    expect(data).not.toHaveProperty("marketingSuppressedAt");
    expect(data).not.toHaveProperty("marketingSuppressionReason");
  });

  it("defaults the timestamp to now", () => {
    const before = Date.now();
    const data = marketingOptInData("ACCOUNT", { clearSuppression: true });
    expect(data.marketingConsentAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe("marketingConsentSourceLabel", () => {
  it("labels known sources", () => {
    expect(marketingConsentSourceLabel("NEWSLETTER_FORM")).toBe(
      "Newsletter sign-up form",
    );
  });

  it("is blank for missing and passes unknown values through", () => {
    expect(marketingConsentSourceLabel(null)).toBe("");
    expect(marketingConsentSourceLabel(undefined)).toBe("");
    expect(marketingConsentSourceLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});
