import { describe, expect, it } from "vitest";

import {
  hasMarketingConsentHistory,
  isMarketingUnsubscribeCurrent,
  marketingConsentSourceLabel,
  marketingOptInData,
} from "./consent";

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

describe("isMarketingUnsubscribeCurrent", () => {
  const earlier = new Date("2026-10-01T00:00:00Z");
  const later = new Date("2026-10-10T00:00:00Z");

  it("is false with no unsubscribe on record", () => {
    expect(
      isMarketingUnsubscribeCurrent({
        marketingUnsubscribedAt: null,
        marketingConsentAt: earlier,
      }),
    ).toBe(false);
  });

  it("is true for an unsubscribe with no consent, or after the last consent", () => {
    expect(
      isMarketingUnsubscribeCurrent({
        marketingUnsubscribedAt: later,
        marketingConsentAt: null,
      }),
    ).toBe(true);
    expect(
      isMarketingUnsubscribeCurrent({
        marketingUnsubscribedAt: later,
        marketingConsentAt: earlier,
      }),
    ).toBe(true);
  });

  it("is false once consent was given after the unsubscribe", () => {
    expect(
      isMarketingUnsubscribeCurrent({
        marketingUnsubscribedAt: earlier,
        marketingConsentAt: later,
      }),
    ).toBe(false);
  });
});

describe("hasMarketingConsentHistory", () => {
  const none = {
    acceptsMarketing: false,
    marketingConsentAt: null,
    marketingConsentSource: null,
  };

  it("is false for someone who never opted in", () => {
    expect(hasMarketingConsentHistory(none)).toBe(false);
  });

  it("is true for a current, dated, or legacy (undated) opt-in", () => {
    expect(
      hasMarketingConsentHistory({ ...none, acceptsMarketing: true }),
    ).toBe(true);
    expect(
      hasMarketingConsentHistory({ ...none, marketingConsentAt: new Date() }),
    ).toBe(true);
    expect(
      hasMarketingConsentHistory({
        ...none,
        marketingConsentSource: "LEGACY_ACCOUNT",
      }),
    ).toBe(true);
  });
});
