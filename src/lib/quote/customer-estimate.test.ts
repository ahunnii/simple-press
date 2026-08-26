import { describe, expect, it } from "vitest";

import { customerEstimateFrom } from "./customer-estimate";

/**
 * The one place that decides what a VISITOR is told the price is — shared by
 * `submit`, `previewEstimate` and the admin test panel. The arithmetic is
 * pinned here rather than left to each caller because the three used to
 * disagree: the test panel showed an owner a figure their own storefront would
 * never print.
 */

const shown = {
  showEstimateToCustomer: true,
  displayAsRange: false,
  rangePaddingPercent: 10,
};

describe("customerEstimateFrom", () => {
  it("returns the exact figure when the owner is not padding it", () => {
    expect(customerEstimateFrom(shown, 326460)).toEqual({
      exactCents: 326460,
    });
  });

  it("pads symmetrically into a range", () => {
    expect(
      customerEstimateFrom(
        { ...shown, displayAsRange: true, rangePaddingPercent: 20 },
        200000,
      ),
    ).toEqual({ lowCents: 160000, highCents: 240000 });
  });

  it("rounds each end to whole cents independently", () => {
    // 326460 × 0.9 = 293814 exactly; × 1.1 = 359106.00000000006 in floating
    // point. Both ends are rounded so neither can reach a Postgres Int column
    // (or an email) as a fraction of a cent.
    expect(
      customerEstimateFrom({ ...shown, displayAsRange: true }, 326460),
    ).toEqual({ lowCents: 293814, highCents: 359106 });
  });

  it("returns undefined when the owner keeps the estimate internal", () => {
    expect(
      customerEstimateFrom({ ...shown, showEstimateToCustomer: false }, 326460),
    ).toBeUndefined();
    expect(
      customerEstimateFrom(
        {
          showEstimateToCustomer: false,
          displayAsRange: true,
          rangePaddingPercent: 10,
        },
        326460,
      ),
    ).toBeUndefined();
  });

  it("returns undefined when there is no estimate to tell them about", () => {
    // `computeQuote` captured the lead but could not put a number on it. The
    // thank-you screen and the confirmation email omit pricing entirely rather
    // than printing "$0.00".
    expect(customerEstimateFrom(shown, null)).toBeUndefined();
    expect(
      customerEstimateFrom({ ...shown, displayAsRange: true }, null),
    ).toBeUndefined();
  });

  it("passes a genuine zero through — 0 is a price, null is not", () => {
    expect(customerEstimateFrom(shown, 0)).toEqual({ exactCents: 0 });
    expect(customerEstimateFrom({ ...shown, displayAsRange: true }, 0)).toEqual(
      { lowCents: 0, highCents: 0 },
    );
  });
});

describe("customerEstimateFrom — WHAT, not WHERE", () => {
  /**
   * This function answers "what figure does the visitor get?" and nothing
   * else. WHERE that figure is delivered — thank-you screen, confirmation
   * email, or both — is `showEstimateOnScreen` / `sendConfirmationEmail`, and
   * that is the CALLER's decision: the email renderer and the thank-you screen
   * each decide whether to print the block at all, then ask this for its
   * contents.
   *
   * Folding delivery in here would break the split in the worst direction:
   * every email-only calculator would silently email "no estimate", which is
   * the exact configuration whose whole purpose is to email one.
   */
  it("takes only the three keys it needs, whatever else the definition carries", () => {
    const withDeliverySettings = {
      ...shown,
      showEstimateOnScreen: false,
      sendConfirmationEmail: true,
    };

    expect(customerEstimateFrom(withDeliverySettings, 326460)).toEqual({
      exactCents: 326460,
    });
    // Same answer with delivery flipped the other way — this function cannot
    // see the difference, and must not.
    const flippedOnScreen = {
      ...withDeliverySettings,
      showEstimateOnScreen: true,
    };
    expect(customerEstimateFrom(flippedOnScreen, 326460)).toEqual({
      exactCents: 326460,
    });
  });

  it("still says nothing when the estimate is internal", () => {
    // `showEstimateToCustomer` is the only switch that silences it.
    const hiddenButDeliverable = {
      ...shown,
      showEstimateToCustomer: false,
      showEstimateOnScreen: true,
      sendConfirmationEmail: true,
    };
    expect(customerEstimateFrom(hiddenButDeliverable, 326460)).toBeUndefined();
  });
});
