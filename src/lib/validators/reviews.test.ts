import { describe, expect, it } from "vitest";

import { getReviewStatus } from "./reviews";

/**
 * `getReviewStatus` returns the display status of a review for the
 * admin Reviews list. Priority is **hidden ▸ published ▸ pending**,
 * checked in that order — hidden wins even when `isApproved` is true, per
 * the ordering documented on the `Review` model in schema.prisma.
 */
describe("getReviewStatus", () => {
  it("returns 'hidden' when isApproved=true and isHidden=true (hidden outranks approved)", () => {
    const review = { isApproved: true, isHidden: true };
    expect(getReviewStatus(review)).toBe("hidden");
  });

  it("returns 'hidden' when isApproved=false and isHidden=true", () => {
    const review = { isApproved: false, isHidden: true };
    expect(getReviewStatus(review)).toBe("hidden");
  });

  it("returns 'published' when isApproved=true and isHidden=false", () => {
    const review = { isApproved: true, isHidden: false };
    expect(getReviewStatus(review)).toBe("published");
  });

  it("returns 'pending' when isApproved=false and isHidden=false", () => {
    const review = { isApproved: false, isHidden: false };
    expect(getReviewStatus(review)).toBe("pending");
  });
});
