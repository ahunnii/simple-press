import { describe, expect, it, vi } from "vitest";

import { PUBLIC_REVIEW_SELECT, toPublicReview } from "./review";

// Importing the router pulls in `../trpc` → the real better-auth singleton,
// whose construction eagerly fires `trustedOrigins()` (a live
// `db.business.findMany()`) — an unhandled rejection against Postgres in the
// DB-less unit project. Same stub as content.test.ts.
vi.mock("~/server/better-auth", () => ({ auth: {} }));

/**
 * `review.listByProduct` is a `publicProcedure` — every storefront visitor's
 * browser receives whatever `PUBLIC_REVIEW_SELECT` selects (Network tab / RSC
 * payload, via `src/components/product-reviews.tsx` and
 * `src/app/(storefront)/shop/[slug]/page.tsx`). `customerEmail`, `customerId`,
 * and `orderId` are admin-only PII/order-linkage columns on `ProductReview`
 * and must never appear in it.
 *
 * This is a pure shape assertion against the exported select object — no DB
 * or tRPC context needed, so it runs in the `unit` vitest project (no
 * Docker/Postgres required). It pins the fix for a leak where the procedure
 * previously did a bare `findMany` + `include`, shipping the full row
 * (including customerEmail/customerId/orderId) over the wire even though
 * nothing rendered them.
 */
describe("PUBLIC_REVIEW_SELECT", () => {
  const select = PUBLIC_REVIEW_SELECT as Record<string, unknown>;

  it("never selects customerEmail, customerId, or orderId", () => {
    expect(select.customerEmail).toBeUndefined();
    expect(select.customerId).toBeUndefined();
    expect(select.orderId).toBeUndefined();
  });

  it("selects the owner reply text/date but never who replied", () => {
    expect(select.ownerReply).toBe(true);
    expect(select.ownerReplyAt).toBe(true);
    expect(select.ownerReplyById).toBeUndefined();
    expect(select.ownerReplyBy).toBeUndefined();
  });

  it("never selects other columns ReviewCard/ReviewForSchema don't need", () => {
    // source/isApproved/isHidden/productId aren't sensitive, but they also
    // aren't rendered anywhere public — keeping the select list intentional
    // (not "everything except the PII fields") makes future additions to
    // ProductReview opt-in to public exposure instead of opt-out.
    expect(select.source).toBeUndefined();
    expect(select.isApproved).toBeUndefined();
    expect(select.isHidden).toBeUndefined();
    expect(select.productId).toBeUndefined();
    expect(select.updatedAt).toBeUndefined();
  });

  it("still selects every field the storefront needs to render a review", () => {
    // Matches src/components/product-reviews.tsx's ReviewCard plus
    // src/lib/structured-data.ts's ReviewForSchema (reviewDate).
    const required = [
      "id",
      "rating",
      "title",
      "comment",
      "images",
      "videoUrl",
      "verifiedPurchase",
      "customerName",
      "reviewDate",
      "createdAt",
      "helpfulCount",
      "notHelpfulCount",
    ];
    for (const key of required) {
      expect(select[key], `PUBLIC_REVIEW_SELECT is missing "${key}"`).toBe(
        true,
      );
    }
  });
});

describe("toPublicReview", () => {
  const base = {
    id: "r1",
    rating: 5,
    title: "Great",
    comment: "Loved it",
    images: [],
    videoUrl: null,
    verifiedPurchase: true,
    customerName: "Sam",
    reviewDate: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-02T00:00:00Z"),
    helpfulCount: 0,
    notHelpfulCount: 0,
  };

  it("folds the reply columns into a reply object attributed to the business", () => {
    const repliedAt = new Date("2026-02-01T00:00:00Z");
    const out = toPublicReview(
      { ...base, ownerReply: "Thank you!", ownerReplyAt: repliedAt },
      "Acme Co",
    );
    expect(out.reply).toEqual({
      text: "Thank you!",
      repliedAt,
      from: "Acme Co",
    });
    expect(out).not.toHaveProperty("ownerReply");
    expect(out).not.toHaveProperty("ownerReplyAt");
    expect(out.id).toBe("r1");
  });

  it("falls back to the review date when ownerReplyAt is missing", () => {
    const out = toPublicReview(
      { ...base, ownerReply: "Thanks", ownerReplyAt: null },
      "Acme Co",
    );
    expect(out.reply?.repliedAt).toEqual(base.reviewDate);
  });

  it("returns reply: null when there is no reply", () => {
    const out = toPublicReview(
      { ...base, ownerReply: null, ownerReplyAt: null },
      "Acme Co",
    );
    expect(out.reply).toBeNull();
    expect(out).not.toHaveProperty("ownerReply");
    expect(out).not.toHaveProperty("ownerReplyAt");
  });
});
