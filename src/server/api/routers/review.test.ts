import { describe, expect, it, vi } from "vitest";

import { PUBLIC_REVIEW_SELECT } from "./review";

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
