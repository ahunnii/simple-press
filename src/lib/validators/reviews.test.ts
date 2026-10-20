import { describe, expect, it } from "vitest";

import {
  getReviewStatus,
  REVIEW_REPLY_MAX_LENGTH,
  reviewDeleteReplySchema,
  reviewSetReplySchema,
} from "./reviews";

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

describe("reviewSetReplySchema", () => {
  it("trims the reply", () => {
    const out = reviewSetReplySchema.parse({ id: "r1", reply: "  Thanks!  " });
    expect(out.reply).toBe("Thanks!");
  });

  it("rejects empty and whitespace-only replies", () => {
    expect(
      reviewSetReplySchema.safeParse({ id: "r1", reply: "" }).success,
    ).toBe(false);
    expect(
      reviewSetReplySchema.safeParse({ id: "r1", reply: "   \n " }).success,
    ).toBe(false);
  });

  it("accepts exactly the max length and rejects one over", () => {
    const ok = "a".repeat(REVIEW_REPLY_MAX_LENGTH);
    expect(
      reviewSetReplySchema.safeParse({ id: "r1", reply: ok }).success,
    ).toBe(true);
    expect(
      reviewSetReplySchema.safeParse({ id: "r1", reply: ok + "a" }).success,
    ).toBe(false);
  });
});

describe("reviewDeleteReplySchema", () => {
  it("requires an id", () => {
    expect(reviewDeleteReplySchema.safeParse({ id: "r1" }).success).toBe(true);
    expect(reviewDeleteReplySchema.safeParse({}).success).toBe(false);
  });
});
