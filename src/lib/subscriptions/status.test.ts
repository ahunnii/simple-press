import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import {
  deriveSubscriptionStatus,
  parseSubscriptionMetadata,
  periodFromStripe,
  subscriptionMetadataSchema,
} from "./status";

type SubLike = Pick<Stripe.Subscription, "status" | "pause_collection">;

function makeSub(
  status: Stripe.Subscription.Status,
  pauseCollection: Stripe.Subscription.PauseCollection | null = null,
): SubLike {
  return { status, pause_collection: pauseCollection } as SubLike;
}

describe("deriveSubscriptionStatus", () => {
  it.each([
    ["canceled", "cancelled"],
    ["incomplete_expired", "cancelled"],
    ["incomplete", "incomplete"],
    ["past_due", "past_due"],
    ["unpaid", "past_due"],
    ["paused", "paused"],
    ["trialing", "active"],
  ] as const)("maps Stripe status %s to %s", (stripeStatus, expected) => {
    expect(deriveSubscriptionStatus(makeSub(stripeStatus))).toBe(expected);
  });

  it("maps 'active' with pause_collection: null to 'active'", () => {
    expect(deriveSubscriptionStatus(makeSub("active", null))).toBe("active");
  });

  it("maps 'active' with an OPEN-ENDED pause_collection to 'paused'", () => {
    // No `resumes_at` — `pauseSubscription`'s shape. Nothing resumes on its
    // own, so this really is a pause.
    expect(
      deriveSubscriptionStatus(
        makeSub("active", { behavior: "void", resumes_at: null }),
      ),
    ).toBe("paused");
  });

  it("maps 'active' with a BOUNDED pause_collection (a skip) to 'active'", () => {
    // `skipNextDelivery`'s shape: exactly one invoice is voided and Stripe
    // resumes collection by itself at `resumes_at`. A skip is not a pause —
    // the subscription stays active and `pauseResumesAt`/`nextBillingAt`
    // carry the skipped window.
    expect(
      deriveSubscriptionStatus(
        makeSub("active", {
          behavior: "void",
          resumes_at: Math.floor(Date.now() / 1000) + 3600,
        }),
      ),
    ).toBe("active");
  });

  it("maps 'trialing' with a bounded pause_collection to 'active' and an open-ended one to 'paused'", () => {
    expect(
      deriveSubscriptionStatus(
        makeSub("trialing", {
          behavior: "void",
          resumes_at: Math.floor(Date.now() / 1000) + 3600,
        }),
      ),
    ).toBe("active");
    expect(
      deriveSubscriptionStatus(
        makeSub("trialing", { behavior: "void", resumes_at: null }),
      ),
    ).toBe("paused");
  });

  it("a past skip window (resumes_at already elapsed) still derives 'active'", () => {
    // Stripe clears `pause_collection` itself once `resumes_at` passes, but a
    // stale object read mid-flight must not flip the row to paused.
    expect(
      deriveSubscriptionStatus(
        makeSub("active", {
          behavior: "void",
          resumes_at: Math.floor(Date.now() / 1000) - 3600,
        }),
      ),
    ).toBe("active");
  });
});

describe("periodFromStripe", () => {
  function makeInvoiceSub(opts: {
    items?: Array<{ current_period_start: number; current_period_end: number }>;
    pauseResumesAt?: number | null;
    /** Cadence on `items.data[0].price.recurring`, as a real Stripe object carries. */
    recurring?: { interval: string; interval_count: number };
  }): Stripe.Subscription {
    const items = (opts.items ?? []).map((item) => ({
      ...item,
      ...(opts.recurring ? { price: { recurring: opts.recurring } } : {}),
    }));
    return {
      pause_collection:
        opts.pauseResumesAt !== undefined
          ? { behavior: "void", resumes_at: opts.pauseResumesAt }
          : null,
      items: { data: items },
    } as unknown as Stripe.Subscription;
  }

  it("reads current_period_start/end from items.data[0]", () => {
    const start = 1735689600; // 2025-01-01T00:00:00Z
    const end = 1738368000; // 2025-02-01T00:00:00Z
    const result = periodFromStripe(
      makeInvoiceSub({
        items: [{ current_period_start: start, current_period_end: end }],
      }),
    );
    expect(result.currentPeriodStart).toEqual(new Date(start * 1000));
    expect(result.currentPeriodEnd).toEqual(new Date(end * 1000));
  });

  it("nextBillingAt defaults to currentPeriodEnd when not paused", () => {
    const start = 1735689600;
    const end = 1738368000;
    const result = periodFromStripe(
      makeInvoiceSub({
        items: [{ current_period_start: start, current_period_end: end }],
      }),
    );
    expect(result.nextBillingAt).toEqual(new Date(end * 1000));
    expect(result.pauseResumesAt).toBeNull();
  });

  it("a skipped cycle moves nextBillingAt a whole cadence past the period end, not to resumes_at", () => {
    // A "skip next delivery" is `pause_collection` with `resumes_at` a few
    // hours past the boundary. Stripe still generates the invoice at the
    // boundary and voids it, so no money moves then — reporting `resumes_at`
    // as the next billing date would tell the customer (and the owner's admin
    // table) that the delivery they just skipped is still coming.
    const start = Date.UTC(2026, 7, 15, 12) / 1000; // 2026-08-15T12:00:00Z
    const end = Date.UTC(2026, 8, 15, 12) / 1000; // 2026-09-15T12:00:00Z
    const resumesAt = end + 12 * 60 * 60; // the skip buffer

    const result = periodFromStripe(
      makeInvoiceSub({
        items: [{ current_period_start: start, current_period_end: end }],
        pauseResumesAt: resumesAt,
        recurring: { interval: "month", interval_count: 1 },
      }),
    );

    expect(result.nextBillingAt?.toISOString()).toBe(
      "2026-10-15T12:00:00.000Z",
    );
    expect(result.pauseResumesAt).toEqual(new Date(resumesAt * 1000));
    expect(result.currentPeriodEnd).toEqual(new Date(end * 1000));
  });

  it("walks multiple cadences when the pause outlasts more than one cycle (week:2)", () => {
    const start = Date.UTC(2026, 7, 1) / 1000;
    const end = Date.UTC(2026, 7, 15) / 1000; // 2026-08-15
    // Resumes ~5 weeks out: two 14-day cycles are voided.
    const resumesAt = Date.UTC(2026, 8, 18) / 1000; // 2026-09-18

    const result = periodFromStripe(
      makeInvoiceSub({
        items: [{ current_period_start: start, current_period_end: end }],
        pauseResumesAt: resumesAt,
        recurring: { interval: "week", interval_count: 2 },
      }),
    );

    // 08-15 → 08-29 → 09-12 → 09-26 (first boundary strictly past 09-18)
    expect(result.nextBillingAt?.toISOString()).toBe(
      "2026-09-26T00:00:00.000Z",
    );
  });

  it("leaves nextBillingAt at currentPeriodEnd when the pause ends before it", () => {
    const start = Date.UTC(2026, 7, 15) / 1000;
    const end = Date.UTC(2026, 8, 15) / 1000;

    const result = periodFromStripe(
      makeInvoiceSub({
        items: [{ current_period_start: start, current_period_end: end }],
        pauseResumesAt: end - 3600,
        recurring: { interval: "month", interval_count: 1 },
      }),
    );

    expect(result.nextBillingAt).toEqual(new Date(end * 1000));
  });

  // Falls back to `resumes_at` only when the item carries no cadence — a
  // partial Stripe object; a real one always has `price.recurring`.
  it("nextBillingAt is resumes_at when pause_collection.resumes_at is later than currentPeriodEnd", () => {
    const start = 1735689600;
    const end = 1738368000;
    const resumesAt = end + 100_000;
    const result = periodFromStripe(
      makeInvoiceSub({
        items: [{ current_period_start: start, current_period_end: end }],
        pauseResumesAt: resumesAt,
      }),
    );
    expect(result.nextBillingAt).toEqual(new Date(resumesAt * 1000));
    expect(result.pauseResumesAt).toEqual(new Date(resumesAt * 1000));
  });

  it("nextBillingAt stays currentPeriodEnd when resumes_at is null", () => {
    const start = 1735689600;
    const end = 1738368000;
    const result = periodFromStripe(
      makeInvoiceSub({
        items: [{ current_period_start: start, current_period_end: end }],
        pauseResumesAt: null,
      }),
    );
    expect(result.nextBillingAt).toEqual(new Date(end * 1000));
    expect(result.pauseResumesAt).toBeNull();
  });

  it("nextBillingAt stays currentPeriodEnd when resumes_at is set but not later (pauseResumesAt still reflects it)", () => {
    const start = 1735689600;
    const end = 1738368000;
    const earlierResumesAt = end - 100_000;
    const result = periodFromStripe(
      makeInvoiceSub({
        items: [{ current_period_start: start, current_period_end: end }],
        pauseResumesAt: earlierResumesAt,
      }),
    );
    expect(result.nextBillingAt).toEqual(new Date(end * 1000));
    expect(result.pauseResumesAt).toEqual(new Date(earlierResumesAt * 1000));
  });

  it("returns all nulls when items.data is empty", () => {
    const result = periodFromStripe(makeInvoiceSub({ items: [] }));
    expect(result).toEqual({
      currentPeriodStart: null,
      currentPeriodEnd: null,
      nextBillingAt: null,
      pauseResumesAt: null,
    });
  });

  it("returns all nulls when items.data is empty, even if pause_collection.resumes_at is set", () => {
    const result = periodFromStripe(
      makeInvoiceSub({
        items: [],
        pauseResumesAt: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    expect(result).toEqual({
      currentPeriodStart: null,
      currentPeriodEnd: null,
      nextBillingAt: null,
      pauseResumesAt: null,
    });
  });
});

describe("subscriptionMetadataSchema", () => {
  const validMeta = {
    businessId: "biz_1",
    subscriptionId: "sub_row_1",
    productId: "prod_1",
    variantId: "",
    intervalKey: "week:1",
    quantity: "2",
    deliveryMethod: "ship",
  };

  it("parses a valid metadata object", () => {
    const result = subscriptionMetadataSchema.safeParse(validMeta);
    expect(result.success).toBe(true);
  });

  it("accepts metadata with NO variantId — Stripe never stores an empty-string value", () => {
    const withoutVariant = Object.fromEntries(
      Object.entries(validMeta).filter(([key]) => key !== "variantId"),
    );
    const result = subscriptionMetadataSchema.safeParse(withoutVariant);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.variantId).toBe("");
  });

  it("allows an empty string variantId", () => {
    expect(
      subscriptionMetadataSchema.safeParse({ ...validMeta, variantId: "" })
        .success,
    ).toBe(true);
  });

  it("rejects an empty businessId", () => {
    expect(
      subscriptionMetadataSchema.safeParse({ ...validMeta, businessId: "" })
        .success,
    ).toBe(false);
  });

  it("rejects an empty subscriptionId", () => {
    expect(
      subscriptionMetadataSchema.safeParse({
        ...validMeta,
        subscriptionId: "",
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown intervalKey", () => {
    expect(
      subscriptionMetadataSchema.safeParse({
        ...validMeta,
        intervalKey: "day:1",
      }).success,
    ).toBe(false);
  });

  it("rejects a quantity that is not a positive integer string", () => {
    expect(
      subscriptionMetadataSchema.safeParse({ ...validMeta, quantity: "0" })
        .success,
    ).toBe(false);
    expect(
      subscriptionMetadataSchema.safeParse({ ...validMeta, quantity: "-1" })
        .success,
    ).toBe(false);
    expect(
      subscriptionMetadataSchema.safeParse({ ...validMeta, quantity: "1.5" })
        .success,
    ).toBe(false);
    expect(
      subscriptionMetadataSchema.safeParse({
        ...validMeta,
        quantity: "abc",
      }).success,
    ).toBe(false);
  });

  it("rejects a deliveryMethod outside 'ship' | 'pickup'", () => {
    expect(
      subscriptionMetadataSchema.safeParse({
        ...validMeta,
        deliveryMethod: "courier",
      }).success,
    ).toBe(false);
  });

  it("accepts deliveryMethod 'pickup'", () => {
    expect(
      subscriptionMetadataSchema.safeParse({
        ...validMeta,
        deliveryMethod: "pickup",
      }).success,
    ).toBe(true);
  });
});

describe("parseSubscriptionMetadata", () => {
  const validMeta: Stripe.Metadata = {
    businessId: "biz_1",
    subscriptionId: "sub_row_1",
    productId: "prod_1",
    variantId: "",
    intervalKey: "week:1",
    quantity: "2",
    deliveryMethod: "ship",
  };

  it("returns the parsed object for valid metadata", () => {
    expect(parseSubscriptionMetadata(validMeta)).toEqual(validMeta);
  });

  it("returns null (does not throw) for null metadata", () => {
    expect(() => parseSubscriptionMetadata(null)).not.toThrow();
    expect(parseSubscriptionMetadata(null)).toBeNull();
  });

  it("returns null for undefined metadata", () => {
    expect(parseSubscriptionMetadata(undefined)).toBeNull();
  });

  it("returns null for metadata missing required fields", () => {
    expect(parseSubscriptionMetadata({ businessId: "biz_1" })).toBeNull();
  });

  it("returns null for metadata with an invalid intervalKey", () => {
    expect(
      parseSubscriptionMetadata({ ...validMeta, intervalKey: "day:1" }),
    ).toBeNull();
  });
});
